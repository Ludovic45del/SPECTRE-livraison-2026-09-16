"""Tests unitaires des mappers du module Messagerie interne.

Les entités sont construites EN MÉMOIRE (aucun `save()`, aucune base) : ces
tests vérifient la conversion pure Entity ↔ Bean ↔ dict API, y compris le
garde-fou anti N+1 (l'auteur d'un message n'est hydraté que si la relation a
été préchargée).
"""

from datetime import datetime, timezone

import pytest
from django.contrib.auth.models import User

from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    KIND_GROUP,
    LAST_MESSAGE_PREVIEW_LENGTH,
    MESSAGE_KIND_SYSTEM,
    MESSAGE_KIND_TEXT,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.mapper.messaging.messaging_api_mapper import (
    conversation_api_to_bean,
    conversation_bean_to_api,
    conversation_beans_to_api,
    conversation_member_bean_to_api,
    message_api_to_bean,
    message_bean_to_api,
    message_beans_to_api,
    message_preview_bean_to_api,
    user_summary_bean_to_api,
)
from app.mapper.messaging.messaging_mapper import (
    conversation_bean_to_entity,
    conversation_entity_to_bean,
    conversation_member_entity_to_bean,
    conversation_update_entity_from_bean,
    message_bean_to_entity,
    message_entity_to_bean,
    user_summary_from_profile,
)
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.conversation_member_entity import (
    ConversationMemberEntity,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.user.models.user_profile_entity import UserProfileEntity

OWNER_UUID = "11111111-1111-4111-8111-111111111111"
MEMBER_UUID = "22222222-2222-4222-8222-222222222222"
CONV_UUID = "66666666-6666-4666-8666-666666666666"
MSG_UUID = "88888888-8888-4888-8888-888888888888"
NOW = datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc)
LATER = datetime(2026, 8, 30, 11, 0, tzinfo=timezone.utc)


def make_profile(
    profile_uuid: str = OWNER_UUID,
    username: str = "mdupont",
    first_name: str = "Marie",
    last_name: str = "Dupont",
    is_active: bool = True,
    avatar: str = "",
) -> UserProfileEntity:
    """Profil non sauvegardé, avec son compte Django associé."""
    user = User(
        username=username,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
    )
    profile = UserProfileEntity(user=user, uuid=profile_uuid, roles=["iec"])
    if avatar:
        profile.avatar = avatar
    return profile


def make_conversation_entity(kind: str = KIND_GROUP) -> ConversationEntity:
    """Conversation non sauvegardée, horodatée manuellement."""
    entity = ConversationEntity(
        uuid=CONV_UUID,
        kind=kind,
        name="Campagne S2",
        owner_id=OWNER_UUID,
        direct_key=None,
        last_message_at=LATER,
    )
    entity.created_at = NOW
    entity.updated_at = LATER
    return entity


# ─────────────────────────────────────────────────────────────────────────────
# UserSummary (Profile → Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestUserSummaryMapper:
    def test_projection_complete(self):
        bean = user_summary_from_profile(make_profile())

        assert bean.uuid == OWNER_UUID
        assert bean.username == "mdupont"
        assert bean.first_name == "Marie"
        assert bean.last_name == "Dupont"
        assert bean.is_active is True

    def test_avatar_vide_donne_none(self):
        assert user_summary_from_profile(make_profile()).avatar_url is None

    def test_avatar_renseigne_donne_une_url(self):
        profile = make_profile(avatar="users/avatars/x.jpg")

        assert user_summary_from_profile(profile).avatar_url.endswith(
            "users/avatars/x.jpg"
        )

    def test_compte_desactive(self):
        bean = user_summary_from_profile(make_profile(is_active=False))

        assert bean.is_active is False

    def test_noms_absents_deviennent_des_chaines_vides(self):
        profile = make_profile(first_name="", last_name="")

        bean = user_summary_from_profile(profile)

        assert bean.first_name == ""
        assert bean.last_name == ""


