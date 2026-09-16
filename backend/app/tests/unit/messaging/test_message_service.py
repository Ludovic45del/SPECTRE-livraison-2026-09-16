"""Tests unitaires du service Messages (messagerie interne)."""

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.messaging.models.constants import (
    MAX_MESSAGE_LENGTH,
    MESSAGE_KIND_SYSTEM,
    MESSAGE_KIND_TEXT,
    MESSAGE_PAGE_DEFAULT_LIMIT,
    MESSAGE_PAGE_MAX_LIMIT,
)
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.services import message_service
from app.tests.unit.messaging.conftest import (
    CONV_UUID,
    MSG_UUID,
    OUTSIDER_UUID,
    OWNER_UUID,
)


@pytest.mark.unit
class TestGetMessages:
    def test_returns_repository_page(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        messages, has_more, updated = message_service.get_messages(
            mock_conversation_repository, mock_message_repository, OWNER_UUID, CONV_UUID
        )
        assert messages == [sample_message_bean]
        assert has_more is False
        assert updated == []
        mock_conversation_repository.is_member.assert_called_once_with(
            CONV_UUID, OWNER_UUID
        )
        mock_message_repository.get_page.assert_called_once_with(
            CONV_UUID,
            MESSAGE_PAGE_DEFAULT_LIMIT,
            before_uuid=None,
            after_uuid=None,
            updated_since=None,
        )

    def test_non_member_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.is_member.return_value = False
        with pytest.raises(NotFoundException):
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
            )
        mock_message_repository.get_page.assert_not_called()

    @pytest.mark.parametrize(
        "requested,expected",
        [
            (None, MESSAGE_PAGE_DEFAULT_LIMIT),
            (10, 10),
            (0, 1),
            (-5, 1),
            (MESSAGE_PAGE_MAX_LIMIT + 50, MESSAGE_PAGE_MAX_LIMIT),
            ("abc", MESSAGE_PAGE_DEFAULT_LIMIT),
        ],
    )
    def test_limit_is_bounded(
        self, mock_conversation_repository, mock_message_repository, requested, expected
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            limit=requested,
        )
        assert mock_message_repository.get_page.call_args.args[1] == expected

    def test_both_cursors_are_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                before_uuid=MSG_UUID,
                after_uuid=MSG_UUID,
            )
        assert exc.value.field == "cursor"
        mock_message_repository.get_page.assert_not_called()

    def test_before_cursor_is_forwarded(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            before_uuid=MSG_UUID,
        )
        # Le curseur n'est relu que par le repository (une seule requête).
        mock_message_repository.get_by_uuid.assert_not_called()
        assert mock_message_repository.get_page.call_args.kwargs == {
            "before_uuid": MSG_UUID,
            "after_uuid": None,
            "updated_since": None,
        }

    def test_after_cursor_is_forwarded(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            after_uuid=MSG_UUID,
        )
        assert mock_message_repository.get_page.call_args.kwargs == {
            "before_uuid": None,
            "after_uuid": MSG_UUID,
            "updated_since": None,
        }

    def test_unknown_cursor_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        # Le repository signale un curseur inconnu (ou étranger à la
        # conversation) par None : le service le traduit en 404 « Message ».
        mock_message_repository.get_page.return_value = None
        with pytest.raises(NotFoundException) as exc:
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                before_uuid=MSG_UUID,
            )
        assert exc.value.resource == "Message"
        assert exc.value.identifier == MSG_UUID
        mock_message_repository.get_page.assert_called_once()

    def test_cursor_from_other_conversation_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_message_repository.get_page.return_value = None
        with pytest.raises(NotFoundException) as exc:
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                after_uuid=MSG_UUID,
            )
        assert exc.value.identifier == MSG_UUID
        assert mock_message_repository.get_page.call_args.args[0] == CONV_UUID

    def test_conversation_uuid_is_canonicalised(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID.upper(),
            after_uuid=MSG_UUID,
        )
        mock_conversation_repository.is_member.assert_called_once_with(
            CONV_UUID, OWNER_UUID
        )
        assert mock_message_repository.get_page.call_args.args[0] == CONV_UUID

    def test_unparsable_conversation_uuid_is_passed_raw_and_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        # Segment d'URL malformé : transmis tel quel, `is_member` répond False
        # (le repository absorbe la ValidationError) et la conversation est 404.
        mock_conversation_repository.is_member.return_value = False
        with pytest.raises(NotFoundException) as exc:
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                "not-a-uuid",
            )
        mock_conversation_repository.is_member.assert_called_once_with(
            "not-a-uuid", OWNER_UUID
        )
        assert exc.value.identifier == "not-a-uuid"


@pytest.mark.unit
class TestPostMessage:
    def test_creates_text_message(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "  Bonjour  ",
        )
        assert isinstance(result, MessageBean)
        assert result.kind == MESSAGE_KIND_TEXT
        assert result.author_uuid == OWNER_UUID
        assert result.conversation_uuid == CONV_UUID
        assert result.body == "Bonjour"
        mock_message_repository.create.assert_called_once()

    def test_keeps_internal_line_breaks(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            " ligne 1\nligne 2 ",
        )
        assert result.body == "ligne 1\nligne 2"

    @pytest.mark.parametrize("body", ["", "   ", None])
    def test_empty_body_is_rejected(
        self, mock_conversation_repository, mock_message_repository, body
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                body,
            )
        assert exc.value.field == "body"
        mock_message_repository.create.assert_not_called()

    def test_too_long_body_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "é" * (MAX_MESSAGE_LENGTH + 1),
            )
        assert exc.value.field == "body"
        mock_message_repository.create.assert_not_called()

    def test_max_length_body_is_accepted(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "é" * MAX_MESSAGE_LENGTH,
        )
        assert len(result.body) == MAX_MESSAGE_LENGTH

    def test_non_member_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.is_member.return_value = False
        with pytest.raises(NotFoundException):
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                "Bonjour",
            )
        mock_message_repository.create.assert_not_called()


@pytest.mark.unit
class TestPostSystemMessage:
    def test_creates_system_message_with_actor(self, mock_message_repository):
        result = message_service.post_system_message(
            mock_message_repository,
            CONV_UUID,
            OWNER_UUID,
            "Marie Dupont a quitté le groupe",
        )
        assert result.kind == MESSAGE_KIND_SYSTEM
        assert result.author_uuid == OWNER_UUID
        assert result.conversation_uuid == CONV_UUID
        assert result.body == "Marie Dupont a quitté le groupe"

    def test_actor_is_optional(self, mock_message_repository):
        result = message_service.post_system_message(
            mock_message_repository, CONV_UUID, None, "Groupe créé"
        )
        assert result.author_uuid is None
