"""Repository Conversation — conversations, adhésions et compteurs de non-lus.

Toutes les lectures hydratent en masse (anti N+1) : quel que soit le nombre de
conversations renvoyées, la liste coûte quatre requêtes (conversations,
membres, derniers messages, non-lus). Les références et pièces jointes des
derniers messages ne sont pas chargées sur ce chemin pollé : seuls leurs
nombres sont annotés (`entity_ref_count` et `attachment_count` de l'aperçu).

Deux règles transverses s'appliquent ici :
- un uuid malformé arrivant d'un segment d'URL fait lever
  `django.core.exceptions.ValidationError` par `UUIDField.get_prep_value` — les
  méthodes exposées à un identifiant non validé la rattrapent et renvoient
  None/False (jamais un 500) ;
- toute condition portant sur la relation multivaluée `memberships` doit tenir
  dans UN SEUL appel `.filter(...)` : deux `.filter()` successifs créent deux
  jointures distinctes et faussent les comptages.
"""

from datetime import datetime
from typing import Dict, List, Optional

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Q, QuerySet, Subquery
from django.db.models.functions import Coalesce

from app.domain.exceptions import ConflictException
from app.domain.messaging.interface.conversation_repository import (
    IConversationRepository,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.message_bean import MessageBean
from app.mapper.messaging.messaging_mapper import (
    conversation_bean_to_entity,
    conversation_entity_to_bean,
    conversation_member_entity_to_bean,
    conversation_update_entity_from_bean,
    message_entity_to_bean,
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
from app.repository.user.models.user_profile_entity import UserProfileEntity


def _annotate_last_message(queryset: QuerySet) -> QuerySet:
    """Ajoute l'uuid du dernier message de chaque conversation (sous-requête)."""
    return queryset.annotate(
        last_message_uuid=Subquery(
            MessageEntity.objects.filter(conversation_id=OuterRef("uuid"))
            .order_by("-created_at", "-uuid")
            .values("uuid")[:1]
        )
    )


def _members_by_conversation(
    conversation_uuids: List[str],
) -> Dict[str, List[ConversationMemberBean]]:
    """Membres de plusieurs conversations en une seule requête, triés (joined_at, membre)."""
    members: Dict[str, List[ConversationMemberBean]] = {}
    if not conversation_uuids:
        return members
    rows = (
        ConversationMemberEntity.objects.filter(conversation_id__in=conversation_uuids)
        .select_related("member", "member__user")
        .order_by("joined_at", "member_id")
    )
    for row in rows:
        members.setdefault(str(row.conversation_id), []).append(
            conversation_member_entity_to_bean(row)
        )
    return members


def _last_messages_by_uuid(message_uuids: List[str]) -> Dict[str, MessageBean]:
    """Derniers messages de plusieurs conversations en une seule requête.

    Les nombres de références et de pièces jointes sont annotés (`Count`) pour
    l'aperçu, sans charger ni résoudre les références ni ouvrir les fichiers
    (chemin pollé toutes les 5 s). `distinct=True` est indispensable : deux
    relations multivaluées jointes ensemble multiplieraient les lignes.
    """
    if not message_uuids:
        return {}
    rows = (
        MessageEntity.objects.filter(uuid__in=message_uuids)
        .select_related("author", "author__user")
        .annotate(
            agg_entity_ref_count=Count("entity_refs", distinct=True),
            agg_attachment_count=Count("attachments", distinct=True),
        )
    )
    beans: Dict[str, MessageBean] = {}
    for row in rows:
        bean = message_entity_to_bean(row)
        bean.entity_ref_count = row.agg_entity_ref_count
        bean.attachment_count = row.agg_attachment_count
        beans[str(row.uuid)] = bean
    return beans


class ConversationRepository(IConversationRepository):
    """Implémentation ORM du repository des conversations."""

    # ------------------------------------------------------------------ non-lus

    def _unread_qs(self, user_uuid: str) -> QuerySet:
        """Messages non lus par un utilisateur, toutes conversations confondues.

        Point de départ = COALESCE(last_read_at, joined_at) de son adhésion.
        `exclude(author_id=...)` conserve les messages dont l'auteur est NULL
        (compte supprimé) : Django protège l'exclusion par un test IS NULL.
        """
        return MessageEntity.objects.filter(
            conversation__memberships__member_id=user_uuid,
            created_at__gt=Coalesce(
                F("conversation__memberships__last_read_at"),
                F("conversation__memberships__joined_at"),
            ),
            # Un message supprimé avant d'être lu ne vaut plus une notification.
            deleted_at__isnull=True,
        ).exclude(author_id=user_uuid)

    def _unread_by_conversation(
        self, user_uuid: Optional[str], conversation_uuids: List[str]
    ) -> Dict[str, int]:
        """Nombre de non-lus par conversation, en une seule requête groupée."""
        if not user_uuid or not conversation_uuids:
            return {}
        rows = (
            self._unread_qs(user_uuid)
            .filter(conversation_id__in=conversation_uuids)
            .order_by()
            .values("conversation_id")
            .annotate(unread=Count("uuid"))
        )
        return {str(row["conversation_id"]): row["unread"] for row in rows}

    # -------------------------------------------------------------- hydratation

    def _hydrate(
        self, entities: List[ConversationEntity], for_user_uuid: Optional[str]
    ) -> List[ConversationBean]:
        """Assemble les beans à partir des agrégats chargés en masse."""
        conversation_uuids = [str(entity.uuid) for entity in entities]
        members = _members_by_conversation(conversation_uuids)
        last_messages = _last_messages_by_uuid(
            [
                str(entity.last_message_uuid)
                for entity in entities
                if getattr(entity, "last_message_uuid", None)
            ]
        )
        unread = self._unread_by_conversation(for_user_uuid, conversation_uuids)
        beans = []
        for entity in entities:
            key = str(entity.uuid)
            last_message_uuid = getattr(entity, "last_message_uuid", None)
            beans.append(
                conversation_entity_to_bean(
                    entity,
                    members=members.get(key, []),
                    unread_count=unread.get(key, 0),
                    last_message=(
                        last_messages.get(str(last_message_uuid))
                        if last_message_uuid
                        else None
                    ),
                )
            )
        return beans

    # ------------------------------------------------------------------ lectures

    def get_all_for_user(self, user_uuid: str) -> List[ConversationBean]:
        entities = list(
            _annotate_last_message(
                ConversationEntity.objects.filter(
                    uuid__in=ConversationMemberEntity.objects.filter(
                        member_id=user_uuid
                    ).values("conversation_id")
                )
            ).order_by(F("last_message_at").desc(nulls_last=True), "-created_at")
        )
        return self._hydrate(entities, user_uuid)

    def get_by_uuid(
        self, uuid: str, for_user_uuid: Optional[str] = None
    ) -> Optional[ConversationBean]:
        try:
            entity = _annotate_last_message(
                ConversationEntity.objects.filter(uuid=uuid)
            ).get()
        except (ConversationEntity.DoesNotExist, ValidationError, ValueError):
            return None
        return self._hydrate([entity], for_user_uuid)[0]

    def find_direct(
        self, direct_key: str, for_user_uuid: Optional[str] = None
    ) -> Optional[ConversationBean]:
        try:
            entity = _annotate_last_message(
                ConversationEntity.objects.filter(direct_key=direct_key)
            ).get()
        except (ConversationEntity.DoesNotExist, ValidationError, ValueError):
            return None
        return self._hydrate([entity], for_user_uuid)[0]

    def is_member(self, conversation_uuid: str, user_uuid: str) -> bool:
        try:
            return ConversationMemberEntity.objects.filter(
                conversation_id=conversation_uuid, member_id=user_uuid
            ).exists()
        except (ValidationError, ValueError):
            return False

    # ------------------------------------------------------------------ écritures

    @transaction.atomic
    def create(
        self, bean: ConversationBean, member_uuids: List[str]
    ) -> ConversationBean:
        entity = conversation_bean_to_entity(bean)
        try:
            # Point de sauvegarde interne : sur PostgreSQL, il préserve la
            # transaction de la requête HTTP si l'insertion viole direct_key.
            with transaction.atomic():
                entity.save()
                ConversationMemberEntity.objects.bulk_create(
                    ConversationMemberEntity(
                        conversation_id=entity.uuid, member_id=member_uuid
                    )
                    for member_uuid in member_uuids
                )
        except IntegrityError as exc:
            if bean.direct_key:
                raise ConflictException("direct_key", bean.direct_key) from exc
            raise
        return self.get_by_uuid(str(entity.uuid), for_user_uuid=bean.owner_uuid)  # type: ignore[return-value]

    @transaction.atomic
    def update(
        self, bean: ConversationBean, for_user_uuid: Optional[str] = None
    ) -> ConversationBean:
        entity = ConversationEntity.objects.get(uuid=bean.uuid)
        conversation_update_entity_from_bean(entity, bean)
        # update_fields : ne pas réécrire last_message_at (dénormalisé par
        # MessageRepository.create) avec une valeur lue avant un message
        # concurrent — perte de mise à jour possible sous PostgreSQL sinon.
        entity.save(update_fields=["name", "owner", "updated_at"])
        return self.get_by_uuid(str(entity.uuid), for_user_uuid=for_user_uuid)  # type: ignore[return-value]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = ConversationEntity.objects.get(uuid=uuid)
        except (ConversationEntity.DoesNotExist, ValidationError, ValueError):
            return False
        # La cascade SQL n'appelle pas `MessageAttachmentEntity.delete()` :
        # les fichiers des pièces jointes sont effacés explicitement.
        stored_names = list(
            MessageAttachmentEntity.objects.filter(
                message__conversation_id=entity.uuid
            ).values_list("file", flat=True)
        )
        entity.delete()
        delete_stored_files(stored_names)
        return True

    @transaction.atomic
    def add_members(self, conversation_uuid: str, member_uuids: List[str]) -> None:
        # ignore_conflicts : une adhésion déjà existante est laissée intacte
        # (son joined_at et son curseur de lecture sont préservés).
        ConversationMemberEntity.objects.bulk_create(
            (
                ConversationMemberEntity(
                    conversation_id=conversation_uuid, member_id=member_uuid
                )
                for member_uuid in member_uuids
            ),
            ignore_conflicts=True,
        )

    @transaction.atomic
    def remove_member(self, conversation_uuid: str, member_uuid: str) -> bool:
        deleted, _ = ConversationMemberEntity.objects.filter(
            conversation_id=conversation_uuid, member_id=member_uuid
        ).delete()
        return deleted > 0

    @transaction.atomic
    def mark_read(
        self, conversation_uuid: str, member_uuid: str, read_at: datetime
    ) -> bool:
        try:
            memberships = ConversationMemberEntity.objects.filter(
                conversation_id=conversation_uuid, member_id=member_uuid
            )
            if not memberships.exists():
                return False
            memberships.filter(
                Q(last_read_at__isnull=True) | Q(last_read_at__lt=read_at)
            ).update(last_read_at=read_at)
        except (ValidationError, ValueError):
            return False
        return True

    # ------------------------------------------------------------------ annuaire

    def active_user_uuids(self, user_uuids: List[str]) -> List[str]:
        found = UserProfileEntity.objects.filter(
            uuid__in=user_uuids, user__is_active=True
        ).values_list("uuid", flat=True)
        return [str(profile_uuid) for profile_uuid in found]

    def total_unread_for_user(self, user_uuid: str) -> int:
        # count() sur le queryset FILTRÉ (jamais sur un queryset groupé, qui
        # compterait les conversations et non les messages).
        return self._unread_qs(user_uuid).count()
