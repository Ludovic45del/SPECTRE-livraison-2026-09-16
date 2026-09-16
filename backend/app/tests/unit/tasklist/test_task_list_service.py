"""Tests unitaires du service des listes de tâches partagées."""

import pytest

from app.domain.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.domain.tasklist.services import task_list_service
from app.tests.unit.tasklist.conftest import (
    LIST_UUID,
    MEMBER_UUID,
    OTHER_UUID,
    OWNER_UUID,
)


@pytest.mark.unit
class TestGetVisibleTaskList:
    def test_owner_can_access(self, mock_task_list_repository, sample_task_list_bean):
        result = task_list_service.get_visible_task_list(
            mock_task_list_repository, OWNER_UUID, LIST_UUID
        )
        assert result == sample_task_list_bean

    def test_member_can_access(self, mock_task_list_repository, sample_task_list_bean):
        result = task_list_service.get_visible_task_list(
            mock_task_list_repository, MEMBER_UUID, LIST_UUID
        )
        assert result == sample_task_list_bean

    def test_outsider_gets_not_found(self, mock_task_list_repository):
        with pytest.raises(NotFoundException):
            task_list_service.get_visible_task_list(
                mock_task_list_repository, OTHER_UUID, LIST_UUID
            )

    def test_unknown_list_raises_not_found(self, mock_task_list_repository):
        mock_task_list_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            task_list_service.get_visible_task_list(
                mock_task_list_repository, OWNER_UUID, LIST_UUID
            )


@pytest.mark.unit
class TestGetTaskLists:
    def test_returns_lists_for_requester(
        self, mock_task_list_repository, sample_task_list_bean
    ):
        result = task_list_service.get_task_lists(mock_task_list_repository, OWNER_UUID)
        assert result == [sample_task_list_bean]
        mock_task_list_repository.get_all_for_user.assert_called_once_with(OWNER_UUID)


@pytest.mark.unit
class TestGetTaskListDetail:
    def test_member_gets_detail(self, mock_task_list_repository, sample_task_list_bean):
        result = task_list_service.get_task_list_detail(
            mock_task_list_repository, MEMBER_UUID, LIST_UUID
        )
        assert result == sample_task_list_bean
        mock_task_list_repository.get_detail_by_uuid.assert_called_once_with(LIST_UUID)

    def test_outsider_gets_not_found(self, mock_task_list_repository):
        with pytest.raises(NotFoundException):
            task_list_service.get_task_list_detail(
                mock_task_list_repository, OTHER_UUID, LIST_UUID
            )

    def test_unknown_list_raises_not_found(self, mock_task_list_repository):
        mock_task_list_repository.get_detail_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            task_list_service.get_task_list_detail(
                mock_task_list_repository, OWNER_UUID, LIST_UUID
            )


