"""Tests unitaires du service Conversations (messagerie interne)."""

import uuid as uuid_lib
from datetime import datetime, timezone

import pytest

from app.domain.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    KIND_GROUP,
    MAX_CONVERSATION_NAME_LENGTH,
    MAX_MEMBERS_PER_CONVERSATION,
    MESSAGE_KIND_SYSTEM,
)
from app.domain.messaging.models.conversation_bean import ConversationBean
from app.domain.messaging.services import conversation_service
from app.tests.unit.messaging.conftest import (
    CONV_UUID,
    INACTIVE_UUID,
    MEMBER_UUID,
    OTHER_UUID,
    OUTSIDER_UUID,
    OWNER_UUID,
    make_group_bean,
    make_member,
)


def _direct_payload() -> ConversationBean:
    return ConversationBean(kind=KIND_DIRECT)


def _group_payload(name: str = "Campagne S2") -> ConversationBean:
    return ConversationBean(kind=KIND_GROUP, name=name)


def _system_bodies(mock_message_repository):
    """Corps des messages système écrits pendant le test."""
    return [call.args[0].body for call in mock_message_repository.create.call_args_list]


@pytest.mark.unit
class TestGetConversations:
    def test_delegates_to_repository(
        self, mock_conversation_repository, sample_group_bean
    ):
        result = conversation_service.get_conversations(
            mock_conversation_repository, OWNER_UUID
        )
        assert result == [sample_group_bean]
        mock_conversation_repository.get_all_for_user.assert_called_once_with(
            OWNER_UUID
        )

    def test_rejects_malformed_requester(self, mock_conversation_repository):
        with pytest.raises(ValidationException) as exc:
            conversation_service.get_conversations(
                mock_conversation_repository, "pas-un-uuid"
            )
        assert exc.value.field == "requester_uuid"
        mock_conversation_repository.get_all_for_user.assert_not_called()


@pytest.mark.unit
class TestGetConversation:
    def test_member_can_access(self, mock_conversation_repository, sample_group_bean):
        result = conversation_service.get_conversation(
            mock_conversation_repository, MEMBER_UUID, CONV_UUID
        )
        assert result == sample_group_bean
        mock_conversation_repository.get_by_uuid.assert_called_once_with(
            CONV_UUID, for_user_uuid=MEMBER_UUID
        )

    def test_outsider_gets_not_found(self, mock_conversation_repository):
        with pytest.raises(NotFoundException):
            conversation_service.get_conversation(
                mock_conversation_repository, OUTSIDER_UUID, CONV_UUID
            )

    def test_unknown_conversation_gets_not_found(self, mock_conversation_repository):
        mock_conversation_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            conversation_service.get_conversation(
                mock_conversation_repository, OWNER_UUID, CONV_UUID
            )


@pytest.mark.unit
class TestCreateDirectConversation:
    def test_creates_new_direct(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean, created = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            _direct_payload(),
            [MEMBER_UUID],
        )
        assert created is True
        assert bean.kind == KIND_DIRECT
        assert bean.name == ""
        assert bean.owner_uuid == OWNER_UUID
        assert bean.direct_key == ":".join(sorted([OWNER_UUID, MEMBER_UUID]))
        mock_conversation_repository.create.assert_called_once()
        assert mock_conversation_repository.create.call_args.args[1] == [
            OWNER_UUID,
            MEMBER_UUID,
        ]

    def test_existing_direct_is_returned_without_creation(
        self, mock_conversation_repository, mock_message_repository, sample_direct_bean
    ):
        mock_conversation_repository.find_direct.return_value = sample_direct_bean
        bean, created = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            _direct_payload(),
            [MEMBER_UUID],
        )
        assert created is False
        assert bean is sample_direct_bean
        mock_conversation_repository.create.assert_not_called()

    def test_uppercase_uuid_yields_same_direct_key(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean, _ = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID.upper(),
            _direct_payload(),
            [MEMBER_UUID.upper()],
        )
        assert bean.direct_key == ":".join(sorted([OWNER_UUID, MEMBER_UUID]))
        assert bean.owner_uuid == OWNER_UUID

    def test_direct_with_self_only_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _direct_payload(),
                [OWNER_UUID],
            )
        assert exc.value.field == "member_uuids"

    def test_direct_with_two_others_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _direct_payload(),
                [MEMBER_UUID, OTHER_UUID],
            )
        assert exc.value.field == "member_uuids"

    def test_unknown_or_inactive_member_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.active_user_uuids.side_effect = None
        mock_conversation_repository.active_user_uuids.return_value = []
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _direct_payload(),
                [INACTIVE_UUID],
            )
        assert exc.value.field == "member_uuids"
        mock_conversation_repository.create.assert_not_called()

    def test_malformed_member_uuid_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _direct_payload(),
                ["pas-un-uuid"],
            )
        assert exc.value.field == "member_uuids"

    def test_conflict_falls_back_to_existing_direct(
        self, mock_conversation_repository, mock_message_repository, sample_direct_bean
    ):
        mock_conversation_repository.find_direct.side_effect = [
            None,
            sample_direct_bean,
        ]
        mock_conversation_repository.create.side_effect = ConflictException(
            "direct_key", "clé"
        )
        bean, created = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            _direct_payload(),
            [MEMBER_UUID],
        )
        assert created is False
        assert bean is sample_direct_bean
        assert mock_conversation_repository.find_direct.call_count == 2

    def test_conflict_without_existing_direct_is_reraised(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.create.side_effect = ConflictException(
            "direct_key", "clé"
        )
        with pytest.raises(ConflictException):
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _direct_payload(),
                [MEMBER_UUID],
            )

    def test_unknown_kind_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                ConversationBean(kind="broadcast"),
                [],
            )
        assert exc.value.field == "kind"


