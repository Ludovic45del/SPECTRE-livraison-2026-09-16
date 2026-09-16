"""Service Conversations — messagerie interne : visibilité, cycle de vie, membres.

Règles d'accès :
- Une conversation n'est visible que par ses membres (le propriétaire est
  lui-même une ligne membre). Toute conversation invisible est traitée comme
  inexistante (NotFoundException), afin de ne pas révéler son existence.
- Une conversation privée (`direct`) est immuable : ni renommage, ni
  suppression, ni gestion des membres.
- Sur un groupe, tout membre peut inviter ; seul le propriétaire peut
  renommer, supprimer et retirer un tiers ; chaque membre peut partir.

Atomicité : ce service ne gère aucune transaction (aucun import ORM autorisé
dans le domaine). Les séquences multi-écritures (message système + mise à
jour + retrait + suppression) reposent sur `ATOMIC_REQUESTS = True`
(une requête HTTP = une transaction). Tout appelant hors cycle HTTP
(commande de management, script) doit envelopper l'appel dans
`transaction.atomic()`.
"""

import logging
import uuid as uuid_lib
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from app.domain.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.messaging.interface.conversation_repository import (
    IConversationRepository,
)
from app.domain.messaging.interface.message_repository import IMessageRepository
from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    KIND_GROUP,
    MAX_CONVERSATION_NAME_LENGTH,
    MAX_MEMBERS_PER_CONVERSATION,
    VALID_KINDS,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.domain.messaging.services import message_service

logger = logging.getLogger(__name__)


