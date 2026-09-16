"""Mapper API Messaging - Conversion Bean ↔ dict API."""

from typing import Any, Dict, List, Optional, Tuple

from app.domain.messaging.models.attachment_bean import AttachmentBean
from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    LAST_MESSAGE_PREVIEW_LENGTH,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.entity_ref_bean import EntityRefBean
from app.domain.messaging.models.mention_bean import MentionBean
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.mapper.type_conversion import format_date_for_api


def conversation_api_to_bean(data: Dict[str, Any]) -> ConversationBean:
    """Convertit des données API en ConversationBean (création / renommage)."""
    return ConversationBean(
        kind=data.get("kind", KIND_DIRECT) or KIND_DIRECT,
        name=data.get("name", "") or "",
    )


def message_api_to_bean(data: Dict[str, Any]) -> MessageBean:
    """Convertit des données API en MessageBean (publication d'un message)."""
    return MessageBean(body=data.get("body", "") or "")


def entity_refs_api_to_tuples(data: Dict[str, Any]) -> List[Tuple[str, str]]:
    """Extrait les couples `(entity_type, entity_uuid)` d'un corps de publication."""
    return [
        (str(ref.get("entity_type", "")), str(ref.get("entity_uuid", "")))
        for ref in data.get("entity_refs") or []
    ]


def entity_ref_bean_to_api(bean: EntityRefBean) -> Dict[str, Any]:
    """Convertit un EntityRefBean en dict API (chip cliquable ou « supprimée »)."""
    return {
        "entity_type": bean.entity_type,
        "entity_uuid": bean.entity_uuid,
        "label": bean.label,
        "slug": bean.slug,
        "exists": bean.exists,
    }


def attachment_bean_to_api(bean: AttachmentBean) -> Dict[str, Any]:
    """Convertit un AttachmentBean en dict API (vignette ou puce de téléchargement)."""
    return {
        "uuid": bean.uuid,
        "original_name": bean.original_name,
        "content_type": bean.content_type,
        "size": bean.size,
        "url": bean.url,
        "is_image": bean.is_image,
    }


def user_summary_bean_to_api(bean: UserSummaryBean) -> Dict[str, Any]:
    """Convertit un UserSummaryBean en dict API."""
    return {
        "uuid": bean.uuid,
        "username": bean.username,
        "first_name": bean.first_name,
        "last_name": bean.last_name,
        "avatar_url": bean.avatar_url,
        "is_active": bean.is_active,
    }


def conversation_member_bean_to_api(bean: ConversationMemberBean) -> Dict[str, Any]:
    """Convertit un ConversationMemberBean en dict API (champs utilisateur aplatis)."""
    data = user_summary_bean_to_api(bean.user)
    data["joined_at"] = format_date_for_api(bean.joined_at)
    data["last_read_at"] = format_date_for_api(bean.last_read_at)
    return data


def message_bean_to_api(bean: MessageBean) -> Dict[str, Any]:
    """Convertit un MessageBean en dict API."""
    return {
        "uuid": bean.uuid,
        "conversation_uuid": bean.conversation_uuid,
        "author_uuid": bean.author_uuid,
        "author": user_summary_bean_to_api(bean.author) if bean.author else None,
        "kind": bean.kind,
        "body": bean.body,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
        "edited_at": format_date_for_api(bean.edited_at),
        "deleted_at": format_date_for_api(bean.deleted_at),
        "is_deleted": bean.is_deleted,
        "entity_refs": [entity_ref_bean_to_api(ref) for ref in bean.entity_refs],
        "attachments": [attachment_bean_to_api(item) for item in bean.attachments],
    }


def message_beans_to_api(beans: List[MessageBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de MessageBean en dicts API."""
    return [message_bean_to_api(bean) for bean in beans]


def message_page_to_api(
    results: List[MessageBean], has_more: bool, updated: List[MessageBean]
) -> Dict[str, Any]:
    """Enveloppe d'une page de messages : `updated` (éditions / suppressions
    d'anciens messages) est toujours présent, vide sans `updated_since`."""
    return {
        "results": message_beans_to_api(results),
        "has_more": has_more,
        "updated": message_beans_to_api(updated),
    }


def message_preview_bean_to_api(bean: MessageBean) -> Dict[str, Any]:
    """Convertit un MessageBean en aperçu (corps tronqué) pour la liste des conversations."""
    body = bean.body or ""
    if len(body) > LAST_MESSAGE_PREVIEW_LENGTH:
        body = body[:LAST_MESSAGE_PREVIEW_LENGTH] + "…"
    return {
        "uuid": bean.uuid,
        "author_uuid": bean.author_uuid,
        "kind": bean.kind,
        "body": body,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
        "is_deleted": bean.is_deleted,
        "entity_ref_count": bean.entity_ref_count or len(bean.entity_refs),
        "attachment_count": bean.attachment_count or len(bean.attachments),
    }


def mention_bean_to_api(bean: MentionBean) -> Dict[str, Any]:
    """Convertit un MentionBean en dict API (message + contexte de conversation)."""
    return {
        "message": message_bean_to_api(bean.message),
        "conversation": {
            "uuid": bean.conversation_uuid,
            "kind": bean.conversation_kind,
            "name": bean.conversation_name,
            "members": [
                user_summary_bean_to_api(member) for member in bean.conversation_members
            ],
        },
    }


def mention_beans_to_api(beans: List[MentionBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de MentionBean en dicts API."""
    return [mention_bean_to_api(bean) for bean in beans]


def conversation_bean_to_api(bean: ConversationBean) -> Dict[str, Any]:
    """Convertit un ConversationBean en dict API (membres et aperçu inclus)."""
    last_message: Optional[Dict[str, Any]] = (
        message_preview_bean_to_api(bean.last_message) if bean.last_message else None
    )
    return {
        "uuid": bean.uuid,
        "kind": bean.kind,
        "name": bean.name,
        "owner_uuid": bean.owner_uuid,
        "last_message_at": format_date_for_api(bean.last_message_at),
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
        "members": [conversation_member_bean_to_api(m) for m in bean.members],
        "unread_count": bean.unread_count,
        "last_message": last_message,
    }


def conversation_beans_to_api(beans: List[ConversationBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de ConversationBean en dicts API."""
    return [conversation_bean_to_api(bean) for bean in beans]
