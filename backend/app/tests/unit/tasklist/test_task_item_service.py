"""Tests unitaires du service des tâches d'une liste partagée."""

from datetime import date

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.services import task_item_service
from app.tests.unit.tasklist.conftest import (
    LIST_UUID,
    MEMBER_UUID,
    OTHER_UUID,
    OWNER_UUID,
    TASK_UUID,
)


@pytest.mark.unit
class TestGetTaskInList:
    def test_returns_task(self, mock_task_item_repository, sample_task_item_bean):
        result = task_item_service.get_task_in_list(
            mock_task_item_repository, LIST_UUID, TASK_UUID
        )
        assert result == sample_task_item_bean

    def test_unknown_task_raises_not_found(self, mock_task_item_repository):
        mock_task_item_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            task_item_service.get_task_in_list(
                mock_task_item_repository, LIST_UUID, TASK_UUID
            )

    def test_task_of_other_list_raises_not_found(
        self, mock_task_item_repository, sample_task_item_bean
    ):
        sample_task_item_bean.task_list_uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        with pytest.raises(NotFoundException):
            task_item_service.get_task_in_list(
                mock_task_item_repository, LIST_UUID, TASK_UUID
            )


@pytest.mark.unit
class TestCreateTask:
    def test_member_creates_task(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        mock_task_item_repository.create.side_effect = lambda b: b
        mock_task_item_repository.next_position.return_value = 4
        bean = TaskItemBean(title=" Nettoyer le banc ", priority="normal")
        result = task_item_service.create_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            bean,
        )
        assert result.title == "Nettoyer le banc"
        assert result.task_list_uuid == LIST_UUID
        assert result.created_by_uuid == MEMBER_UUID
        assert result.position == 4
        assert result.done is False

    def test_create_ignores_done_flag(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        mock_task_item_repository.create.side_effect = lambda b: b
        bean = TaskItemBean(title="Tâche", done=True, completed_by_uuid=OWNER_UUID)
        result = task_item_service.create_task(
            mock_task_list_repository,
            mock_task_item_repository,
            OWNER_UUID,
            LIST_UUID,
            bean,
        )
        assert result.done is False
        assert result.completed_by_uuid is None
        assert result.completed_at is None

    def test_outsider_cannot_create(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="Tâche")
        with pytest.raises(NotFoundException):
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OTHER_UUID,
                LIST_UUID,
                bean,
            )

    def test_rejects_empty_title(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="   ")
        with pytest.raises(ValidationException) as exc:
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                bean,
            )
        assert exc.value.field == "title"

    def test_rejects_title_too_long(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="x" * 301)
        with pytest.raises(ValidationException) as exc:
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                bean,
            )
        assert exc.value.field == "title"

    def test_rejects_note_too_long(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="Tâche", note="x" * 4001)
        with pytest.raises(ValidationException) as exc:
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                bean,
            )
        assert exc.value.field == "note"

    def test_rejects_unknown_priority(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="Tâche", priority="urgentissime")
        with pytest.raises(ValidationException) as exc:
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                bean,
            )
        assert exc.value.field == "priority"

    def test_assignee_must_be_member(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        bean = TaskItemBean(title="Tâche", assignee_uuid=OTHER_UUID)
        with pytest.raises(ValidationException) as exc:
            task_item_service.create_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                bean,
            )
        assert exc.value.field == "assignee_uuid"

    def test_assignee_owner_is_allowed(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        mock_task_item_repository.create.side_effect = lambda b: b
        bean = TaskItemBean(title="Tâche", assignee_uuid=OWNER_UUID)
        result = task_item_service.create_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            bean,
        )
        assert result.assignee_uuid == OWNER_UUID


@pytest.mark.unit
class TestUpdateTask:
    def test_updates_provided_fields_only(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"priority": "critical", "due_date": date(2026, 7, 10)},
        )
        assert result.priority == "critical"
        assert result.due_date == date(2026, 7, 10)
        assert result.title == sample_task_item_bean.title

    def test_marking_done_records_completion(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"done": True},
        )
        assert result.done is True
        assert result.completed_by_uuid == MEMBER_UUID
        assert result.completed_at is not None

    def test_unmarking_done_clears_completion(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        sample_task_item_bean.done = True
        sample_task_item_bean.completed_by_uuid = OWNER_UUID
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"done": False},
        )
        assert result.done is False
        assert result.completed_by_uuid is None
        assert result.completed_at is None

    def test_done_unchanged_keeps_completion(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        sample_task_item_bean.done = True
        sample_task_item_bean.completed_by_uuid = OWNER_UUID
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"done": True},
        )
        assert result.completed_by_uuid == OWNER_UUID

    def test_clearing_assignee(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        sample_task_item_bean.assignee_uuid = MEMBER_UUID
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            OWNER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"assignee_uuid": None},
        )
        assert result.assignee_uuid is None

    def test_rejects_negative_position(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        with pytest.raises(ValidationException) as exc:
            task_item_service.update_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                TASK_UUID,
                {"position": -1},
            )
        assert exc.value.field == "position"

    def test_ignores_unknown_fields(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        mock_task_item_repository.update.side_effect = lambda b: b
        result = task_item_service.update_task(
            mock_task_list_repository,
            mock_task_item_repository,
            OWNER_UUID,
            LIST_UUID,
            TASK_UUID,
            {"created_by_uuid": OTHER_UUID, "uuid": OTHER_UUID},
        )
        assert result.created_by_uuid == sample_task_item_bean.created_by_uuid
        assert result.uuid == TASK_UUID

    def test_outsider_cannot_update(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        with pytest.raises(NotFoundException):
            task_item_service.update_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OTHER_UUID,
                LIST_UUID,
                TASK_UUID,
                {"title": "X"},
            )

    def test_task_of_other_list_not_found(
        self,
        mock_task_list_repository,
        mock_task_item_repository,
        sample_task_item_bean,
    ):
        sample_task_item_bean.task_list_uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        with pytest.raises(NotFoundException):
            task_item_service.update_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                TASK_UUID,
                {"title": "X"},
            )


@pytest.mark.unit
class TestDeleteTask:
    def test_member_deletes_task(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        task_item_service.delete_task(
            mock_task_list_repository,
            mock_task_item_repository,
            MEMBER_UUID,
            LIST_UUID,
            TASK_UUID,
        )
        mock_task_item_repository.delete.assert_called_once_with(TASK_UUID)

    def test_outsider_cannot_delete(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        with pytest.raises(NotFoundException):
            task_item_service.delete_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OTHER_UUID,
                LIST_UUID,
                TASK_UUID,
            )
        mock_task_item_repository.delete.assert_not_called()

    def test_unknown_task_raises_not_found(
        self, mock_task_list_repository, mock_task_item_repository
    ):
        mock_task_item_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            task_item_service.delete_task(
                mock_task_list_repository,
                mock_task_item_repository,
                OWNER_UUID,
                LIST_UUID,
                TASK_UUID,
            )