@pytest.mark.unit
class TestCreateTaskList:
    def test_create_success_sets_owner(self, mock_task_list_repository):
        bean = TaskListBean(name="Nouvelle liste")
        mock_task_list_repository.create.side_effect = lambda b: b
        result = task_list_service.create_task_list(
            mock_task_list_repository, OWNER_UUID, bean, [MEMBER_UUID]
        )
        assert result.owner_uuid == OWNER_UUID
        assert result.member_uuids == [MEMBER_UUID]
        mock_task_list_repository.create.assert_called_once()

    def test_create_strips_name(self, mock_task_list_repository):
        bean = TaskListBean(name="  Ma liste  ")
        mock_task_list_repository.create.side_effect = lambda b: b
        result = task_list_service.create_task_list(
            mock_task_list_repository, OWNER_UUID, bean, []
        )
        assert result.name == "Ma liste"

    def test_create_rejects_empty_name(self, mock_task_list_repository):
        bean = TaskListBean(name="   ")
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, []
            )
        assert exc.value.field == "name"

    def test_create_rejects_name_too_long(self, mock_task_list_repository):
        bean = TaskListBean(name="x" * 121)
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, []
            )
        assert exc.value.field == "name"

    def test_create_rejects_description_too_long(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste", description="x" * 2001)
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, []
            )
        assert exc.value.field == "description"

    def test_create_rejects_unknown_color(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste", color="magenta")
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, []
            )
        assert exc.value.field == "color"

    def test_create_rejects_owner_as_member(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste")
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, [OWNER_UUID]
            )
        assert exc.value.field == "member_uuids"

    def test_create_rejects_unknown_member(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste")
        mock_task_list_repository.existing_user_uuids.side_effect = lambda uuids: []
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, [MEMBER_UUID]
            )
        assert exc.value.field == "member_uuids"

    def test_create_dedupes_members(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste")
        mock_task_list_repository.create.side_effect = lambda b: b
        result = task_list_service.create_task_list(
            mock_task_list_repository, OWNER_UUID, bean, [MEMBER_UUID, MEMBER_UUID]
        )
        assert result.member_uuids == [MEMBER_UUID]

    def test_create_rejects_too_many_members(self, mock_task_list_repository):
        bean = TaskListBean(name="Liste")
        many = [f"99999999-9999-4999-8999-{i:012d}" for i in range(31)]
        with pytest.raises(ValidationException) as exc:
            task_list_service.create_task_list(
                mock_task_list_repository, OWNER_UUID, bean, many
            )
        assert exc.value.field == "member_uuids"


@pytest.mark.unit
class TestUpdateTaskList:
    def test_owner_updates_fields(
        self, mock_task_list_repository, sample_task_list_bean
    ):
        mock_task_list_repository.update.side_effect = lambda b: b
        result = task_list_service.update_task_list(
            mock_task_list_repository,
            OWNER_UUID,
            LIST_UUID,
            {"name": " Renommée ", "description": "maj", "color": "green"},
        )
        assert result.name == "Renommée"
        assert result.description == "maj"
        assert result.color == "green"

    def test_partial_update_keeps_other_fields(
        self, mock_task_list_repository, sample_task_list_bean
    ):
        mock_task_list_repository.update.side_effect = lambda b: b
        result = task_list_service.update_task_list(
            mock_task_list_repository, OWNER_UUID, LIST_UUID, {"color": "red"}
        )
        assert result.name == sample_task_list_bean.name
        assert result.color == "red"

    def test_member_cannot_update(self, mock_task_list_repository):
        with pytest.raises(ForbiddenException):
            task_list_service.update_task_list(
                mock_task_list_repository, MEMBER_UUID, LIST_UUID, {"name": "X"}
            )

    def test_outsider_gets_not_found(self, mock_task_list_repository):
        with pytest.raises(NotFoundException):
            task_list_service.update_task_list(
                mock_task_list_repository, OTHER_UUID, LIST_UUID, {"name": "X"}
            )

    def test_update_rejects_empty_name(self, mock_task_list_repository):
        with pytest.raises(ValidationException):
            task_list_service.update_task_list(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, {"name": "  "}
            )


@pytest.mark.unit
class TestDeleteTaskList:
    def test_owner_deletes(self, mock_task_list_repository):
        task_list_service.delete_task_list(
            mock_task_list_repository, OWNER_UUID, LIST_UUID
        )
        mock_task_list_repository.delete.assert_called_once_with(LIST_UUID)

    def test_member_cannot_delete(self, mock_task_list_repository):
        with pytest.raises(ForbiddenException):
            task_list_service.delete_task_list(
                mock_task_list_repository, MEMBER_UUID, LIST_UUID
            )
        mock_task_list_repository.delete.assert_not_called()

    def test_outsider_gets_not_found(self, mock_task_list_repository):
        with pytest.raises(NotFoundException):
            task_list_service.delete_task_list(
                mock_task_list_repository, OTHER_UUID, LIST_UUID
            )


@pytest.mark.unit
class TestAddTaskListMembers:
    def test_owner_adds_member(self, mock_task_list_repository):
        result = task_list_service.add_task_list_members(
            mock_task_list_repository, OWNER_UUID, LIST_UUID, [OTHER_UUID]
        )
        mock_task_list_repository.add_members.assert_called_once_with(
            LIST_UUID, [OTHER_UUID]
        )
        assert result is not None

    def test_member_cannot_invite(self, mock_task_list_repository):
        with pytest.raises(ForbiddenException):
            task_list_service.add_task_list_members(
                mock_task_list_repository, MEMBER_UUID, LIST_UUID, [OTHER_UUID]
            )

    def test_rejects_existing_member(self, mock_task_list_repository):
        with pytest.raises(ConflictException) as exc:
            task_list_service.add_task_list_members(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, [MEMBER_UUID]
            )
        assert exc.value.field == "member"

    def test_rejects_owner_invitation(self, mock_task_list_repository):
        with pytest.raises(ValidationException) as exc:
            task_list_service.add_task_list_members(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, [OWNER_UUID]
            )
        assert exc.value.field == "member_uuids"

    def test_rejects_empty_invitation(self, mock_task_list_repository):
        with pytest.raises(ValidationException):
            task_list_service.add_task_list_members(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, []
            )

    def test_rejects_unknown_user(self, mock_task_list_repository):
        mock_task_list_repository.existing_user_uuids.side_effect = lambda uuids: []
        with pytest.raises(ValidationException) as exc:
            task_list_service.add_task_list_members(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, [OTHER_UUID]
            )
        assert exc.value.field == "member_uuids"

    def test_rejects_when_capacity_exceeded(
        self, mock_task_list_repository, sample_task_list_bean
    ):
        sample_task_list_bean.member_uuids = [
            f"99999999-9999-4999-8999-{i:012d}" for i in range(30)
        ]
        with pytest.raises(ValidationException) as exc:
            task_list_service.add_task_list_members(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, [OTHER_UUID]
            )
        assert exc.value.field == "member_uuids"


@pytest.mark.unit
class TestRemoveTaskListMember:
    def test_owner_removes_member(self, mock_task_list_repository):
        task_list_service.remove_task_list_member(
            mock_task_list_repository, OWNER_UUID, LIST_UUID, MEMBER_UUID
        )
        mock_task_list_repository.remove_member.assert_called_once_with(
            LIST_UUID, MEMBER_UUID
        )

    def test_member_leaves_list(self, mock_task_list_repository):
        task_list_service.remove_task_list_member(
            mock_task_list_repository, MEMBER_UUID, LIST_UUID, MEMBER_UUID
        )
        mock_task_list_repository.remove_member.assert_called_once_with(
            LIST_UUID, MEMBER_UUID
        )

    def test_member_cannot_remove_someone_else(
        self, mock_task_list_repository, sample_task_list_bean
    ):
        sample_task_list_bean.member_uuids = [MEMBER_UUID, OTHER_UUID]
        with pytest.raises(ForbiddenException):
            task_list_service.remove_task_list_member(
                mock_task_list_repository, MEMBER_UUID, LIST_UUID, OTHER_UUID
            )

    def test_owner_cannot_be_removed(self, mock_task_list_repository):
        with pytest.raises(ValidationException) as exc:
            task_list_service.remove_task_list_member(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, OWNER_UUID
            )
        assert exc.value.field == "member_uuid"

    def test_unknown_membership_raises_not_found(self, mock_task_list_repository):
        mock_task_list_repository.remove_member.return_value = False
        with pytest.raises(NotFoundException):
            task_list_service.remove_task_list_member(
                mock_task_list_repository, OWNER_UUID, LIST_UUID, MEMBER_UUID
            )
