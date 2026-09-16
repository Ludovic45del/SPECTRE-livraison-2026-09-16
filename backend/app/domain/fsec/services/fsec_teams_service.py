"""Service FsecTeams - Logique métier pure."""

import logging
from typing import List

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.fsec.interface.fsec_repository import (
    IFsecRepository,
    IFsecTeamsRepository,
)
from app.domain.fsec.models.fsec_team_constants import is_free_text_role
from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean

logger = logging.getLogger(__name__)


def _validate_member_invariant(bean: FsecTeamsBean) -> None:
    """Verifie l'invariant MOE/TCI / autres roles.

    Pendant la phase de coexistence (release N) :
    - MOE/TCI : exige `name` ; rejette `user_uuid` (rôles externes au labo).
    - Autres roles : exige `name` OU `user_uuid` (transition compatible).

    L'invariant strict (autres roles -> user_uuid obligatoire et name interdit)
    sera reimpose en release de cleanup.

    Raises:
        ValidationException: si aucun des deux n'est fourni, ou si MOE/TCI+user_uuid.
    """
    is_free = is_free_text_role(bean.role_id)
    has_name = bool(bean.name and bean.name.strip())
    has_user = bool(bean.user_uuid)

    if is_free:
        if not has_name:
            raise ValidationException(
                "name",
                f"Le rôle {bean.role_id} (MOE/TCI) exige un nom en texte libre",
            )
        if has_user:
            raise ValidationException(
                "user_uuid",
                f"Le rôle {bean.role_id} (MOE/TCI) n'accepte pas de FK utilisateur",
            )
    else:
        if not has_name and not has_user:
            raise ValidationException(
                "name/user_uuid",
                f"Le rôle {bean.role_id} exige soit un nom soit une FK utilisateur",
            )


def _member_dedup_key(member: FsecTeamsBean) -> tuple:
    """Cle de deduplication. MOE/TCI -> name. Autres : prefere user_uuid sinon name."""
    if is_free_text_role(member.role_id):
        return (member.role_id, "name", member.name)
    if member.user_uuid:
        return (member.role_id, "user_uuid", member.user_uuid)
    return (member.role_id, "name", member.name)


def create_fsec_team_member(
    repository: IFsecTeamsRepository,
    bean: FsecTeamsBean,
    fsec_repository: IFsecRepository = None,
) -> FsecTeamsBean:
    """Crée un nouveau membre d'équipe.

    Args:
        repository: Le repository FsecTeams
        bean: Le bean à créer
        fsec_repository: Repository FSEC (optionnel, pour vérifier l'existence du parent)

    Raises:
        NotFoundException: Si le FSEC parent n'existe pas
        ConflictException: Si un membre identique existe déjà
        ValidationException: Si l'invariant MOE/TCI vs autres rôles est rompu
    """
    _validate_member_invariant(bean)

    # Vérifier l'existence du FSEC parent
    if fsec_repository is not None and bean.fsec_id:
        if fsec_repository.get_by_version_uuid(bean.fsec_id) is None:
            raise NotFoundException("FSEC", bean.fsec_id)

    # Vérifier les doublons (cle calculee : nom pour MOE/TCI, user pour autres)
    existing_members = repository.get_by_fsec_id(bean.fsec_id)
    bean_key = _member_dedup_key(bean)
    for member in existing_members:
        if _member_dedup_key(member) == bean_key:
            label = bean.user_uuid if bean_key[1] == "user_uuid" else bean.name
            raise ConflictException(
                "name/role_id",
                f"{label}/{bean.role_id}",
            )

    logger.info(f"Creating fsec team member for fsec_id={bean.fsec_id}")
    result = repository.create(bean)
    logger.info(f"Created fsec team member with uuid={result.uuid}")
    return result


def get_fsec_team_member_by_uuid(
    repository: IFsecTeamsRepository, uuid: str
) -> FsecTeamsBean:
    """Récupère un membre d'équipe par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FsecTeamMember", uuid)
    return bean


def get_fsec_team_members(
    repository: IFsecTeamsRepository, fsec_id: str
) -> List[FsecTeamsBean]:
    """Récupère tous les membres d'une équipe FSEC."""
    return repository.get_by_fsec_id(fsec_id)


def update_fsec_team_member(
    repository: IFsecTeamsRepository, bean: FsecTeamsBean
) -> FsecTeamsBean:
    """Met à jour un membre d'équipe."""
    logger.info(f"Updating fsec team member uuid={bean.uuid}")
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        logger.warning(f"FsecTeamMember not found: uuid={bean.uuid}")
        raise NotFoundException("FsecTeamMember", bean.uuid)

    _validate_member_invariant(bean)

    new_key = _member_dedup_key(bean)
    old_key = _member_dedup_key(existing)
    if new_key != old_key:
        existing_members = repository.get_by_fsec_id(bean.fsec_id)
        for member in existing_members:
            if member.uuid != bean.uuid and _member_dedup_key(member) == new_key:
                label = bean.user_uuid if new_key[1] == "user_uuid" else bean.name
                raise ConflictException("name/role_id", f"{label}/{bean.role_id}")

    result = repository.update(bean)
    logger.info(f"Updated fsec team member uuid={bean.uuid}")
    return result


def delete_fsec_team_member(repository: IFsecTeamsRepository, uuid: str) -> bool:
    """Supprime un membre d'équipe."""
    logger.info(f"Deleting fsec team member uuid={uuid}")
    if not repository.delete(uuid):
        logger.warning(f"FsecTeamMember not found for deletion: uuid={uuid}")
        raise NotFoundException("FsecTeamMember", uuid)
    logger.info(f"Deleted fsec team member uuid={uuid}")
    return True