# ─────────────────────────────────────────────────────────────────────────────
# ConversationMember (Entity → Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestConversationMemberMapper:
    def test_entity_to_bean(self):
        entity = ConversationMemberEntity(
            conversation_id=CONV_UUID,
            member=make_profile(),
            last_read_at=LATER,
        )
        entity.joined_at = NOW

        bean = conversation_member_entity_to_bean(entity)

        assert bean.user.uuid == OWNER_UUID
        assert bean.user.username == "mdupont"
        assert bean.joined_at == NOW
        assert bean.last_read_at == LATER

    def test_last_read_at_null(self):
        entity = ConversationMemberEntity(
            conversation_id=CONV_UUID, member=make_profile()
        )
        entity.joined_at = NOW

        assert conversation_member_entity_to_bean(entity).last_read_at is None


# ─────────────────────────────────────────────────────────────────────────────
# Message (Entity ↔ Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestMessageMapper:
    def _entity(self, **kwargs) -> MessageEntity:
        entity = MessageEntity(
            uuid=MSG_UUID,
            conversation=make_conversation_entity(),
            kind=MESSAGE_KIND_TEXT,
            body="Bonjour",
            **kwargs,
        )
        entity.created_at = NOW
        entity.updated_at = LATER
        return entity

    def test_entity_to_bean_avec_auteur_precharge(self):
        bean = message_entity_to_bean(self._entity(author=make_profile()))

        assert bean.uuid == MSG_UUID
        assert bean.conversation_uuid == CONV_UUID
        assert bean.author_uuid == OWNER_UUID
        assert bean.author is not None
        assert bean.author.username == "mdupont"
        assert bean.kind == MESSAGE_KIND_TEXT
        assert bean.body == "Bonjour"
        assert bean.created_at == NOW
        assert bean.updated_at == LATER

    def test_entity_to_bean_sans_auteur(self):
        bean = message_entity_to_bean(self._entity())

        assert bean.author_uuid is None
        assert bean.author is None

    def test_entity_to_bean_n_hydrate_pas_un_auteur_non_precharge(self):
        # Anti N+1 : sans select_related, l'auteur reste None (aucune requête).
        entity = self._entity()
        entity.author_id = OWNER_UUID

        bean = message_entity_to_bean(entity)

        assert bean.author_uuid == OWNER_UUID
        assert bean.author is None

    def test_bean_to_entity(self):
        bean = MessageBean(
            uuid=MSG_UUID,
            conversation_uuid=CONV_UUID,
            author_uuid=OWNER_UUID,
            kind=MESSAGE_KIND_SYSTEM,
            body="Marie Dupont a renommé le groupe",
        )

        entity = message_bean_to_entity(bean)

        assert str(entity.uuid) == MSG_UUID
        assert str(entity.conversation_id) == CONV_UUID
        assert str(entity.author_id) == OWNER_UUID
        assert entity.kind == MESSAGE_KIND_SYSTEM
        assert entity.body == "Marie Dupont a renommé le groupe"

    def test_bean_to_entity_sans_uuid_conserve_le_defaut(self):
        entity = message_bean_to_entity(
            MessageBean(conversation_uuid=CONV_UUID, body="x")
        )

        assert entity.uuid is not None
        assert entity.author_id is None

    def test_aller_retour_bean_entity(self):
        bean = MessageBean(
            uuid=MSG_UUID,
            conversation_uuid=CONV_UUID,
            author_uuid=None,
            kind=MESSAGE_KIND_TEXT,
            body="Aller-retour",
        )

        entity = message_bean_to_entity(bean)
        entity.created_at = NOW
        entity.updated_at = NOW
        result = message_entity_to_bean(entity)

        assert result.uuid == bean.uuid
        assert result.conversation_uuid == bean.conversation_uuid
        assert result.author_uuid is None
        assert result.kind == bean.kind
        assert result.body == bean.body


