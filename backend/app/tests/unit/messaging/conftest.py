"""Fixtures des tests unitaires du module Messagerie interne."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from unittest.mock import create_autospec

import pytest

from app.domain.messaging.interface.conversation_repository import (
    IConversationRepository,
)
from app.domain.messaging.interface.entity_ref_resolver import IEntityRefResolver
from app.domain.messaging.interface.message_repository import IMessageRepository
from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    KIND_GROUP,
    MESSAGE_KIND_TEXT,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.entity_ref_bean import EntityRefTargetBean
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean

# UUID canoniques (minuscules, tirets) — le service canonicalise tout ce qu'il reçoit.
OWNER_UUID = "11111111-1111-4111-8111-111111111111"
MEMBER_UUID = "22222222-2222-4222-8222-222222222222"
OTHER_UUID = "33333333-3333-4333-8333-333333333333"
OUTSIDER_UUID = "44444444-4444-4444-8444-444444444444"
INACTIVE_UUID = "55555555-5555-4555-8555-555555555555"
CONV_UUID = "66666666-6666-4666-8666-666666666666"
DIRECT_UUID = "77777777-7777-4777-8777-777777777777"
MSG_UUID = "88888888-8888-4888-8888-888888888888"
OTHER_CONV_UUID = "99999999-9999-4999-8999-999999999999"

# Cibles de références d'entités (vague M3)
FSEC_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
CAMPAIGN_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
FA_UUID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
UNKNOWN_TARGET_UUID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

KNOWN_TARGETS = {
    ("fsec", FSEC_UUID): EntityRefTargetBean(
        "fsec", FSEC_UUID, "FSEC-12", "2026-s1-lmj-campagne-fsec-12"
    ),
    ("campaign", CAMPAIGN_UUID): EntityRefTargetBean(
        "campaign", CAMPAIGN_UUID, "Campagne", "2026-s1-lmj-campagne"
    ),
    ("fa", FA_UUID): EntityRefTargetBean("fa", FA_UUID, "FA-2026-001", "fa-2026-001"),
}

BASE_TIME = datetime(2026, 8, 30, 10, 0, 0, tzinfo=timezone.utc)


def make_user_summary(
    user_uuid: str,
    username: str,
    first_name: str = "",
    last_name: str = "",
    is_active: bool = True,
) -> UserSummaryBean:
    """Construit une projection annuaire d'utilisateur."""
    return UserSummaryBean(
        uuid=user_uuid,
        username=username,
        first_name=first_name,
        last_name=last_name,
        avatar_url=None,
        is_active=is_active,
    )


def make_member(
    user_uuid: str,
    username: str,
    first_name: str = "",
    last_name: str = "",
    is_active: bool = True,
    joined_offset: int = 0,
    last_read_at: Optional[datetime] = None,
) -> ConversationMemberBean:
    """Construit une adhésion, `joined_offset` secondes après BASE_TIME."""
    return ConversationMemberBean(
        user=make_user_summary(user_uuid, username, first_name, last_name, is_active),
        joined_at=BASE_TIME + timedelta(seconds=joined_offset),
        last_read_at=last_read_at,
    )


def make_group_bean(
    members: List[ConversationMemberBean], owner_uuid: str = OWNER_UUID
) -> ConversationBean:
    """Construit une conversation de groupe avec les membres fournis (déjà triés)."""
    return ConversationBean(
        uuid=CONV_UUID,
        kind=KIND_GROUP,
        name="Campagne S2",
        owner_uuid=owner_uuid,
        direct_key=None,
        last_message_at=BASE_TIME,
        members=members,
        unread_count=0,
        created_at=BASE_TIME,
        updated_at=BASE_TIME,
    )


@pytest.fixture
def owner_member() -> ConversationMemberBean:
    """Le propriétaire, plus ancien membre du groupe."""
    return make_member(OWNER_UUID, "mdupont", "Marie", "Dupont", joined_offset=0)


