"""Service Listes de tâches partagées — visibilité, cycle de vie, membres.

Règles d'accès :
- Une liste n'est visible que par son propriétaire et ses membres invités.
  Toute liste invisible est traitée comme inexistante (NotFoundException),
  afin de ne pas révéler son existence à un tiers.
- Seul le propriétaire peut renommer, supprimer la liste et gérer les membres.
- Un membre peut quitter la liste de lui-même.
"""

import logging
from typing import List

from app.domain.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.tasklist.interface.task_list_repository import ITaskListRepository
from app.domain.tasklist.models.constants import (
    MAX_LIST_DESCRIPTION_LENGTH,
    MAX_LIST_NAME_LENGTH,
    MAX_MEMBERS_PER_LIST,
    VALID_LIST_COLORS,
)
from app.domain.tasklist.models.task_list_bean import TaskListBean

logger = logging.getLogger(__name__)


def _can_access(bean: TaskListBean, requester_uuid: str) -> bool:
    """Le demandeur est-il propriétaire ou membre de la liste ?"""
    return requester_uuid == bean.owner_uuid or requester_uuid in bean.member_uuids


def get_visible_task_list(
    repository: ITaskListRepository, requester_uuid: str, list_uuid: str
) -> TaskListBean:
    """Récupère une liste si elle est visible par le demandeur, sinon 404."""
    bean = repository.get_by_uuid(str(list_uuid))
    if bean is None or not _can_access(bean, requester_uuid):
        raise NotFoundException("TaskList", str(list_uuid))
    return bean


def _require_owner(bean: TaskListBean, requester_uuid: str, action: str) -> None:
    """Restreint une action au propriétaire de la liste."""
    if requester_uuid != bean.owner_uuid:
        raise ForbiddenException(f"seul le propriétaire de la liste peut {action}")


def _validate_list_payload(bean: TaskListBean) -> None:
    """Valide les champs éditables d'une liste."""
    if not bean.name or not bean.name.strip():
        raise ValidationException("name", "Le nom de la liste est requis")
    if len(bean.name.strip()) > MAX_LIST_NAME_LENGTH:
        raise ValidationException(
            "name", f"Le nom dépasse {MAX_LIST_NAME_LENGTH} caractères"
        )
    if len(bean.description or "") > MAX_LIST_DESCRIPTION_LENGTH:
        raise ValidationException(
            "description",
            f"La description dépasse {MAX_LIST_DESCRIPTION_LENGTH} caractères",
        )
    if bean.color not in VALID_LIST_COLORS:
        raise ValidationException("color", f"Couleur inconnue: {bean.color}")


def _resolve_member_uuids(
    repository: ITaskListRepository,
    owner_uuid: str,
    member_uuids: List[str],
) -> List[str]:
    """Nettoie une liste d'invitations : dédoublonne, exclut le propriétaire,
    vérifie l'existence des profils."""
    deduped: List[str] = []
    for member_uuid in member_uuids:
        member_uuid = str(member_uuid)
        if member_uuid == owner_uuid:
            raise ValidationException(
                "member_uuids", "Le propriétaire est déjà membre de sa liste"
            )
        if member_uuid not in deduped:
            deduped.append(member_uuid)
    if deduped:
        existing = set(repository.existing_user_uuids(deduped))
        missing = [u for u in deduped if u not in existing]
        if missing:
            raise ValidationException(
                "member_uuids", f"Utilisateurs introuvables: {sorted(missing)}"
            )
    return deduped


def get_task_lists(
    repository: ITaskListRepository, requester_uuid: str
) -> List[TaskListBean]:
    """Listes visibles par le demandeur (propriétaire ou membre)."""
    return repository.get_all_for_user(requester_uuid)


def get_task_list_detail(
    repository: ITaskListRepository, requester_uuid: str, list_uuid: str
) -> TaskListBean:
    """Détail d'une liste (tâches incluses), si visible par le demandeur."""
    bean = repository.get_detail_by_uuid(str(list_uuid))
    if bean is None or not _can_access(bean, requester_uuid):
        raise NotFoundException("TaskList", str(list_uuid))
    return bean