# ─────────────────────────────────────────────────────────────────────────────
# Conversation (Entity ↔ Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestConversationMapper:
    def test_entity_to_bean_sans_agregats(self):
        bean = conversation_entity_to_bean(make_conversation_entity())

        assert bean.uuid == CONV_UUID
        assert bean.kind == KIND_GROUP
        assert bean.name == "Campagne S2"
        assert bean.owner_uuid == OWNER_UUID
        assert bean.direct_key is None
        assert bean.last_message_at == LATER
        assert bean.members == []
        assert bean.unread_count == 0
        assert bean.last_message is None
        assert bean.created_at == NOW
        assert bean.updated_at == LATER

    def test_entity_to_bean_avec_agregats(self):
        member = ConversationMemberBean(
            user=UserSummaryBean(uuid=MEMBER_UUID, username="jmartin"),
            joined_at=NOW,
        )
        last_message = MessageBean(uuid=MSG_UUID, body="Dernier")

        bean = conversation_entity_to_bean(
            make_conversation_entity(),
            members=[member],
            unread_count=3,
            last_message=last_message,
        )

        assert bean.member_uuids == [MEMBER_UUID]
        assert bean.unread_count == 3
        assert bean.last_message is last_message

    def test_bean_to_entity(self):
        bean = ConversationBean(
            uuid=CONV_UUID,
            kind=KIND_DIRECT,
            name="",
            owner_uuid=OWNER_UUID,
            direct_key=f"{MEMBER_UUID}:{OWNER_UUID}",
        )

        entity = conversation_bean_to_entity(bean)

        assert str(entity.uuid) == CONV_UUID
        assert entity.kind == KIND_DIRECT
        assert entity.name == ""
        assert str(entity.owner_id) == OWNER_UUID
        assert entity.direct_key == f"{MEMBER_UUID}:{OWNER_UUID}"
        assert entity.last_message_at is None

    def test_bean_to_entity_sans_uuid_conserve_le_defaut(self):
        entity = conversation_bean_to_entity(
            ConversationBean(kind=KIND_GROUP, name="Nouveau", owner_uuid=OWNER_UUID)
        )

        assert entity.uuid is not None
        assert entity.name == "Nouveau"

    def test_update_entity_from_bean(self):
        entity = make_conversation_entity()
        bean = conversation_entity_to_bean(entity)
        bean.name = "Campagne S3"
        bean.owner_uuid = MEMBER_UUID

        conversation_update_entity_from_bean(entity, bean)

        assert entity.name == "Campagne S3"
        assert entity.owner_id == MEMBER_UUID
        # Les autres champs ne sont pas touchés par une mise à jour.
        assert entity.kind == KIND_GROUP
        assert entity.direct_key is None


