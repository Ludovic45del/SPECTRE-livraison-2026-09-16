"""Tests unitaires du service Messages, vague M4 : pièces jointes, édition,
suppression logique, recherche et polling `updated_since`."""

from datetime import datetime, timedelta, timezone

import pytest

from app.domain.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.messaging.models.attachment_bean import AttachmentUploadBean
from app.domain.messaging.models.constants import (
    KIND_DIRECT,
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MAX_MESSAGE_LENGTH,
    MESSAGE_KIND_SYSTEM,
    MESSAGE_PAGE_DEFAULT_LIMIT,
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LENGTH,
    SEARCH_MAX_LIMIT,
)
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.services import message_service
from app.tests.unit.messaging.conftest import (
    BASE_TIME,
    CONV_UUID,
    MEMBER_UUID,
    MSG_UUID,
    OTHER_CONV_UUID,
    OUTSIDER_UUID,
    OWNER_UUID,
)


def _upload(name: str = "photo.png", size: int = 1024) -> AttachmentUploadBean:
    return AttachmentUploadBean(
        name=name, content_type="application/octet-stream", size=size, file=object()
    )


# ----------------------------------------------------------------------
# post_message : pièces jointes
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestPostMessageAttachments:
    def test_attachments_are_forwarded_to_repository(
        self, mock_conversation_repository, mock_message_repository
    ):
        uploads = [_upload("a.png"), _upload("b.pdf")]
        message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "Bonjour",
            attachments=uploads,
        )
        bean, forwarded = mock_message_repository.create.call_args.args
        assert bean.body == "Bonjour"
        assert forwarded == uploads

    def test_without_attachments_repository_receives_empty_list(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "Bonjour",
        )
        assert mock_message_repository.create.call_args.args[1] == []

    def test_empty_body_is_accepted_with_an_attachment(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "   ",
            attachments=[_upload()],
        )
        assert result.body == ""
        mock_message_repository.create.assert_called_once()

    def test_empty_body_without_attachment_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "",
                attachments=[],
            )
        assert exc.value.field == "body"
        mock_message_repository.create.assert_not_called()

    def test_too_many_attachments_are_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        uploads = [_upload(f"f{i}.png") for i in range(MAX_ATTACHMENTS_PER_MESSAGE + 1)]
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "x",
                attachments=uploads,
            )
        assert exc.value.field == "attachments"
        mock_message_repository.create.assert_not_called()

    def test_max_attachments_are_accepted(
        self, mock_conversation_repository, mock_message_repository
    ):
        uploads = [_upload(f"f{i}.png") for i in range(MAX_ATTACHMENTS_PER_MESSAGE)]
        message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "x",
            attachments=uploads,
        )
        mock_message_repository.create.assert_called_once()

    def test_oversized_attachment_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "x",
                attachments=[_upload("big.pdf", size=MAX_ATTACHMENT_SIZE_BYTES + 1)],
            )
        assert exc.value.field == "attachments"

    def test_attachment_at_size_limit_is_accepted(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "x",
            attachments=[_upload("big.pdf", size=MAX_ATTACHMENT_SIZE_BYTES)],
        )
        mock_message_repository.create.assert_called_once()

    @pytest.mark.parametrize("name", ["virus.exe", "script.sh", "noext", "x.tar.gz"])
    def test_forbidden_extension_is_rejected(
        self, mock_conversation_repository, mock_message_repository, name
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "x",
                attachments=[_upload(name)],
            )
        assert exc.value.field == "attachments"
        mock_message_repository.create.assert_not_called()

    @pytest.mark.parametrize("name", ["Photo.PNG", "rapport.Pdf", "a.b.DOCX"])
    def test_extension_check_is_case_insensitive(
        self, mock_conversation_repository, mock_message_repository, name
    ):
        message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "x",
            attachments=[_upload(name)],
        )
        mock_message_repository.create.assert_called_once()

    @pytest.mark.parametrize("name", ["", "   ", None])
    def test_blank_name_is_rejected(
        self, mock_conversation_repository, mock_message_repository, name
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "x",
                attachments=[_upload(name)],
            )
        assert exc.value.field == "attachments"

    def test_attachments_are_validated_before_body(
        self, mock_conversation_repository, mock_message_repository
    ):
        # Un lot invalide est signalé même si le corps est lui aussi vide.
        with pytest.raises(ValidationException) as exc:
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                "",
                attachments=[_upload("x.exe")],
            )
        assert exc.value.field == "attachments"

    def test_non_member_gets_not_found_before_validation(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.is_member.return_value = False
        with pytest.raises(NotFoundException):
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                "",
                attachments=[_upload("x.exe")],
            )