@pytest.mark.unit
class TestCreateGroupConversation:
    def test_creates_group_with_requester_first(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean, created = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            _group_payload("  Campagne S2  "),
            [MEMBER_UUID, MEMBER_UUID, OWNER_UUID, OTHER_UUID],
        )
        assert created is True
        assert bean.name == "Campagne S2"
        assert bean.direct_key is None
        assert bean.owner_uuid == OWNER_UUID
        assert mock_conversation_repository.create.call_args.args[1] == [
            OWNER_UUID,
            MEMBER_UUID,
            OTHER_UUID,
        ]
        mock_conversation_repository.find_direct.assert_not_called()

    def test_group_without_other_member_is_allowed(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean, created = conversation_service.create_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            _group_payload(),
            [],
        )
        assert created is True
        assert mock_conversation_repository.create.call_args.args[1] == [OWNER_UUID]

    def test_group_name_is_required(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _group_payload("   "),
                [],
            )
        assert exc.value.field == "name"

    def test_group_name_too_long_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        payload = _group_payload("x" * (MAX_CONVERSATION_NAME_LENGTH + 1))
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                payload,
                [],
            )
        assert exc.value.field == "name"

    def test_group_conflict_is_reraised_without_direct_lookup(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.create.side_effect = ConflictException(
            "name", "Campagne S2"
        )
        with pytest.raises(ConflictException):
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _group_payload(),
                [],
            )
        mock_conversation_repository.find_direct.assert_not_called()

    def test_member_cap_is_enforced(
        self, mock_conversation_repository, mock_message_repository
    ):
        others = [
            str(uuid_lib.UUID(int=index))
            for index in range(1, MAX_MEMBERS_PER_CONVERSATION + 1)
        ]
        with pytest.raises(ValidationException) as exc:
            conversation_service.create_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                _group_payload(),
                others,
            )
        assert exc.value.field == "member_uuids"
        mock_conversation_repository.create.assert_not_called()