def create_task_list(
    repository: ITaskListRepository,
    requester_uuid: str,
    bean: TaskListBean,
    member_uuids: List[str],
) -> TaskListBean:
    """Crée une liste dont le demandeur devient propriétaire."""
    bean.owner_uuid = requester_uuid
    bean.name = (bean.name or "").strip()
    _validate_list_payload(bean)
    members = _resolve_member_uuids(repository, requester_uuid, member_uuids)
    if len(members) > MAX_MEMBERS_PER_LIST:
        raise ValidationException(
            "member_uuids", f"Une liste est limitée à {MAX_MEMBERS_PER_LIST} membres"
        )
    bean.member_uuids = members
    result = repository.create(bean)
    logger.info(
        "Liste partagée créée: %s (%s) par %s",
        result.uuid,
        result.name,
        requester_uuid,
    )
    return result


def update_task_list(
    repository: ITaskListRepository,
    requester_uuid: str,
    list_uuid: str,
    changes: dict,
) -> TaskListBean:
    """Met à jour nom/description/couleur (propriétaire uniquement)."""
    bean = get_visible_task_list(repository, requester_uuid, list_uuid)
    _require_owner(bean, requester_uuid, "la modifier")
    if "name" in changes:
        bean.name = str(changes["name"] or "").strip()
    if "description" in changes:
        bean.description = str(changes["description"] or "")
    if "color" in changes:
        bean.color = str(changes["color"] or "")
    _validate_list_payload(bean)
    return repository.update(bean)


def delete_task_list(
    repository: ITaskListRepository, requester_uuid: str, list_uuid: str
) -> None:
    """Supprime une liste (propriétaire uniquement)."""
    bean = get_visible_task_list(repository, requester_uuid, list_uuid)
    _require_owner(bean, requester_uuid, "la supprimer")
    repository.delete(str(list_uuid))
    logger.info("Liste partagée supprimée: %s par %s", list_uuid, requester_uuid)


def add_task_list_members(
    repository: ITaskListRepository,
    requester_uuid: str,
    list_uuid: str,
    member_uuids: List[str],
) -> TaskListBean:
    """Invite des membres (propriétaire uniquement). Renvoie la liste à jour."""
    bean = get_visible_task_list(repository, requester_uuid, list_uuid)
    _require_owner(bean, requester_uuid, "inviter des membres")
    members = _resolve_member_uuids(repository, bean.owner_uuid, member_uuids)
    if not members:
        raise ValidationException("member_uuids", "Aucun membre à inviter")
    already = [u for u in members if u in bean.member_uuids]
    if already:
        raise ConflictException("member", already[0])
    if len(bean.member_uuids) + len(members) > MAX_MEMBERS_PER_LIST:
        raise ValidationException(
            "member_uuids", f"Une liste est limitée à {MAX_MEMBERS_PER_LIST} membres"
        )
    repository.add_members(str(list_uuid), members)
    logger.info(
        "Membres ajoutés à la liste %s par %s: %s", list_uuid, requester_uuid, members
    )
    return get_visible_task_list(repository, requester_uuid, list_uuid)


def remove_task_list_member(
    repository: ITaskListRepository,
    requester_uuid: str,
    list_uuid: str,
    member_uuid: str,
) -> TaskListBean:
    """Retire un membre. Autorisé au propriétaire, ou au membre lui-même
    (quitter la liste). Renvoie la liste à jour."""
    bean = get_visible_task_list(repository, requester_uuid, list_uuid)
    member_uuid = str(member_uuid)
    if member_uuid == bean.owner_uuid:
        raise ValidationException(
            "member_uuid", "Le propriétaire ne peut pas être retiré de sa liste"
        )
    if requester_uuid != bean.owner_uuid and requester_uuid != member_uuid:
        raise ForbiddenException(
            "seul le propriétaire peut retirer un autre membre de la liste"
        )
    if not repository.remove_member(str(list_uuid), member_uuid):
        raise NotFoundException("TaskListMember", member_uuid)
    logger.info(
        "Membre %s retiré de la liste %s par %s", member_uuid, list_uuid, requester_uuid
    )
    return repository.get_by_uuid(str(list_uuid))