def _canonical_uuid(value, field: str) -> str:
    """Forme canonique d'un UUID (minuscules, tirets). ValidationException si invalide."""
    try:
        return str(uuid_lib.UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValidationException(field, f"UUID invalide: {value}") from exc


def _display_name(user: UserSummaryBean) -> str:
    """Nom affichable d'un utilisateur, avec repli sur son identifiant de connexion."""
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def _member_display_name(bean: ConversationBean, member_uuid: str) -> str:
    """Nom affichable d'un membre de la conversation (repli : son uuid)."""
    for member in bean.members:
        if member.user.uuid == member_uuid:
            return _display_name(member.user)
    return member_uuid


def _choose_new_owner(
    members: List[ConversationMemberBean], leaving_uuid: str
) -> Optional[ConversationMemberBean]:
    """Successeur du propriétaire qui part : le plus ancien membre actif restant.

    `members` est déjà trié par (joined_at, user.uuid). À défaut de membre actif,
    le plus ancien membre restant ; None s'il ne reste personne.
    """
    remaining = [member for member in members if member.user.uuid != leaving_uuid]
    if not remaining:
        return None
    for member in remaining:
        if member.user.is_active:
            return member
    return remaining[0]


def get_visible_conversation(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
) -> ConversationBean:
    """Récupère une conversation si le demandeur en est membre, sinon 404."""
    bean = conv_repository.get_by_uuid(
        str(conversation_uuid), for_user_uuid=requester_uuid
    )
    if bean is None or requester_uuid not in bean.member_uuids:
        raise NotFoundException("Conversation", str(conversation_uuid))
    return bean


def _require_owner(bean: ConversationBean, requester_uuid: str, action: str) -> None:
    """Restreint une action au propriétaire du groupe."""
    if requester_uuid != bean.owner_uuid:
        raise ForbiddenException(f"seul le propriétaire du groupe peut {action}")


def _require_group(bean: ConversationBean, action: str) -> None:
    """Interdit une action de groupe sur une conversation privée."""
    if bean.kind != KIND_GROUP:
        raise ValidationException(
            "kind", f"une conversation privée ne permet pas de {action}"
        )


def _validate_group_name(name: str) -> str:
    """Valide et normalise le nom d'un groupe."""
    cleaned = (name or "").strip()
    if not cleaned:
        raise ValidationException("name", "Le nom du groupe est requis")
    if len(cleaned) > MAX_CONVERSATION_NAME_LENGTH:
        raise ValidationException(
            "name", f"Le nom dépasse {MAX_CONVERSATION_NAME_LENGTH} caractères"
        )
    return cleaned


def _resolve_member_uuids(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    member_uuids: List[str],
) -> List[str]:
    """Nettoie une liste d'uuid reçue : canonicalisation, dédoublonnage (ordre
    conservé), retrait du demandeur, puis contrôle d'existence et d'activité."""
    cleaned: List[str] = []
    for raw_uuid in member_uuids or []:
        candidate = _canonical_uuid(raw_uuid, "member_uuids")
        if candidate == requester_uuid:
            continue
        if candidate not in cleaned:
            cleaned.append(candidate)
    if cleaned:
        active = set(conv_repository.active_user_uuids(cleaned))
        missing = [member_uuid for member_uuid in cleaned if member_uuid not in active]
        if missing:
            raise ValidationException(
                "member_uuids",
                f"Utilisateurs introuvables ou désactivés: {sorted(missing)}",
            )
    return cleaned


def get_conversations(
    conv_repository: IConversationRepository, requester_uuid: str
) -> List[ConversationBean]:
    """Conversations dont le demandeur est membre, triées pour la liste."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    return conv_repository.get_all_for_user(requester)


def get_conversation(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
) -> ConversationBean:
    """Détail d'une conversation visible par le demandeur."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    return get_visible_conversation(conv_repository, requester, conversation_uuid)


def create_conversation(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    bean: ConversationBean,
    member_uuids: List[str],
) -> Tuple[ConversationBean, bool]:
    """Crée une conversation dont le demandeur devient propriétaire et membre.

    Renvoie `(conversation, créée)` : pour une conversation privée déjà
    existante entre les deux mêmes personnes, la conversation existante est
    renvoyée avec `False` (création idempotente, y compris sous concurrence).
    `msg_repository` n'est pas utilisé aujourd'hui : il complète la signature
    commune des opérations pouvant émettre un message système.
    """
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    if bean.kind not in VALID_KINDS:
        raise ValidationException("kind", f"Type de conversation inconnu: {bean.kind}")
    others = _resolve_member_uuids(conv_repository, requester, member_uuids)
    bean.owner_uuid = requester

    if bean.kind == KIND_DIRECT:
        if len(others) != 1:
            raise ValidationException(
                "member_uuids",
                "Une conversation privée requiert exactement un autre membre",
            )
        bean.name = ""
        bean.direct_key = ":".join(sorted([requester, others[0]]))
        existing = conv_repository.find_direct(bean.direct_key, for_user_uuid=requester)
        if existing is not None:
            return existing, False
    else:
        bean.name = _validate_group_name(bean.name)
        bean.direct_key = None
        if len(others) + 1 > MAX_MEMBERS_PER_CONVERSATION:
            raise ValidationException(
                "member_uuids",
                f"Une conversation est limitée à {MAX_MEMBERS_PER_CONVERSATION} membres",
            )

    try:
        created = conv_repository.create(bean, [requester] + others)
    except ConflictException:
        # Course entre deux créations de la même conversation privée.
        if bean.kind == KIND_DIRECT:
            existing = conv_repository.find_direct(
                bean.direct_key, for_user_uuid=requester
            )
            if existing is not None:
                return existing, False
        raise
    logger.info(
        "Conversation créée: %s (%s) par %s avec %s membre(s) invité(s)",
        created.uuid,
        created.kind,
        requester,
        len(others),
    )
    return created, True


def rename_conversation(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    name: str,
) -> ConversationBean:
    """Renomme un groupe (propriétaire uniquement) et journalise un message système."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    bean = get_visible_conversation(conv_repository, requester, conversation_uuid)
    _require_group(bean, "la renommer")
    _require_owner(bean, requester, "la renommer")
    new_name = _validate_group_name(name)
    if new_name == bean.name:
        return bean

    actor_name = _member_display_name(bean, requester)
    bean.name = new_name
    # Message système d'abord : `update` relit ensuite la conversation une seule
    # fois, avec ce message en dernier message et les non-lus du demandeur.
    message_service.post_system_message(
        msg_repository,
        str(conversation_uuid),
        requester,
        f"{actor_name} a renommé le groupe en « {new_name} »",
    )
    logger.info(
        "Conversation %s renommée en «%s» par %s",
        conversation_uuid,
        new_name,
        requester,
    )
    return conv_repository.update(bean, for_user_uuid=requester)


def delete_conversation(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
) -> None:
    """Supprime un groupe (propriétaire uniquement)."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    bean = get_visible_conversation(conv_repository, requester, conversation_uuid)
    _require_group(bean, "la supprimer")
    _require_owner(bean, requester, "la supprimer")
    conv_repository.delete(str(conversation_uuid))
    logger.info("Conversation supprimée: %s par %s", conversation_uuid, requester)


def add_members(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    member_uuids: List[str],
) -> ConversationBean:
    """Ajoute des membres à un groupe (tout membre peut inviter)."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    bean = get_visible_conversation(conv_repository, requester, conversation_uuid)
    _require_group(bean, "y ajouter des membres")
    newcomers = _resolve_member_uuids(conv_repository, requester, member_uuids)
    if not newcomers:
        raise ValidationException("member_uuids", "Aucun membre à ajouter")
    already = [
        member_uuid for member_uuid in newcomers if member_uuid in bean.member_uuids
    ]
    if already:
        raise ConflictException("member", already[0])
    if len(bean.member_uuids) + len(newcomers) > MAX_MEMBERS_PER_CONVERSATION:
        raise ValidationException(
            "member_uuids",
            f"Une conversation est limitée à {MAX_MEMBERS_PER_CONVERSATION} membres",
        )

    actor_name = _member_display_name(bean, requester)
    conv_repository.add_members(str(conversation_uuid), newcomers)
    # Relecture pour disposer des noms des nouveaux membres dans le message système.
    refreshed = conv_repository.get_by_uuid(
        str(conversation_uuid), for_user_uuid=requester
    )
    added_names = [
        (
            _member_display_name(refreshed, member_uuid)
            if refreshed is not None
            else member_uuid
        )
        for member_uuid in newcomers
    ]
    message_service.post_system_message(
        msg_repository,
        str(conversation_uuid),
        requester,
        f"{actor_name} a ajouté {', '.join(added_names)}",
    )
    logger.info(
        "Membres ajoutés à la conversation %s par %s: %s",
        conversation_uuid,
        requester,
        newcomers,
    )
    return conv_repository.get_by_uuid(str(conversation_uuid), for_user_uuid=requester)


def remove_member(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    member_uuid: str,
) -> Optional[ConversationBean]:
    """Retire un membre d'un groupe (retrait par le propriétaire, ou départ volontaire).

    Renvoie None si le demandeur est parti ou si la conversation a été
    supprimée (départ du dernier membre) ; sinon la conversation à jour.
    """
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    bean = get_visible_conversation(conv_repository, requester, conversation_uuid)
    _require_group(bean, "en retirer un membre")
    target = _canonical_uuid(member_uuid, "member_uuid")
    if target not in bean.member_uuids:
        raise NotFoundException("ConversationMember", target)
    if requester != bean.owner_uuid and requester != target:
        raise ForbiddenException(
            "seul le propriétaire du groupe peut en retirer un autre membre"
        )

    actor_name = _member_display_name(bean, requester)
    target_name = _member_display_name(bean, target)

    if target == bean.owner_uuid:
        # Départ du propriétaire : transfert de propriété, ou suppression du groupe.
        new_owner = _choose_new_owner(bean.members, target)
        if new_owner is None:
            conv_repository.delete(str(conversation_uuid))
            logger.info(
                "Conversation %s supprimée: départ de son dernier membre %s",
                conversation_uuid,
                target,
            )
            return None
        message_service.post_system_message(
            msg_repository,
            str(conversation_uuid),
            requester,
            f"{target_name} a quitté le groupe. "
            f"La propriété du groupe est transférée à {_display_name(new_owner.user)}.",
        )
        bean.owner_uuid = new_owner.user.uuid
        conv_repository.update(bean, for_user_uuid=requester)
    else:
        # Le message système est écrit AVANT le retrait : l'acteur est encore membre.
        body = (
            f"{target_name} a quitté le groupe"
            if requester == target
            else f"{actor_name} a retiré {target_name}"
        )
        message_service.post_system_message(
            msg_repository, str(conversation_uuid), requester, body
        )

    conv_repository.remove_member(str(conversation_uuid), target)
    logger.info(
        "Membre %s retiré de la conversation %s par %s",
        target,
        conversation_uuid,
        requester,
    )
    if requester == target:
        return None
    return conv_repository.get_by_uuid(str(conversation_uuid), for_user_uuid=requester)


def mark_read(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
    now: Optional[datetime] = None,
) -> ConversationBean:
    """Positionne le curseur de lecture du demandeur ; renvoie la conversation à jour."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    read_at = now or datetime.now(timezone.utc)
    if not conv_repository.mark_read(str(conversation_uuid), requester, read_at):
        raise NotFoundException("Conversation", str(conversation_uuid))
    return conv_repository.get_by_uuid(str(conversation_uuid), for_user_uuid=requester)


def get_unread_total(
    conv_repository: IConversationRepository, requester_uuid: str
) -> int:
    """Nombre total de messages non lus du demandeur, toutes conversations confondues."""
    requester = _canonical_uuid(requester_uuid, "requester_uuid")
    return conv_repository.total_unread_for_user(requester)
