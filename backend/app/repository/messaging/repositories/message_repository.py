"""Repository Message — lecture paginée par curseur et écriture des messages.

La pagination s'appuie sur l'ordre strict `(created_at, uuid)` : le couple est
unique et se compare identiquement sur PostgreSQL (type uuid) et sur SQLite
(char(32) hexadécimal, donc ordre octet par octet), et `auto_now_add` conserve
les microsecondes sur les deux moteurs.

Références d'entités (vague M3) et pièces jointes (vague M4) : chaque lecture
hydrate `entity_refs` et `attachments` EN MASSE — une requête pour les
références de tous les messages de la page, une requête pour leurs pièces
jointes, puis une résolution des cibles par le resolver injecté (≤ 1 requête
par type d'entité). Le budget de requêtes ne dépend jamais du nombre de messages.

Fichiers disque : les pièces jointes sont écrites sous MEDIA_ROOT au `save()`
de leur entité. Une écriture disque échouée annule la transaction et efface
les fichiers déjà écrits ; une suppression logique efface les fichiers
immédiatement après la suppression des lignes (même convention que
`UserRepository.set_avatar` : pas de report à la validation de la transaction).
"""

from datetime import datetime
from typing import Dict, List, Optional, Sequence

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet

from app.domain.messaging.interface.entity_ref_resolver import IEntityRefResolver
from app.domain.messaging.interface.message_repository import (
    IMessageRepository,
    MessagePage,
)
from app.domain.messaging.models.attachment_bean import (
    AttachmentBean,
    AttachmentUploadBean,
)
from app.domain.messaging.models.constants import (
    DELETED_MESSAGE_BODY,
    MESSAGE_KIND_TEXT,
)
from app.domain.messaging.models.entity_ref_bean import EntityRefBean
from app.domain.messaging.models.mention_bean import MentionBean
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.mapper.messaging.messaging_mapper import (
    attachment_entity_to_bean,
    attachment_upload_to_entity,
    entity_ref_bean_to_entity,
    entity_ref_entity_to_bean,
    message_bean_to_entity,
    message_entity_to_bean,
    user_summary_from_profile,
)
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.conversation_member_entity import (
    ConversationMemberEntity,
)
from app.repository.messaging.models.message_attachment_entity import (
    MessageAttachmentEntity,
    delete_stored_files,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)
from app.repository.messaging.repositories.entity_ref_resolver import EntityRefResolver


def _with_author(queryset: QuerySet) -> QuerySet:
    """Précharge l'auteur et son compte (le mapper n'émet aucune requête)."""
    return queryset.select_related("author", "author__user")


def entity_refs_by_message(
    message_uuids: List[str], resolver: IEntityRefResolver
) -> Dict[str, List[EntityRefBean]]:
    """Références de plusieurs messages en UNE requête, cibles résolues en masse.

    Résultat indexé par uuid de message, listes dans l'ordre d'insertion
    (position, created_at). Aucune requête si `message_uuids` est vide ;
    aucune résolution si aucun message ne porte de référence.
    """
    refs: Dict[str, List[EntityRefBean]] = {}
    if not message_uuids:
        return refs
    rows = list(
        MessageEntityRefEntity.objects.filter(message_id__in=message_uuids).order_by(
            "message_id", "position", "created_at"
        )
    )
    if not rows:
        return refs
    keys = list({(row.entity_type, str(row.entity_uuid)) for row in rows})
    targets = resolver.resolve(keys)
    for row in rows:
        key = (row.entity_type, str(row.entity_uuid))
        refs.setdefault(str(row.message_id), []).append(
            entity_ref_entity_to_bean(row, targets.get(key))
        )
    return refs


def attachments_by_message(message_uuids: List[str]) -> Dict[str, List[AttachmentBean]]:
    """Pièces jointes de plusieurs messages en UNE requête (fichiers non ouverts).

    Résultat indexé par uuid de message, listes dans l'ordre d'insertion.
    Aucune requête si `message_uuids` est vide.
    """
    attachments: Dict[str, List[AttachmentBean]] = {}
    if not message_uuids:
        return attachments
    rows = MessageAttachmentEntity.objects.filter(
        message_id__in=message_uuids
    ).order_by("message_id", "position", "created_at")
    for row in rows:
        attachments.setdefault(str(row.message_id), []).append(
            attachment_entity_to_bean(row)
        )
    return attachments


def _member_summaries_by_conversation(
    conversation_uuids: List[str],
) -> Dict[str, List[UserSummaryBean]]:
    """Membres (projection annuaire) de plusieurs conversations en une requête."""
    members: Dict[str, List[UserSummaryBean]] = {}
    if not conversation_uuids:
        return members
    rows = (
        ConversationMemberEntity.objects.filter(conversation_id__in=conversation_uuids)
        .select_related("member", "member__user")
        .order_by("joined_at", "member_id")
    )
    for row in rows:
        members.setdefault(str(row.conversation_id), []).append(
            user_summary_from_profile(row.member)
        )
    return members


def _member_conversations(user_uuid: str) -> QuerySet:
    """Sous-requête : uuid des conversations dont l'utilisateur est membre."""
    return ConversationMemberEntity.objects.filter(member_id=user_uuid).values(
        "conversation_id"
    )


