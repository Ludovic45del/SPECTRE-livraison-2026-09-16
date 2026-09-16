"""Service Messages — lecture paginée par curseur et publication de messages.

Chemin chaud du polling frontend : la vérification d'accès passe par
`is_member` (une seule requête `exists()`), et non par une lecture complète
de la conversation. Une conversation dont le demandeur n'est pas membre est
traitée comme inexistante (NotFoundException).

Atomicité : ce service ne gère aucune transaction (aucun import ORM autorisé
dans le domaine) ; l'écriture d'un message et la mise à jour des compteurs
dénormalisés sont atomiques côté repository, et la requête HTTP entière
l'est via `ATOMIC_REQUESTS = True`. Tout appelant hors cycle HTTP doit
envelopper l'appel dans `transaction.atomic()`.
"""

import logging
import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Iterable, List, Optional, Sequence, Tuple

from app.domain.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.messaging.interface.conversation_repository import (
    IConversationRepository,
)
from app.domain.messaging.interface.entity_ref_resolver import IEntityRefResolver
from app.domain.messaging.interface.message_repository import (
    IMessageRepository,
    MessagePage,
)
from app.domain.messaging.models.attachment_bean import AttachmentUploadBean
from app.domain.messaging.models.constants import (
    ALLOWED_ATTACHMENT_EXTENSIONS,
    KIND_GROUP,
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MAX_ENTITY_REFS_PER_MESSAGE,
    MAX_MESSAGE_LENGTH,
    MENTIONS_DEFAULT_LIMIT,
    MENTIONS_MAX_LIMIT,
    MESSAGE_KIND_SYSTEM,
    MESSAGE_KIND_TEXT,
    MESSAGE_PAGE_DEFAULT_LIMIT,
    MESSAGE_PAGE_MAX_LIMIT,
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LENGTH,
    SEARCH_MAX_LIMIT,
    SEARCH_MIN_LENGTH,
    VALID_ENTITY_REF_TYPES,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.entity_ref_bean import EntityRefBean
from app.domain.messaging.models.mention_bean import MentionBean
from app.domain.messaging.models.message_bean import MessageBean

logger = logging.getLogger(__name__)


def _canonical_or_raw(value) -> str:
    """Forme canonique d'un uuid (minuscules, tirets) ; la valeur brute si non parsable.

    Un segment d'URL malformé reste tel quel : `is_member` renverra False et
    la conversation sera traitée comme inexistante (404).
    """
    try:
        return str(uuid_lib.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return str(value)


def _canonical_entity_uuid(value, field: str) -> str:
    """Forme canonique de l'uuid d'une entité référencée ; ValidationException si invalide."""
    try:
        return str(uuid_lib.UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValidationException(field, f"UUID invalide: {value}") from exc


def _validate_entity_ref_type(entity_type: str, field: str) -> str:
    """Vérifie qu'un type de référence est connu (fsec, campaign, fa)."""
    if entity_type not in VALID_ENTITY_REF_TYPES:
        raise ValidationException(field, f"Type de référence inconnu: {entity_type}")
    return entity_type


def _normalise_entity_refs(
    entity_refs: Optional[Iterable[Tuple[str, str]]],
) -> List[Tuple[str, str]]:
    """Nettoie les références reçues : type connu, uuid canonique, dédoublonnage
    (ordre conservé) puis plafond `MAX_ENTITY_REFS_PER_MESSAGE`."""
    cleaned: List[Tuple[str, str]] = []
    for raw_type, raw_uuid in entity_refs or ():
        key = (
            _validate_entity_ref_type(raw_type, "entity_refs"),
            _canonical_entity_uuid(raw_uuid, "entity_refs"),
        )
        if key not in cleaned:
            cleaned.append(key)
    if len(cleaned) > MAX_ENTITY_REFS_PER_MESSAGE:
        raise ValidationException(
            "entity_refs",
            f"Un message est limité à {MAX_ENTITY_REFS_PER_MESSAGE} références",
        )
    return cleaned


def _resolve_entity_refs(
    resolver: Optional[IEntityRefResolver], refs: List[Tuple[str, str]]
) -> List[EntityRefBean]:
    """Résout les cibles en une passe ; toute cible absente est une erreur de validation."""
    if not refs:
        return []
    targets = resolver.resolve(refs) if resolver is not None else {}
    missing = [key for key in refs if key not in targets]
    if missing:
        entity_type, entity_uuid = missing[0]
        raise ValidationException(
            "entity_refs", f"Référence introuvable: {entity_type}:{entity_uuid}"
        )
    return [
        EntityRefBean(
            entity_type=entity_type,
            entity_uuid=entity_uuid,
            label=targets[(entity_type, entity_uuid)].label,
            slug=targets[(entity_type, entity_uuid)].slug,
            exists=True,
        )
        for entity_type, entity_uuid in refs
    ]


def _require_member_fast(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
) -> None:
    """Vérifie l'appartenance du demandeur en une requête ; 404 sinon."""
    if not conv_repository.is_member(str(conversation_uuid), str(requester_uuid)):
        raise NotFoundException("Conversation", str(conversation_uuid))


def _bounded_limit(limit: Optional[int]) -> int:
    """Borne la taille de page demandée à [1, MESSAGE_PAGE_MAX_LIMIT]."""
    if limit is None:
        return MESSAGE_PAGE_DEFAULT_LIMIT
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return MESSAGE_PAGE_DEFAULT_LIMIT
    return max(1, min(value, MESSAGE_PAGE_MAX_LIMIT))


def _bounded_search_limit(
    limit: Optional[int], field: str, default: int, maximum: int
) -> int:
    """Limite d'une recherche : `default` si absente, sinon entier dans [1, maximum]."""
    if limit is None:
        return default
    try:
        value = int(limit)
    except (TypeError, ValueError) as exc:
        raise ValidationException(field, f"Limite invalide: {limit}") from exc
    if not 1 <= value <= maximum:
        raise ValidationException(
            field, f"La limite doit être comprise entre 1 et {maximum}"
        )
    return value


def _validate_attachments(
    attachments: Optional[Sequence[AttachmentUploadBean]],
) -> List[AttachmentUploadBean]:
    """Vérifie les pièces jointes reçues : nombre, nom, extension et taille.

    Le domaine ne lit jamais le contenu du fichier : seul le nom (extension,
    insensible à la casse) et la taille déclarée sont contrôlés.
    """
    items = list(attachments or ())
    if len(items) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise ValidationException(
            "attachments",
            f"Un message est limité à {MAX_ATTACHMENTS_PER_MESSAGE} pièces jointes",
        )
    for item in items:
        name = (item.name or "").strip()
        if not name:
            raise ValidationException("attachments", "Nom de fichier manquant")
        extension = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise ValidationException(
                "attachments", f"Type de fichier non autorisé: {name}"
            )
        if not item.size:
            raise ValidationException("attachments", f"Le fichier {name} est vide")
        if item.size > MAX_ATTACHMENT_SIZE_BYTES:
            raise ValidationException(
                "attachments",
                f"Le fichier {name} dépasse {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)} Mo",
            )
    return items


def _validate_body(body: Optional[str], required: bool = True) -> str:
    """Nettoie et contrôle le corps d'un message (vide toléré si `required` est False)."""
    cleaned = (body or "").strip()
    if not cleaned and required:
        raise ValidationException("body", "Le message ne peut pas être vide")
    if len(cleaned) > MAX_MESSAGE_LENGTH:
        raise ValidationException(
            "body", f"Le message dépasse {MAX_MESSAGE_LENGTH} caractères"
        )
    return cleaned


def _visible_conversation(
    conv_repository: IConversationRepository,
    requester_uuid: str,
    conversation_uuid: str,
) -> ConversationBean:
    """Conversation complète si le demandeur en est membre, 404 sinon
    (même règle que `conversation_service.get_visible_conversation`)."""
    bean = conv_repository.get_by_uuid(conversation_uuid, for_user_uuid=requester_uuid)
    if bean is None or requester_uuid not in bean.member_uuids:
        raise NotFoundException("Conversation", conversation_uuid)
    return bean


def _get_message_of_conversation(
    msg_repository: IMessageRepository, conversation_uuid: str, message_uuid: str
) -> MessageBean:
    """Message de la conversation ; 404 s'il est inconnu, malformé ou d'une autre conversation."""
    message = msg_repository.get_by_uuid(str(message_uuid))
    if message is None or message.conversation_uuid != conversation_uuid:
        raise NotFoundException("Message", str(message_uuid))
    return message


def _updated_since_bound(updated_since: Optional[datetime]) -> Optional[datetime]:
    """Aligne `updated_since` sur la fin de sa milliseconde.

    Le client conserve les dates à la milliseconde alors que la base garde les
    microsecondes : sans cet alignement, un message modifié à 10:00:00.123456
    et revu par le client comme 10:00:00.123 serait renvoyé à chaque polling.
    Un message modifié dans la même milliseconde est donc considéré comme déjà vu.
    """
    if updated_since is None:
        return None
    return updated_since.replace(
        microsecond=(updated_since.microsecond // 1000) * 1000 + 999
    )


def get_messages(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    limit: Optional[int] = None,
    before_uuid: Optional[str] = None,
    after_uuid: Optional[str] = None,
    updated_since: Optional[datetime] = None,
) -> MessagePage:
    """Page de messages d'une conversation, en ordre chronologique croissant.

    Renvoie `(messages, has_more, updated)`. Les curseurs `before` et `after`
    sont exclusifs l'un de l'autre et doivent désigner un message de cette
    conversation. `updated_since` (polling) ajoute dans `updated` les messages
    modifiés ou supprimés depuis cette date qui ne figurent pas dans la page ;
    il s'utilise seul ou avec `after`, jamais avec `before`.
    """
    conversation_uuid = _canonical_or_raw(conversation_uuid)
    _require_member_fast(conv_repository, requester_uuid, conversation_uuid)
    if before_uuid and after_uuid:
        raise ValidationException(
            "cursor", "Les curseurs before et after sont exclusifs"
        )
    if before_uuid and updated_since is not None:
        raise ValidationException(
            "updated_since", "updated_since ne se combine pas avec le curseur before"
        )
    bounded_limit = _bounded_limit(limit)

    # Le repository relit lui-même le curseur (une seule requête) et renvoie
    # None s'il est inconnu, malformé ou étranger à la conversation.
    page = msg_repository.get_page(
        conversation_uuid,
        bounded_limit,
        before_uuid=str(before_uuid) if before_uuid else None,
        after_uuid=str(after_uuid) if after_uuid else None,
        updated_since=_updated_since_bound(updated_since),
    )
    if page is None:
        raise NotFoundException("Message", str(before_uuid or after_uuid))
    return page


def post_message(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    body: str,
    entity_refs: Iterable[Tuple[str, str]] = (),
    resolver: Optional[IEntityRefResolver] = None,
    attachments: Sequence[AttachmentUploadBean] = (),
) -> MessageBean:
    """Publie un message texte du demandeur dans une conversation dont il est membre.

    `entity_refs` : couples `(entity_type, entity_uuid)` à attacher au message
    (FSEC → fsec_uuid, campagne → uuid, FA → uuid). Chaque cible doit exister
    au moment de la publication (résolution via `resolver`) : son libellé
    courant est pris en instantané. L'ordre demandé est conservé, les doublons
    sont ignorés.

    `attachments` : fichiers reçus (≤ MAX_ATTACHMENTS_PER_MESSAGE, extension
    autorisée, ≤ MAX_ATTACHMENT_SIZE_BYTES chacun). Le corps peut être vide
    si le message porte au moins une pièce jointe ; des références seules ne
    suffisent pas.
    """
    conversation_uuid = _canonical_or_raw(conversation_uuid)
    _require_member_fast(conv_repository, requester_uuid, conversation_uuid)
    uploads = _validate_attachments(attachments)
    body = _validate_body(body, required=not uploads)
    refs = _resolve_entity_refs(resolver, _normalise_entity_refs(entity_refs))
    bean = MessageBean(
        conversation_uuid=str(conversation_uuid),
        author_uuid=str(requester_uuid),
        kind=MESSAGE_KIND_TEXT,
        body=body,
        entity_refs=refs,
    )
    result = msg_repository.create(bean, uploads)
    logger.info(
        "Message %s publié dans la conversation %s par %s (%d référence(s), %d pièce(s) jointe(s))",
        result.uuid,
        conversation_uuid,
        requester_uuid,
        len(refs),
        len(uploads),
    )
    return result


def edit_message(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    message_uuid: str,
    body: str,
) -> MessageBean:
    """Remplace le corps d'un message texte : réservé à son auteur.

    Un message supprimé ou un message système ne se modifie pas (400). Un
    corps identique ne provoque aucune écriture (le message est renvoyé tel
    quel, sans `edited_at`).
    """
    conversation_uuid = _canonical_or_raw(conversation_uuid)
    _require_member_fast(conv_repository, requester_uuid, conversation_uuid)
    message = _get_message_of_conversation(
        msg_repository, conversation_uuid, message_uuid
    )
    if message.is_deleted:
        raise ValidationException("message", "Message supprimé")
    if message.kind != MESSAGE_KIND_TEXT:
        raise ValidationException("message", "Seul un message texte peut être modifié")
    if message.author_uuid != str(requester_uuid):
        raise ForbiddenException("seul l'auteur peut modifier son message")
    new_body = _validate_body(body, required=True)
    if new_body == message.body:
        return message
    result = msg_repository.update_body(
        message.uuid, new_body, edited_at=datetime.now(timezone.utc)
    )
    logger.info(
        "Message %s modifié dans la conversation %s par %s",
        message.uuid,
        conversation_uuid,
        requester_uuid,
    )
    return result


def delete_message(
    conv_repository: IConversationRepository,
    msg_repository: IMessageRepository,
    requester_uuid: str,
    conversation_uuid: str,
    message_uuid: str,
) -> MessageBean:
    """Supprime logiquement un message texte : par son auteur, ou par le
    propriétaire d'un groupe (jamais par l'autre membre d'une privée).

    Idempotent : un message déjà supprimé est renvoyé tel quel. Le corps est
    vidé, les références et pièces jointes retirées ; la ligne subsiste pour
    garder l'historique et les curseurs stables.
    """
    conversation_uuid = _canonical_or_raw(conversation_uuid)
    conversation = _visible_conversation(
        conv_repository, str(requester_uuid), conversation_uuid
    )
    message = _get_message_of_conversation(
        msg_repository, conversation_uuid, message_uuid
    )
    if message.is_deleted:
        return message
    if message.kind != MESSAGE_KIND_TEXT:
        raise ValidationException("message", "Seul un message texte peut être supprimé")
    is_author = message.author_uuid == str(requester_uuid)
    is_group_owner = conversation.kind == KIND_GROUP and conversation.owner_uuid == str(
        requester_uuid
    )
    if not (is_author or is_group_owner):
        raise ForbiddenException(
            "seul l'auteur ou le propriétaire du groupe peut supprimer ce message"
        )
    result = msg_repository.soft_delete(message.uuid, datetime.now(timezone.utc))
    logger.info(
        "Message %s supprimé dans la conversation %s par %s",
        message.uuid,
        conversation_uuid,
        requester_uuid,
    )
    return result


def search_messages(
    msg_repository: IMessageRepository,
    requester_uuid: str,
    query: str,
    limit: Optional[int] = None,
) -> List[MentionBean]:
    """Recherche plein-texte simple (`icontains`) dans les messages texte non
    supprimés des conversations du demandeur, du plus récent au plus ancien.

    `query` est nettoyé et doit compter entre SEARCH_MIN_LENGTH et
    SEARCH_MAX_LENGTH caractères ; `limit` vaut SEARCH_DEFAULT_LIMIT par
    défaut et doit rester dans [1, SEARCH_MAX_LIMIT].
    """
    cleaned = (query or "").strip()
    if not SEARCH_MIN_LENGTH <= len(cleaned) <= SEARCH_MAX_LENGTH:
        raise ValidationException(
            "q",
            f"La recherche doit compter entre {SEARCH_MIN_LENGTH} et {SEARCH_MAX_LENGTH} caractères",
        )
    bounded_limit = _bounded_search_limit(
        limit, "limit", SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT
    )
    return msg_repository.search(str(requester_uuid), cleaned, bounded_limit)


def get_mentions(
    msg_repository: IMessageRepository,
    requester_uuid: str,
    entity_type: str,
    entity_uuid: str,
    limit: Optional[int] = None,
) -> List[MentionBean]:
    """Messages mentionnant une entité, limités aux conversations du demandeur.

    Une cible inconnue (ou supprimée) donne une liste vide, jamais un 404 :
    l'onglet « Discussions » d'une fiche ne doit pas échouer parce que
    l'entité n'existe plus. `limit` vaut MENTIONS_DEFAULT_LIMIT par défaut et
    doit rester dans [1, MENTIONS_MAX_LIMIT].
    """
    entity_type = _validate_entity_ref_type(entity_type, "entity_type")
    entity_uuid = _canonical_entity_uuid(entity_uuid, "entity_uuid")
    bounded_limit = _bounded_search_limit(
        limit, "limit", MENTIONS_DEFAULT_LIMIT, MENTIONS_MAX_LIMIT
    )
    return msg_repository.get_mentions(
        str(requester_uuid), entity_type, entity_uuid, bounded_limit
    )


def post_system_message(
    msg_repository: IMessageRepository,
    conversation_uuid: str,
    actor_uuid: Optional[str],
    body: str,
) -> MessageBean:
    """Publie un message système (événement de groupe) attribué à son acteur."""
    bean = MessageBean(
        conversation_uuid=str(conversation_uuid),
        author_uuid=str(actor_uuid) if actor_uuid else None,
        kind=MESSAGE_KIND_SYSTEM,
        body=body,
    )
    return msg_repository.create(bean)
