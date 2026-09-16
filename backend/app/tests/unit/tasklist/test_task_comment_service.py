"""Tests unitaires du service des commentaires de tâches."""

import pytest

from app.domain.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.tasklist.services import task_comment_service
from app.tests.unit.tasklist.conftest import (
    COMMENT_UUID,
    LIST_UUID,
    MEMBER_UUID,
    OTHER_UUID,
    OWNER_UUID,
    TASK_UUID,
)


@pytest.mark.unit
class TestGetTaskComments:
    def test_member_reads_comments(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
        sample_task_comment_bean,
    ):
        result = task_comment_service.get_task_comments(
            mock_task_list_repository,
            mock_task_item_repository,
            mock_task_comment_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
        )
        assert result == [sample_task_comment_bean]
        mock_task_comment_repository.get_by_task.assert_called_once_with(TASK_UUID)

    def test_outsider_cannot_read(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        with pytest.raises(NotFoundException):
            task_comment_service.get_task_comments(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                OTHER_UUID,
                LIST_UUID,
                TASK_UUID,
            )


@pytest.mark.unit
class TestAddTaskComment:
    def test_member_adds_comment(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        mock_task_comment_repository.create.side_effect = lambda b: b
        result = task_comment_service.add_task_comment(
            mock_task_list_repository,
            mock_task_item_repository,
            mock_task_comment_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            "  Point bloquant levé  ",
        )
        assert result.text == "Point bloquant levé"
        assert result.author_uuid == MEMBER_UUID
        assert result.task_uuid == TASK_UUID

    def test_rejects_empty_text(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        with pytest.raises(ValidationException) as exc:
            task_comment_service.add_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                MEMBER_UUID,
                LIST_UUID,
                TASK_UUID,
                "   ",
            )
        assert exc.value.field == "text"

    def test_rejects_text_too_long(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        with pytest.raises(ValidationException) as exc:
            task_comment_service.add_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                MEMBER_UUID,
                LIST_UUID,
                TASK_UUID,
                "x" * 2001,
            )
        assert exc.value.field == "text"

    def test_outsider_cannot_comment(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        with pytest.raises(NotFoundException):
            task_comment_service.add_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                OTHER_UUID,
                LIST_UUID,
                TASK_UUID,
                "Coucou",
            )


@pytest.mark.unit
class TestDeleteTaskComment:
    def test_author_deletes_own_comment(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        task_comment_service.delete_task_comment(
            mock_task_list_repository,
            mock_task_item_repository,
            mock_task_comment_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            COMMENT_UUID,
        )
        mock_task_comment_repository.delete.assert_called_once_with(COMMENT_UUID)

    def test_list_owner_deletes_any_comment(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        task_comment_service.delete_task_comment(
            mock_task_list_repository,
            mock_task_item_repository,
            mock_task_comment_repository,
            OWNER_UUID,
            LIST_UUID,
            TASK_UUID,
            COMMENT_UUID,
        )
        mock_task_comment_repository.delete.assert_called_once_with(COMMENT_UUID)

    def test_other_member_cannot_delete(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
        sample_task_list_bean,
    ):
        sample_task_list_bean.member_uuids = [MEMBER_UUID, OTHER_UUID]
        with pytest.raises(ForbiddenException):
            task_comment_service.delete_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                OTHER_UUID,
                LIST_UUID,
                TASK_UUID,
                COMMENT_UUID,
            )
        mock_task_comment_repository.delete.assert_not_called()

    def test_unknown_comment_raises_not_found(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
    ):
        mock_task_comment_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            task_comment_service.delete_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                OWNER_UUID,
                LIST_UUID,
                TASK_UUID,
                COMMENT_UUID,
            )

    def test_comment_of_other_task_raises_not_found(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        mock_task_comment_repository,
        sample_task_comment_bean,
    ):
        sample_task_comment_bean.task_uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        with pytest.raises(NotFoundException):
            task_comment_service.delete_task_comment(
                mock_task_list_repository,
                mock_task_item_repository,
                mock_task_comment_repository,
                OWNER_UUID,
                LIST_UUID,
                TASK_UUID,
                COMMENT_UUID,
            )