class MessageRepository(IMessageRepository):
    """Implémentation ORM du repository des messages."""

    def __init__(self, resolver: Optional[IEntityRefResolver] = None):
        self._resolver = resolver if resolver is not None else EntityRefResolver()

    # -------------------------------------------------------------- hydratation

    def _hydrate(self, rows: List[MessageEntity]) -> List[MessageBean]:
        """Assemble les beans avec leurs références et pièces jointes chargées en masse."""
        uuids = [str(row.uuid) for row in rows]
        refs = entity_refs_by_message(uuids, self._resolver)
        attachments = attachments_by_message(uuids)
        return [
            message_entity_to_bean(
                row,
                entity_refs=refs.get(str(row.uuid), []),
                attachments=attachments.get(str(row.uuid), []),
            )
            for row in rows
        ]

    def _mentions_from_rows(self, rows: List[MessageEntity]) -> List[MentionBean]:
        """Messages (avec `conversation` préchargée) → MentionBean, membres en une requête."""
        messages = self._hydrate(rows)
        members = _member_summaries_by_conversation(
            list({str(row.conversation_id) for row in rows})
        )
        return [
            MentionBean(
                message=message,
                conversation_uuid=str(row.conversation_id),
                conversation_kind=row.conversation.kind,
                conversation_name=row.conversation.name or "",
                conversation_members=members.get(str(row.conversation_id), []),
            )
            for row, message in zip(rows, messages)
        ]

    # ------------------------------------------------------------------ lectures

    def get_by_uuid(self, uuid: str) -> Optional[MessageBean]:
        try:
            entity = _with_author(MessageEntity.objects.all()).get(uuid=uuid)
        except (MessageEntity.DoesNotExist, ValidationError, ValueError):
            return None
        return self._hydrate([entity])[0]

    def get_page(
        self,
        conversation_uuid: str,
        limit: int,
        before_uuid: Optional[str] = None,
        after_uuid: Optional[str] = None,
        updated_since: Optional[datetime] = None,
    ) -> Optional[MessagePage]:
        base = _with_author(
            MessageEntity.objects.filter(conversation_id=conversation_uuid)
        )

        cursor = None
        cursor_uuid = before_uuid or after_uuid
        if cursor_uuid:
            try:
                cursor = MessageEntity.objects.get(
                    uuid=cursor_uuid, conversation_id=conversation_uuid
                )
            except (MessageEntity.DoesNotExist, ValidationError, ValueError):
                # Curseur inconnu, malformé ou étranger à la conversation :
                # c'est au service de lever NotFoundException("Message", uuid).
                return None

        if after_uuid and cursor is not None:
            # Messages postérieurs au curseur, lus dans l'ordre chronologique.
            queryset = base.filter(
                Q(created_at__gt=cursor.created_at)
                | Q(created_at=cursor.created_at, uuid__gt=cursor.uuid)
            ).order_by("created_at", "uuid")
            reverse_rows = False
        elif before_uuid and cursor is not None:
            # Messages antérieurs au curseur, lus du plus récent au plus ancien.
            queryset = base.filter(
                Q(created_at__lt=cursor.created_at)
                | Q(created_at=cursor.created_at, uuid__lt=cursor.uuid)
            ).order_by("-created_at", "-uuid")
            reverse_rows = True
        else:
            queryset = base.order_by("-created_at", "-uuid")
            reverse_rows = True

        # On lit une ligne de plus que demandé : sa présence signale qu'il reste
        # des messages au-delà de la page. Elle est retirée AVANT toute inversion.
        rows = list(queryset[: limit + 1])
        has_more = len(rows) > limit
        rows = rows[:limit]
        if reverse_rows:
            rows.reverse()

        updated_rows: List[MessageEntity] = []
        if updated_since is not None:
            # Éditions / suppressions d'anciens messages, hors de la page. Avec
            # `after`, les messages postérieurs au curseur relèvent de la page
            # (ou de `has_more`) : seuls ceux situés au plus tard au curseur
            # sont candidats. Index (conversation, updated_at).
            updated_qs = base.filter(updated_at__gt=updated_since).exclude(
                uuid__in=[row.uuid for row in rows]
            )
            if after_uuid and cursor is not None:
                updated_qs = updated_qs.filter(
                    Q(created_at__lt=cursor.created_at)
                    | Q(created_at=cursor.created_at, uuid__lte=cursor.uuid)
                )
            # Borné à `limit`, les mises à jour les plus ANCIENNES d'abord : le client
            # avance `updated_since` jusqu'au dernier `updated_at` reçu et récupère le
            # reste aux appels suivants (aucune mise à jour n'est sautée).
            updated_rows = list(updated_qs.order_by("updated_at", "uuid")[:limit])
            updated_rows.sort(key=lambda row: (row.created_at, row.uuid))

        # Une seule hydratation (références + pièces jointes) pour les deux listes.
        beans = self._hydrate(rows + updated_rows)
        return beans[: len(rows)], has_more, beans[len(rows) :]

    def get_mentions(
        self, user_uuid: str, entity_type: str, entity_uuid: str, limit: int
    ) -> List[MentionBean]:
        # Deux sous-requêtes plutôt que des jointures sur les relations
        # multivaluées `entity_refs` et `memberships` : aucun doublon possible,
        # même plan sur PostgreSQL et SQLite.
        try:
            rows = list(
                _with_author(
                    MessageEntity.objects.filter(
                        uuid__in=MessageEntityRefEntity.objects.filter(
                            entity_type=entity_type, entity_uuid=entity_uuid
                        ).values("message_id"),
                        conversation_id__in=_member_conversations(user_uuid),
                    )
                )
                .select_related("conversation")
                .order_by("-created_at", "-uuid")[:limit]
            )
        except (ValidationError, ValueError):
            # Uuid malformé (déjà filtré par le service) : aucune mention.
            return []
        return self._mentions_from_rows(rows)

    def search(self, user_uuid: str, query: str, limit: int) -> List[MentionBean]:
        # `icontains` : LIKE insensible à la casse (ILIKE sur PostgreSQL ; sur
        # SQLite l'insensibilité ne couvre que l'ASCII). Les jokers `%` / `_`
        # du terme sont échappés par l'ORM.
        rows = list(
            _with_author(
                MessageEntity.objects.filter(
                    body__icontains=query,
                    kind=MESSAGE_KIND_TEXT,
                    deleted_at__isnull=True,
                    conversation_id__in=_member_conversations(user_uuid),
                )
            )
            .select_related("conversation")
            .order_by("-created_at", "-uuid")[:limit]
        )
        return self._mentions_from_rows(rows)

    # ------------------------------------------------------------------ écritures

    @transaction.atomic
    def create(
        self, bean: MessageBean, attachments: Sequence[AttachmentUploadBean] = ()
    ) -> MessageBean:
        entity = message_bean_to_entity(bean)
        entity.save()
        if bean.entity_refs:
            # Le service a déjà dédoublonné (contrainte d'unicité respectée).
            MessageEntityRefEntity.objects.bulk_create(
                entity_ref_bean_to_entity(ref, entity, position)
                for position, ref in enumerate(bean.entity_refs)
            )
        saved_attachments = self._store_attachments(entity, attachments)
        # Dénormalisation du tri de la liste des conversations.
        ConversationEntity.objects.filter(uuid=entity.conversation_id).update(
            last_message_at=entity.created_at
        )
        if entity.author_id:
            # L'auteur a évidemment lu son propre message.
            ConversationMemberEntity.objects.filter(
                conversation_id=entity.conversation_id, member_id=entity.author_id
            ).update(last_read_at=entity.created_at)
        # Les références ont déjà été résolues par le service (bean.entity_refs)
        # et les pièces jointes viennent d'être écrites : inutile de les relire.
        return message_entity_to_bean(
            _with_author(MessageEntity.objects.all()).get(uuid=entity.uuid),
            entity_refs=list(bean.entity_refs),
            attachments=[attachment_entity_to_bean(row) for row in saved_attachments],
        )

    @staticmethod
    def _store_attachments(
        entity: MessageEntity, attachments: Sequence[AttachmentUploadBean]
    ) -> List[MessageAttachmentEntity]:
        """Écrit les fichiers sur disque et insère les lignes, dans l'ordre reçu.

        En cas d'échec (disque plein, stockage indisponible…), les fichiers déjà
        écrits sont effacés avant de propager l'exception : la transaction
        englobante annule alors les lignes.
        """
        saved: List[MessageAttachmentEntity] = []
        try:
            for position, upload in enumerate(attachments):
                row = attachment_upload_to_entity(upload, entity, position)
                row.save()
                saved.append(row)
        except Exception:
            delete_stored_files([row.file.name for row in saved])
            raise
        return saved

    @transaction.atomic
    def update_body(
        self, message_uuid: str, body: str, edited_at: datetime
    ) -> MessageBean:
        # `update()` contourne `auto_now` : updated_at est aligné explicitement
        # sur edited_at (une seule date à comparer pour `updated_since`).
        MessageEntity.objects.filter(uuid=message_uuid).update(
            body=body, edited_at=edited_at, updated_at=edited_at
        )
        return self.get_by_uuid(message_uuid)  # type: ignore[return-value]

    @transaction.atomic
    def soft_delete(self, message_uuid: str, deleted_at: datetime) -> MessageBean:
        stored_names = list(
            MessageAttachmentEntity.objects.filter(message_id=message_uuid).values_list(
                "file", flat=True
            )
        )
        MessageAttachmentEntity.objects.filter(message_id=message_uuid).delete()
        MessageEntityRefEntity.objects.filter(message_id=message_uuid).delete()
        MessageEntity.objects.filter(uuid=message_uuid).update(
            body=DELETED_MESSAGE_BODY, deleted_at=deleted_at, updated_at=deleted_at
        )
        # Fichiers effacés après les lignes (un fichier orphelin vaut mieux
        # qu'une ligne pointant vers un fichier absent).
        delete_stored_files(stored_names)
        return self.get_by_uuid(message_uuid)  # type: ignore[return-value]
