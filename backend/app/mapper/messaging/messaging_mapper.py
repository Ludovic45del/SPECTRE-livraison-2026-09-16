"""Mapper Messaging - Conversion Entity ↔ Bean.

Les agrégats d'une conversation (membres, non-lus, dernier message) sont
calculés en masse par le repository puis injectés ici : aucun mapper ne
déclenche de requête implicite (anti N+1).
"""

import os
from typing import List, Optional

from app.domain.messaging.models.attachment_bean import (
    AttachmentBean,
    AttachmentUploadBean,
)
from app.domain.messaging.models.constants import (
    ENTITY_REF_LABEL_MAX_LENGTH,
    IMAGE_ATTACHMENT_EXTENSIONS,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.entity_ref_bean import (
    EntityRefBean,
    EntityRefTargetBean,
)
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.conversation_member_entity import (
    ConversationMemberEntity,
)
from app.repository.messaging.models.message_attachment_entity import (
    MessageAttachmentEntity,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)
from app.repository.user.models.user_profile_entity import UserProfileEntity


def user_summary_from_profile(profile: UserProfileEntity) -> UserSummaryBean:
    """Projection annuaire d'un profil (le profil doit être chargé avec son user)."""
    user = profile.user
    return UserSummaryBean(
        uuid=str(profile.uuid),
        username=user.username,
        first_name=user.first_name or "",
        last_name=user.last_name or "",
        # ImageField.url lève ValueError si le champ est vide → garde-fou explicite.
        avatar_url=profile.avatar.url if profile.avatar else None,
        is_active=user.is_active,
    )


def conversation_member_entity_to_bean(
    entity: ConversationMemberEntity,
) -> ConversationMemberBean:
    """Convertit une ConversationMemberEntity en ConversationMemberBean."""
    return ConversationMemberBean(
        user=user_summary_from_profile(entity.member),
        joined_at=entity.joined_at,
        last_read_at=entity.last_read_at,
    )


def entity_ref_entity_to_bean(
    entity: MessageEntityRefEntity, target: Optional[EntityRefTargetBean]
) -> EntityRefBean:
    """Convertit une MessageEntityRefEntity en EntityRefBean.

    `target` est la cible résolue en masse par le repository : si elle est
    absente, l'entité n'existe plus (`exists=False`, libellé = instantané,
    slug None).
    """
    return EntityRefBean(
        entity_type=entity.entity_type,
        entity_uuid=str(entity.entity_uuid),
        label=target.label if target is not None else entity.label,
        slug=target.slug if target is not None else None,
        exists=target is not None,
    )


def entity_ref_bean_to_entity(
    bean: EntityRefBean, message: MessageEntity, position: int
) -> MessageEntityRefEntity:
    """Convertit un EntityRefBean en MessageEntityRefEntity (instantané du libellé)."""
    return MessageEntityRefEntity(
        message=message,
        entity_type=bean.entity_type,
        entity_uuid=bean.entity_uuid,
        label=(bean.label or "")[:ENTITY_REF_LABEL_MAX_LENGTH],
        position=position,
    )


def is_image_attachment_name(name: str) -> bool:
    """True si l'extension du nom (insensible à la casse) est celle d'une image."""
    return (
        os.path.splitext(name or "")[1].lstrip(".").lower()
        in IMAGE_ATTACHMENT_EXTENSIONS
    )


def attachment_entity_to_bean(entity: MessageAttachmentEntity) -> AttachmentBean:
    """Convertit une MessageAttachmentEntity en AttachmentBean (aucune requête :
    l'URL est dérivée du nom stocké, le fichier n'est pas ouvert)."""
    return AttachmentBean(
        uuid=str(entity.uuid),
        original_name=entity.original_name,
        content_type=entity.content_type,
        size=entity.size,
        # FieldFile.url lève ValueError si le champ est vide → garde-fou explicite.
        url=entity.file.url if entity.file else None,
        is_image=is_image_attachment_name(entity.original_name),
    )


def attachment_upload_to_entity(
    upload: AttachmentUploadBean, message: MessageEntity, position: int
) -> MessageAttachmentEntity:
    """Prépare une MessageAttachmentEntity à partir d'un fichier reçu (non sauvegardée :
    le fichier n'est écrit sur disque qu'au `save()` du repository)."""
    entity = MessageAttachmentEntity(
        message=message,
        original_name=(upload.name or "")[:255],
        content_type=(upload.content_type or "application/octet-stream")[:150],
        size=int(upload.size or 0),
        position=position,
    )
    entity.file = upload.file
    return entity


def message_entity_to_bean(
    entity: MessageEntity,
    entity_refs: Optional[List[EntityRefBean]] = None,
    attachments: Optional[List[AttachmentBean]] = None,
) -> MessageBean:
    """Convertit une MessageEntity en MessageBean.

    `author` n'est hydraté que si la relation a été préchargée
    (`select_related("author", "author__user")`) : jamais de requête implicite.
    `entity_refs` et `attachments` sont fournis par le repository (hydratation
    en masse) ; listes vides sinon.
    """
    author = (
        user_summary_from_profile(entity.author)
        if entity.author_id and MessageEntity.author.is_cached(entity)
        else None
    )
    return MessageBean(
        uuid=str(entity.uuid),
        conversation_uuid=str(entity.conversation_id) if entity.conversation_id else "",
        author_uuid=str(entity.author_id) if entity.author_id else None,
        author=author,
        kind=entity.kind,
        body=entity.body,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        edited_at=entity.edited_at,
        deleted_at=entity.deleted_at,
        entity_refs=list(entity_refs) if entity_refs else [],
        attachments=list(attachments) if attachments else [],
    )


def message_bean_to_entity(bean: MessageBean) -> MessageEntity:
    """Convertit un MessageBean en MessageEntity (sans les agrégats)."""
    entity = MessageEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.conversation_id = bean.conversation_uuid
    entity.author_id = bean.author_uuid
    entity.kind = bean.kind
    entity.body = bean.body
    return entity


def conversation_entity_to_bean(
    entity: ConversationEntity,
    members: Optional[List[ConversationMemberBean]] = None,
    unread_count: int = 0,
    last_message: Optional[MessageBean] = None,
) -> ConversationBean:
    """Convertit une ConversationEntity en ConversationBean.

    `members` est attendu déjà trié par (joined_at, uuid du membre).
    """
    return ConversationBean(
        uuid=str(entity.uuid),
        kind=entity.kind,
        name=entity.name or "",
        owner_uuid=str(entity.owner_id) if entity.owner_id else "",
        direct_key=entity.direct_key,
        last_message_at=entity.last_message_at,
        members=members or [],
        unread_count=unread_count,
        last_message=last_message,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def conversation_bean_to_entity(bean: ConversationBean) -> ConversationEntity:
    """Convertit un ConversationBean en ConversationEntity (sans les agrégats)."""
    entity = ConversationEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.kind = bean.kind
    entity.name = bean.name or ""
    entity.owner_id = bean.owner_uuid
    entity.direct_key = bean.direct_key
    entity.last_message_at = bean.last_message_at
    return entity


def conversation_update_entity_from_bean(
    entity: ConversationEntity, bean: ConversationBean
) -> None:
    """Applique les champs modifiables du bean sur l'entité (nom, propriétaire)."""
    entity.name = bean.name or ""
    entity.owner_id = bean.owner_uuid