@pytest.fixture
def sample_user_summary() -> UserSummaryBean:
    """Projection annuaire du propriétaire."""
    return make_user_summary(OWNER_UUID, "mdupont", "Marie", "Dupont")


@pytest.fixture
def sample_group_bean(owner_member) -> ConversationBean:
    """Groupe type : propriétaire + un membre, `members` triés (joined_at, uuid)."""
    return make_group_bean(
        [
            owner_member,
            make_member(MEMBER_UUID, "pmartin", "Paul", "Martin", joined_offset=60),
        ]
    )


@pytest.fixture
def sample_direct_bean(owner_member) -> ConversationBean:
    """Conversation privée type entre le propriétaire et le membre."""
    return ConversationBean(
        uuid=DIRECT_UUID,
        kind=KIND_DIRECT,
        name="",
        owner_uuid=OWNER_UUID,
        direct_key=":".join(sorted([OWNER_UUID, MEMBER_UUID])),
        last_message_at=None,
        members=[
            owner_member,
            make_member(MEMBER_UUID, "pmartin", "Paul", "Martin", joined_offset=0),
        ],
        unread_count=0,
        created_at=BASE_TIME,
        updated_at=BASE_TIME,
    )


@pytest.fixture
def sample_message_bean(sample_user_summary) -> MessageBean:
    """Message texte type, écrit par le propriétaire dans le groupe."""
    return MessageBean(
        uuid=MSG_UUID,
        conversation_uuid=CONV_UUID,
        author_uuid=OWNER_UUID,
        author=sample_user_summary,
        kind=MESSAGE_KIND_TEXT,
        body="Bonjour",
        created_at=BASE_TIME,
        updated_at=BASE_TIME,
    )


@pytest.fixture
def mock_conversation_repository(sample_group_bean):
    """Mock de IConversationRepository avec des défauts permissifs."""
    mock = create_autospec(IConversationRepository, instance=True)
    mock.get_all_for_user.return_value = [sample_group_bean]
    mock.get_by_uuid.return_value = sample_group_bean
    mock.find_direct.return_value = None
    mock.is_member.return_value = True
    mock.create.side_effect = lambda bean, member_uuids: bean
    mock.update.side_effect = lambda bean, for_user_uuid=None: bean
    mock.delete.return_value = True
    mock.add_members.return_value = None
    mock.remove_member.return_value = True
    mock.mark_read.return_value = True
    mock.active_user_uuids.side_effect = lambda user_uuids: list(user_uuids)
    mock.total_unread_for_user.return_value = 0
    return mock


@pytest.fixture
def mock_message_repository(sample_message_bean):
    """Mock de IMessageRepository avec des défauts permissifs."""
    mock = create_autospec(IMessageRepository, instance=True)
    mock.get_by_uuid.return_value = sample_message_bean
    mock.get_page.return_value = ([sample_message_bean], False, [])

    def _create(bean: MessageBean, attachments=()) -> MessageBean:
        bean.uuid = MSG_UUID
        return bean

    mock.create.side_effect = _create
    mock.update_body.side_effect = lambda message_uuid, body, edited_at: MessageBean(
        uuid=message_uuid, body=body, edited_at=edited_at, updated_at=edited_at
    )
    mock.soft_delete.side_effect = lambda message_uuid, deleted_at: MessageBean(
        uuid=message_uuid, body="", deleted_at=deleted_at, updated_at=deleted_at
    )
    mock.get_mentions.return_value = []
    mock.search.return_value = []
    return mock


@pytest.fixture
def mock_entity_ref_resolver():
    """Mock de IEntityRefResolver ne connaissant que les cibles de KNOWN_TARGETS."""
    mock = create_autospec(IEntityRefResolver, instance=True)
    mock.resolve.side_effect = lambda refs: {
        key: KNOWN_TARGETS[key] for key in refs if key in KNOWN_TARGETS
    }
    return mock