# ----------------------------------------------------------------------
# edit_message
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestEditMessage:
    def _edit(self, conv_repo, msg_repo, requester=OWNER_UUID, body="Corrigé"):
        return message_service.edit_message(
            conv_repo, msg_repo, requester, CONV_UUID, MSG_UUID, body
        )

    def test_author_edits_body(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = self._edit(mock_conversation_repository, mock_message_repository)
        args, kwargs = mock_message_repository.update_body.call_args
        assert args == (MSG_UUID, "Corrigé")
        assert kwargs["edited_at"].tzinfo is not None
        assert result.body == "Corrigé"
        assert result.edited_at == kwargs["edited_at"]

    def test_body_is_stripped(
        self, mock_conversation_repository, mock_message_repository
    ):
        self._edit(mock_conversation_repository, mock_message_repository, body="  x  ")
        assert mock_message_repository.update_body.call_args.args[1] == "x"

    def test_identical_body_does_not_write(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        result = self._edit(
            mock_conversation_repository, mock_message_repository, body=" Bonjour "
        )
        assert result is sample_message_bean
        mock_message_repository.update_body.assert_not_called()

    def test_non_member_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.is_member.return_value = False
        with pytest.raises(NotFoundException) as exc:
            self._edit(
                mock_conversation_repository, mock_message_repository, OUTSIDER_UUID
            )
        assert exc.value.resource == "Conversation"
        mock_message_repository.get_by_uuid.assert_not_called()

    def test_unknown_message_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_message_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException) as exc:
            self._edit(mock_conversation_repository, mock_message_repository)
        assert exc.value.resource == "Message"
        assert exc.value.identifier == MSG_UUID

    def test_message_of_other_conversation_gets_not_found(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.conversation_uuid = OTHER_CONV_UUID
        with pytest.raises(NotFoundException) as exc:
            self._edit(mock_conversation_repository, mock_message_repository)
        assert exc.value.resource == "Message"
        mock_message_repository.update_body.assert_not_called()

    def test_deleted_message_is_rejected(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.deleted_at = BASE_TIME
        with pytest.raises(ValidationException) as exc:
            self._edit(mock_conversation_repository, mock_message_repository)
        assert exc.value.field == "message"
        mock_message_repository.update_body.assert_not_called()

    def test_system_message_is_rejected(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.kind = MESSAGE_KIND_SYSTEM
        with pytest.raises(ValidationException) as exc:
            self._edit(mock_conversation_repository, mock_message_repository)
        assert exc.value.field == "message"

    def test_other_member_is_forbidden(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ForbiddenException):
            self._edit(
                mock_conversation_repository, mock_message_repository, MEMBER_UUID
            )
        mock_message_repository.update_body.assert_not_called()

    @pytest.mark.parametrize("body", ["", "   ", None])
    def test_empty_body_is_rejected(
        self, mock_conversation_repository, mock_message_repository, body
    ):
        with pytest.raises(ValidationException) as exc:
            self._edit(mock_conversation_repository, mock_message_repository, body=body)
        assert exc.value.field == "body"

    def test_too_long_body_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            self._edit(
                mock_conversation_repository,
                mock_message_repository,
                body="é" * (MAX_MESSAGE_LENGTH + 1),
            )
        assert exc.value.field == "body"

    def test_conversation_uuid_is_canonicalised(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.edit_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID.upper(),
            MSG_UUID,
            "Corrigé",
        )
        mock_conversation_repository.is_member.assert_called_once_with(
            CONV_UUID, OWNER_UUID
        )


# ----------------------------------------------------------------------
# delete_message
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestDeleteMessage:
    def _delete(self, conv_repo, msg_repo, requester=OWNER_UUID):
        return message_service.delete_message(
            conv_repo, msg_repo, requester, CONV_UUID, MSG_UUID
        )

    def test_author_deletes_own_message(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = self._delete(mock_conversation_repository, mock_message_repository)
        args = mock_message_repository.soft_delete.call_args.args
        assert args[0] == MSG_UUID
        assert args[1].tzinfo is not None
        assert result.is_deleted
        assert result.body == ""
        mock_conversation_repository.get_by_uuid.assert_called_once_with(
            CONV_UUID, for_user_uuid=OWNER_UUID
        )

    def test_group_owner_deletes_member_message(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.author_uuid = MEMBER_UUID
        self._delete(mock_conversation_repository, mock_message_repository, OWNER_UUID)
        mock_message_repository.soft_delete.assert_called_once()

    def test_other_member_is_forbidden(
        self, mock_conversation_repository, mock_message_repository
    ):
        # Le message est du propriétaire ; un membre ordinaire ne peut pas le supprimer.
        with pytest.raises(ForbiddenException):
            self._delete(
                mock_conversation_repository, mock_message_repository, MEMBER_UUID
            )
        mock_message_repository.soft_delete.assert_not_called()

    def test_direct_conversation_other_member_is_forbidden(
        self,
        mock_conversation_repository,
        mock_message_repository,
        sample_direct_bean,
        sample_message_bean,
    ):
        # En privée, le « propriétaire » (créateur) n'a aucun droit sur les
        # messages de l'autre : seul l'auteur supprime.
        sample_message_bean.author_uuid = MEMBER_UUID
        sample_message_bean.conversation_uuid = sample_direct_bean.uuid
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        assert sample_direct_bean.kind == KIND_DIRECT
        with pytest.raises(ForbiddenException):
            message_service.delete_message(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                sample_direct_bean.uuid,
                MSG_UUID,
            )
        mock_message_repository.soft_delete.assert_not_called()

    def test_direct_conversation_author_can_delete(
        self,
        mock_conversation_repository,
        mock_message_repository,
        sample_direct_bean,
        sample_message_bean,
    ):
        sample_message_bean.author_uuid = MEMBER_UUID
        sample_message_bean.conversation_uuid = sample_direct_bean.uuid
        mock_conversation_repository.get_by_uuid.return_value = sample_direct_bean
        message_service.delete_message(
            mock_conversation_repository,
            mock_message_repository,
            MEMBER_UUID,
            sample_direct_bean.uuid,
            MSG_UUID,
        )
        mock_message_repository.soft_delete.assert_called_once()

    def test_system_message_is_rejected(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.kind = MESSAGE_KIND_SYSTEM
        with pytest.raises(ValidationException) as exc:
            self._delete(mock_conversation_repository, mock_message_repository)
        assert exc.value.field == "message"
        mock_message_repository.soft_delete.assert_not_called()

    def test_already_deleted_is_idempotent(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.deleted_at = BASE_TIME
        result = self._delete(
            mock_conversation_repository, mock_message_repository, MEMBER_UUID
        )
        assert result is sample_message_bean
        mock_message_repository.soft_delete.assert_not_called()

    def test_non_member_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(NotFoundException) as exc:
            self._delete(
                mock_conversation_repository, mock_message_repository, OUTSIDER_UUID
            )
        assert exc.value.resource == "Conversation"
        mock_message_repository.get_by_uuid.assert_not_called()

    def test_unknown_conversation_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_conversation_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            self._delete(mock_conversation_repository, mock_message_repository)

    def test_unknown_message_gets_not_found(
        self, mock_conversation_repository, mock_message_repository
    ):
        mock_message_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException) as exc:
            self._delete(mock_conversation_repository, mock_message_repository)
        assert exc.value.resource == "Message"

    def test_message_of_other_conversation_gets_not_found(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        sample_message_bean.conversation_uuid = OTHER_CONV_UUID
        with pytest.raises(NotFoundException) as exc:
            self._delete(mock_conversation_repository, mock_message_repository)
        assert exc.value.resource == "Message"


# ----------------------------------------------------------------------
# search_messages
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestSearchMessages:
    def test_query_is_stripped_and_forwarded(self, mock_message_repository):
        result = message_service.search_messages(
            mock_message_repository, OWNER_UUID, "  cryo  "
        )
        assert result == []
        mock_message_repository.search.assert_called_once_with(
            OWNER_UUID, "cryo", SEARCH_DEFAULT_LIMIT
        )

    @pytest.mark.parametrize("query", ["", " ", "a", " a ", None])
    def test_too_short_query_is_rejected(self, mock_message_repository, query):
        with pytest.raises(ValidationException) as exc:
            message_service.search_messages(mock_message_repository, OWNER_UUID, query)
        assert exc.value.field == "q"
        mock_message_repository.search.assert_not_called()

    def test_min_length_query_is_accepted(self, mock_message_repository):
        message_service.search_messages(mock_message_repository, OWNER_UUID, "ab")
        mock_message_repository.search.assert_called_once()

    def test_too_long_query_is_rejected(self, mock_message_repository):
        with pytest.raises(ValidationException) as exc:
            message_service.search_messages(
                mock_message_repository, OWNER_UUID, "x" * (SEARCH_MAX_LENGTH + 1)
            )
        assert exc.value.field == "q"

    def test_max_length_query_is_accepted(self, mock_message_repository):
        message_service.search_messages(
            mock_message_repository, OWNER_UUID, "x" * SEARCH_MAX_LENGTH
        )
        mock_message_repository.search.assert_called_once()

    @pytest.mark.parametrize("limit,expected", [(1, 1), (7, 7), ("7", 7)])
    def test_limit_is_forwarded(self, mock_message_repository, limit, expected):
        message_service.search_messages(
            mock_message_repository, OWNER_UUID, "cryo", limit=limit
        )
        assert mock_message_repository.search.call_args.args[2] == expected

    @pytest.mark.parametrize("limit", [0, -1, SEARCH_MAX_LIMIT + 1, "abc"])
    def test_invalid_limit_is_rejected(self, mock_message_repository, limit):
        with pytest.raises(ValidationException) as exc:
            message_service.search_messages(
                mock_message_repository, OWNER_UUID, "cryo", limit=limit
            )
        assert exc.value.field == "limit"
        mock_message_repository.search.assert_not_called()

    def test_max_limit_is_accepted(self, mock_message_repository):
        message_service.search_messages(
            mock_message_repository, OWNER_UUID, "cryo", limit=SEARCH_MAX_LIMIT
        )
        assert mock_message_repository.search.call_args.args[2] == SEARCH_MAX_LIMIT


# ----------------------------------------------------------------------
# get_messages(updated_since)
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestGetMessagesUpdatedSince:
    def test_updated_since_alone_is_forwarded_with_ms_ceiling(
        self, mock_conversation_repository, mock_message_repository
    ):
        since = BASE_TIME.replace(microsecond=123456)
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            updated_since=since,
        )
        forwarded = mock_message_repository.get_page.call_args.kwargs["updated_since"]
        # Aligné sur la fin de la milliseconde : un client à la milliseconde ne
        # revoit pas indéfiniment le même message.
        assert forwarded == BASE_TIME.replace(microsecond=123999)
        assert forwarded.tzinfo is not None

    def test_updated_since_with_after_cursor(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            after_uuid=MSG_UUID,
            updated_since=BASE_TIME,
        )
        assert mock_message_repository.get_page.call_args.kwargs == {
            "before_uuid": None,
            "after_uuid": MSG_UUID,
            "updated_since": BASE_TIME.replace(microsecond=999),
        }

    def test_updated_since_with_before_cursor_is_rejected(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            message_service.get_messages(
                mock_conversation_repository,
                mock_message_repository,
                OWNER_UUID,
                CONV_UUID,
                before_uuid=MSG_UUID,
                updated_since=BASE_TIME,
            )
        assert exc.value.field == "updated_since"
        mock_message_repository.get_page.assert_not_called()

    def test_updated_list_is_returned(
        self, mock_conversation_repository, mock_message_repository, sample_message_bean
    ):
        edited = MessageBean(
            uuid="edited", body="v2", edited_at=BASE_TIME + timedelta(seconds=5)
        )
        mock_message_repository.get_page.return_value = (
            [sample_message_bean],
            True,
            [edited],
        )
        results, has_more, updated = message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            updated_since=BASE_TIME,
        )
        assert results == [sample_message_bean]
        assert has_more is True
        assert updated == [edited]

    def test_default_limit_still_applies(
        self, mock_conversation_repository, mock_message_repository
    ):
        message_service.get_messages(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            updated_since=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        assert (
            mock_message_repository.get_page.call_args.args[1]
            == MESSAGE_PAGE_DEFAULT_LIMIT
        )