@pytest.mark.unit
class TestRenameConversation:
    def test_owner_renames_and_posts_system_message(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        result = conversation_service.rename_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "  Campagne S3  ",
        )
        assert result is sample_group_bean
        mock_conversation_repository.update.assert_called_once()
        assert (
            mock_conversation_repository.update.call_args.args[0].name == "Campagne S3"
        )
        assert mock_conversation_repository.update.call_args.kwargs == {
            "for_user_uuid": OWNER_UUID
        }
        message = mock_message_repository.create.call_args.args[0]
        assert message.kind == MESSAGE_KIND_SYSTEM
        assert message.author_uuid == OWNER_UUID
        assert message.body == "Marie Dupont a renommé le groupe en « Campagne S3 »"

    def test_identical_name_does_not_post_message(
        self, mock_conversation_repository, mock_message_repository
    ):
        conversation_service.rename_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "Campagne S2",
        )
        mock_conversation_repository.update.assert_not_called()
        mock_message_repository.create.assert_not_called()

    def test_non_owner_is_forbidden(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ForbiddenException):
            conversation_service.rename_conversation(
                mock_conversation_repository,
                mock_message_repository,
                MEMBER_UUID,
                CONV_UUID,
                "Autre",
            )
        mock_conversation_repository.update.assert_not_called()

    def test_direct_conversation_cannot_be_renamed(
        self, mock_conversation_repository, mock_message_repository, sample_direct_bean
    ):
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        with pytest.raises(ValidationException) as exc:
            conversation_service.rename_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "Autre",
            )
        assert exc.value.field == "kind"

    def test_empty_name_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.rename_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "  ",
            )
        assert exc.value.field == "name"

    def test_outsider_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(NotFoundException):
            conversation_service.rename_conversation(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                "Autre",
            )

    def test_username_is_used_when_no_full_name(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean = make_group_bean(
            [make_member(OWNER_UUID, "mdupont"), make_member(MEMBER_UUID, "pmartin")]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        conversation_service.rename_conversation(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "Campagne S3",
        )
        assert _system_bodies(mock_message_repository) == [
            "mdupont a renommé le groupe en « Campagne S3 »"
        ]


@pytest.mark.unit
class TestDeleteConversation:
    def test_owner_deletes_group(self, mock_conversation_repository):
        conversation_service.delete_conversation(
            mock_conversation_repository, OWNER_UUID, CONV_UUID
        )
        mock_conversation_repository.delete.assert_called_once_with(CONV_UUID)

    def test_non_owner_is_forbidden(self, mock_conversation_repository):
        with pytest.raises(ForbiddenException):
            conversation_service.delete_conversation(
                mock_conversation_repository, MEMBER_UUID, CONV_UUID
            )
        mock_conversation_repository.delete.assert_not_called()

    def test_direct_conversation_cannot_be_deleted(
        self, mock_conversation_repository, sample_direct_bean
    ):
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        with pytest.raises(ValidationException) as exc:
            conversation_service.delete_conversation(
                mock_conversation_repository, OWNER_UUID, CONV_UUID
            )
        assert exc.value.field == "kind"
        mock_conversation_repository.delete.assert_not_called()

    def test_outsider_gets_not_found(self, mock_conversation_repository):
        with pytest.raises(NotFoundException):
            conversation_service.delete_conversation(
                mock_conversation_repository, OUTSIDER_UUID, CONV_UUID
            )


@pytest.mark.unit
class TestAddMembers:
    def test_any_member_can_invite_and_message_comes_after_add(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        refreshed = make_group_bean(
            sample_group_bean.members
            + [make_member(OTHER_UUID, "lbernard", "Luc", "Bernard", joined_offset=120)]
        )
        mock_conversation_repository.get_by_uuid.side_effect = [
            sample_group_bean,
            refreshed,
            refreshed,
        ]
        order = []
        mock_conversation_repository.add_members.side_effect = (
            lambda conversation_uuid, member_uuids: order.append("add_members")
        )

        def _create(bean):
            order.append("system_message")
            return bean

        mock_message_repository.create.side_effect = _create

        result = conversation_service.add_members(
            mock_conversation_repository,
            mock_message_repository,
            MEMBER_UUID,
            CONV_UUID,
            [OTHER_UUID],
        )
        assert result is refreshed
        assert order == ["add_members", "system_message"]
        mock_conversation_repository.add_members.assert_called_once_with(
            CONV_UUID, [OTHER_UUID]
        )
        assert _system_bodies(mock_message_repository) == [
            "Paul Martin a ajouté Luc Bernard"
        ]

    def test_existing_member_raises_conflict(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ConflictException) as exc:
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                [MEMBER_UUID],
            )
        assert exc.value.field == "member"
        mock_conversation_repository.add_members.assert_not_called()

    def test_empty_list_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                [OWNER_UUID],
            )
        assert exc.value.field == "member_uuids"
        mock_conversation_repository.add_members.assert_not_called()

    def test_inactive_member_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.active_user_uuids.side_effect = None
        mock_conversation_repository.active_user_uuids.return_value = []
        with pytest.raises(ValidationException) as exc:
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                [INACTIVE_UUID],
            )
        assert exc.value.field == "member_uuids"

    def test_member_cap_is_enforced(
        self, mock_conversation_repository, mock_message_repository
    ):
        newcomers = [
            str(uuid_lib.UUID(int=index))
            for index in range(1, MAX_MEMBERS_PER_CONVERSATION)
        ]
        with pytest.raises(ValidationException) as exc:
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                newcomers,
            )
        assert exc.value.field == "member_uuids"
        mock_conversation_repository.add_members.assert_not_called()

    def test_direct_conversation_refuses_members(
        self, mock_conversation_repository, mock_message_repository, sample_direct_bean
    ):
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        with pytest.raises(ValidationException) as exc:
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                [OTHER_UUID],
            )
        assert exc.value.field == "kind"

    def test_outsider_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(NotFoundException):
            conversation_service.add_members(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                [OTHER_UUID],
            )

    def test_unknown_newcomer_name_falls_back_to_uuid(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        # La relecture ne contient pas encore le nouveau membre : repli sur son uuid.
        mock_conversation_repository.get_by_uuid.side_effect = [
            sample_group_bean,
            sample_group_bean,
            sample_group_bean,
        ]
        conversation_service.add_members(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            [OTHER_UUID],
        )
        assert _system_bodies(mock_message_repository) == [
            f"Marie Dupont a ajouté {OTHER_UUID}"
        ]

    def test_unreadable_refresh_falls_back_to_uuid(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        mock_conversation_repository.get_by_uuid.side_effect = [
            sample_group_bean,
            None,
            None,
        ]
        result = conversation_service.add_members(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            [OTHER_UUID],
        )
        assert result is None
        assert _system_bodies(mock_message_repository) == [
            f"Marie Dupont a ajouté {OTHER_UUID}"
        ]


@pytest.mark.unit
class TestRemoveMember:
    def test_owner_removes_third_party(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        bean = make_group_bean(
            sample_group_bean.members
            + [make_member(OTHER_UUID, "lbernard", "Luc", "Bernard", joined_offset=120)]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        result = conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            OTHER_UUID,
        )
        assert result is bean
        mock_conversation_repository.remove_member.assert_called_once_with(
            CONV_UUID, OTHER_UUID
        )
        assert _system_bodies(mock_message_repository) == [
            "Marie Dupont a retiré Luc Bernard"
        ]

    def test_system_message_is_written_before_removal(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        order = []
        mock_conversation_repository.remove_member.side_effect = (
            lambda conversation_uuid, member_uuid: order.append("remove_member")
        )

        def _create(bean):
            order.append("system_message")
            return bean

        mock_message_repository.create.side_effect = _create
        conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            MEMBER_UUID,
        )
        assert order == ["system_message", "remove_member"]

    def test_member_leaves_returns_none(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            MEMBER_UUID,
            CONV_UUID,
            MEMBER_UUID,
        )
        assert result is None
        assert _system_bodies(mock_message_repository) == [
            "Paul Martin a quitté le groupe"
        ]
        mock_conversation_repository.remove_member.assert_called_once_with(
            CONV_UUID, MEMBER_UUID
        )

    def test_third_party_cannot_remove_another_member(
        self, mock_conversation_repository, mock_message_repository, sample_group_bean
    ):
        bean = make_group_bean(
            sample_group_bean.members
            + [make_member(OTHER_UUID, "lbernard", "Luc", "Bernard", joined_offset=120)]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        with pytest.raises(ForbiddenException):
            conversation_service.remove_member(
                mock_conversation_repository,
                mock_message_repository,
                MEMBER_UUID,
                CONV_UUID,
                OTHER_UUID,
            )
        mock_conversation_repository.remove_member.assert_not_called()

    def test_non_member_target_raises_not_found_without_repository_call(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(NotFoundException):
            conversation_service.remove_member(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                OUTSIDER_UUID,
            )
        mock_conversation_repository.remove_member.assert_not_called()
        mock_conversation_repository.delete.assert_not_called()
        mock_message_repository.create.assert_not_called()

    def test_malformed_member_uuid_raises_validation_without_repository_call(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            conversation_service.remove_member(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "pas-un-uuid",
            )
        assert exc.value.field == "member_uuid"
        mock_conversation_repository.remove_member.assert_not_called()
        mock_message_repository.create.assert_not_called()

    def test_direct_conversation_refuses_removal(
        self, mock_conversation_repository, mock_message_repository, sample_direct_bean
    ):
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        with pytest.raises(ValidationException) as exc:
            conversation_service.remove_member(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                MEMBER_UUID,
            )
        assert exc.value.field == "kind"

    def test_owner_departure_transfers_to_oldest_active_member(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean = make_group_bean(
            [
                make_member(OWNER_UUID, "mdupont", "Marie", "Dupont", joined_offset=0),
                make_member(
                    INACTIVE_UUID,
                    "jparti",
                    "Jean",
                    "Parti",
                    is_active=False,
                    joined_offset=30,
                ),
                make_member(MEMBER_UUID, "pmartin", "Paul", "Martin", joined_offset=60),
            ]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        result = conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            OWNER_UUID,
        )
        assert result is None
        assert (
            mock_conversation_repository.update.call_args.args[0].owner_uuid
            == MEMBER_UUID
        )
        assert _system_bodies(mock_message_repository) == [
            "Marie Dupont a quitté le groupe. La propriété du groupe est transférée à Paul Martin."
        ]
        mock_conversation_repository.remove_member.assert_called_once_with(
            CONV_UUID, OWNER_UUID
        )

    def test_owner_departure_uses_uuid_tie_break_on_equal_joined_at(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean = make_group_bean(
            [
                make_member(OWNER_UUID, "mdupont", "Marie", "Dupont", joined_offset=0),
                make_member(MEMBER_UUID, "pmartin", "Paul", "Martin", joined_offset=60),
                make_member(OTHER_UUID, "lbernard", "Luc", "Bernard", joined_offset=60),
            ]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            OWNER_UUID,
        )
        assert (
            mock_conversation_repository.update.call_args.args[0].owner_uuid
            == MEMBER_UUID
        )

    def test_owner_departure_falls_back_to_inactive_member(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean = make_group_bean(
            [
                make_member(OWNER_UUID, "mdupont", "Marie", "Dupont", joined_offset=0),
                make_member(
                    INACTIVE_UUID,
                    "jparti",
                    "Jean",
                    "Parti",
                    is_active=False,
                    joined_offset=30,
                ),
            ]
        )
        mock_conversation_repository.get_by_uuid.return_value = bean
        conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            OWNER_UUID,
        )
        assert (
            mock_conversation_repository.update.call_args.args[0].owner_uuid
            == INACTIVE_UUID
        )

    def test_last_member_departure_deletes_conversation(
        self, mock_conversation_repository, mock_message_repository
    ):
        bean = make_group_bean([make_member(OWNER_UUID, "mdupont", "Marie", "Dupont")])
        mock_conversation_repository.get_by_uuid.return_value = bean
        result = conversation_service.remove_member(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            OWNER_UUID,
        )
        assert result is None
        mock_conversation_repository.delete.assert_called_once_with(CONV_UUID)
        mock_conversation_repository.remove_member.assert_not_called()
        mock_message_repository.create.assert_not_called()

    def test_outsider_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(NotFoundException):
            conversation_service.remove_member(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                MEMBER_UUID,
            )


@pytest.mark.unit
class TestMarkRead:
    def test_marks_read_with_aware_datetime(
        self, mock_conversation_repository, sample_group_bean
    ):
        result = conversation_service.mark_read(
            mock_conversation_repository, OWNER_UUID, CONV_UUID
        )
        assert result is sample_group_bean
        conversation_uuid, member_uuid, read_at = (
            mock_conversation_repository.mark_read.call_args.args
        )
        assert (conversation_uuid, member_uuid) == (CONV_UUID, OWNER_UUID)
        assert read_at.tzinfo is not None

    def test_explicit_now_is_forwarded(self, mock_conversation_repository):
        now = datetime(2026, 8, 30, 12, 0, 0, tzinfo=timezone.utc)
        conversation_service.mark_read(
            mock_conversation_repository, OWNER_UUID, CONV_UUID, now=now
        )
        assert mock_conversation_repository.mark_read.call_args.args[2] == now

    def test_non_member_gets_not_found(self, mock_conversation_repository):
        mock_conversation_repository.mark_read.return_value = False
        with pytest.raises(NotFoundException):
            conversation_service.mark_read(
                mock_conversation_repository, OWNER_UUID, CONV_UUID
            )


@pytest.mark.unit
class TestUnreadTotal:
    def test_delegates_to_repository(self, mock_conversation_repository):
        mock_conversation_repository.total_unread_for_user.return_value = 5
        assert (
            conversation_service.get_unread_total(
                mock_conversation_repository, OWNER_UUID
            )
            == 5
        )
        mock_conversation_repository.total_unread_for_user.assert_called_once_with(
            OWNER_UUID
        )