# ─────────────────────────────────────────────────────────────────────────────
# Mapper API (Bean ↔ dict)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestMessagingApiMapper:
    def test_conversation_api_to_bean(self):
        bean = conversation_api_to_bean({"kind": KIND_GROUP, "name": "Campagne S2"})

        assert bean.kind == KIND_GROUP
        assert bean.name == "Campagne S2"

    def test_conversation_api_to_bean_valeurs_par_defaut(self):
        bean = conversation_api_to_bean({})

        assert bean.kind == KIND_DIRECT
        assert bean.name == ""

    def test_message_api_to_bean(self):
        assert message_api_to_bean({"body": "Bonjour"}).body == "Bonjour"
        assert message_api_to_bean({}).body == ""

    def test_user_summary_bean_to_api(self):
        data = user_summary_bean_to_api(
            UserSummaryBean(
                uuid=OWNER_UUID,
                username="mdupont",
                first_name="Marie",
                last_name="Dupont",
                avatar_url="/api/media/users/avatars/x.jpg",
            )
        )

        assert data == {
            "uuid": OWNER_UUID,
            "username": "mdupont",
            "first_name": "Marie",
            "last_name": "Dupont",
            "avatar_url": "/api/media/users/avatars/x.jpg",
            "is_active": True,
        }

    def test_conversation_member_bean_to_api_est_aplati(self):
        data = conversation_member_bean_to_api(
            ConversationMemberBean(
                user=UserSummaryBean(uuid=MEMBER_UUID, username="jmartin"),
                joined_at=NOW,
                last_read_at=None,
            )
        )

        assert data["uuid"] == MEMBER_UUID
        assert data["username"] == "jmartin"
        assert data["joined_at"] == NOW.isoformat()
        assert data["last_read_at"] is None

    def test_message_bean_to_api_avec_auteur(self):
        bean = MessageBean(
            uuid=MSG_UUID,
            conversation_uuid=CONV_UUID,
            author_uuid=OWNER_UUID,
            author=UserSummaryBean(uuid=OWNER_UUID, username="mdupont"),
            kind=MESSAGE_KIND_TEXT,
            body="Bonjour",
            created_at=NOW,
            updated_at=LATER,
        )

        data = message_bean_to_api(bean)

        assert data["author"]["username"] == "mdupont"
        assert data["created_at"] == NOW.isoformat()
        assert data["updated_at"] == LATER.isoformat()
        assert data["kind"] == MESSAGE_KIND_TEXT

    def test_message_bean_to_api_sans_auteur(self):
        data = message_bean_to_api(MessageBean(uuid=MSG_UUID, body="Orphelin"))

        assert data["author"] is None
        assert data["author_uuid"] is None
        assert data["created_at"] is None
        assert data["updated_at"] is None

    def test_message_beans_to_api(self):
        data = message_beans_to_api(
            [MessageBean(uuid=MSG_UUID, body="a"), MessageBean(body="b")]
        )

        assert [item["body"] for item in data] == ["a", "b"]

    def test_message_preview_tronque_le_corps(self):
        long_body = "x" * (LAST_MESSAGE_PREVIEW_LENGTH + 50)

        data = message_preview_bean_to_api(
            MessageBean(uuid=MSG_UUID, body=long_body, created_at=NOW)
        )

        assert data["body"] == "x" * LAST_MESSAGE_PREVIEW_LENGTH + "…"
        assert len(data["body"]) == LAST_MESSAGE_PREVIEW_LENGTH + 1
        assert data["created_at"] == NOW.isoformat()
        assert "conversation_uuid" not in data

    def test_message_preview_corps_court_intact(self):
        data = message_preview_bean_to_api(MessageBean(body="Court"))

        assert data["body"] == "Court"

    def test_conversation_bean_to_api(self):
        bean = ConversationBean(
            uuid=CONV_UUID,
            kind=KIND_GROUP,
            name="Campagne S2",
            owner_uuid=OWNER_UUID,
            direct_key=None,
            last_message_at=LATER,
            members=[
                ConversationMemberBean(
                    user=UserSummaryBean(uuid=OWNER_UUID, username="mdupont"),
                    joined_at=NOW,
                    last_read_at=LATER,
                )
            ],
            unread_count=3,
            last_message=MessageBean(
                uuid=MSG_UUID,
                author_uuid=OWNER_UUID,
                kind=MESSAGE_KIND_SYSTEM,
                body="Marie Dupont a renommé le groupe",
                created_at=LATER,
            ),
            created_at=NOW,
            updated_at=LATER,
        )

        data = conversation_bean_to_api(bean)

        assert data["uuid"] == CONV_UUID
        assert data["kind"] == KIND_GROUP
        assert data["name"] == "Campagne S2"
        assert data["owner_uuid"] == OWNER_UUID
        assert data["last_message_at"] == LATER.isoformat()
        assert data["unread_count"] == 3
        assert data["members"][0]["username"] == "mdupont"
        assert data["members"][0]["last_read_at"] == LATER.isoformat()
        assert data["last_message"]["kind"] == MESSAGE_KIND_SYSTEM
        # La clé technique d'unicité des conversations privées n'est pas exposée.
        assert "direct_key" not in data

    def test_conversation_bean_to_api_sans_dernier_message(self):
        data = conversation_bean_to_api(
            ConversationBean(uuid=CONV_UUID, kind=KIND_DIRECT, owner_uuid=OWNER_UUID)
        )

        assert data["last_message"] is None
        assert data["last_message_at"] is None
        assert data["members"] == []
        assert data["unread_count"] == 0

    def test_conversation_beans_to_api(self):
        data = conversation_beans_to_api(
            [
                ConversationBean(uuid=CONV_UUID, name="A"),
                ConversationBean(uuid=MSG_UUID, name="B"),
            ]
        )

        assert [item["name"] for item in data] == ["A", "B"]
