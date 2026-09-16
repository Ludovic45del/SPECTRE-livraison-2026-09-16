"""Tests unitaires des mappers du module Listes de tâches partagées."""

from datetime import date, datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.domain.tasklist.models.task_comment_bean import TaskCommentBean
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.mapper.tasklist.task_comment_mapper import (
    task_comment_bean_to_entity,
    task_comment_entity_to_bean,
)
from app.mapper.tasklist.task_item_mapper import (
    task_item_bean_to_entity,
    task_item_entity_to_bean,
    task_item_update_entity_from_bean,
)
from app.mapper.tasklist.task_list_api_mapper import (
    task_comment_bean_to_api,
    task_comment_beans_to_api,
    task_item_api_to_bean,
    task_item_bean_to_api,
    task_list_api_to_bean,
    task_list_bean_to_api,
    task_list_beans_to_api,
    task_list_detail_bean_to_api,
)
from app.mapper.tasklist.task_list_mapper import (
    task_list_bean_to_entity,
    task_list_entity_to_bean,
    task_list_update_entity_from_bean,
)

LIST_UUID = "44444444-4444-4444-8444-444444444444"
TASK_UUID = "55555555-5555-4555-8555-555555555555"
USER_UUID = "11111111-1111-4111-8111-111111111111"
NOW = datetime(2026, 7, 3, 10, 0, tzinfo=timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# TaskList mapper (Entity ↔ Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestTaskListMapper:
    def _mock_entity(self):
        entity = MagicMock()
        entity.uuid = LIST_UUID
        entity.name = "Ma liste"
        entity.description = "Desc"
        entity.color = "blue"
        entity.owner_id = USER_UUID
        entity.created_at = NOW
        entity.updated_at = NOW
        return entity

    def test_entity_to_bean_with_aggregates(self):
        bean = task_list_entity_to_bean(
            self._mock_entity(),
            member_uuids=["m1"],
            task_count=3,
            done_count=1,
        )
        assert bean.uuid == LIST_UUID
        assert bean.name == "Ma liste"
        assert bean.owner_uuid == USER_UUID
        assert bean.member_uuids == ["m1"]
        assert bean.task_count == 3
        assert bean.done_count == 1
        assert bean.tasks == []

    def test_entity_to_bean_defaults(self):
        entity = self._mock_entity()
        entity.description = None
        entity.owner_id = None
        bean = task_list_entity_to_bean(entity)
        assert bean.description == ""
        assert bean.owner_uuid == ""
        assert bean.member_uuids == []

    def test_bean_to_entity(self):
        bean = TaskListBean(
            uuid=LIST_UUID,
            name="Liste",
            description="d",
            color="red",
            owner_uuid=USER_UUID,
        )
        entity = task_list_bean_to_entity(bean)
        assert str(entity.uuid) == LIST_UUID
        assert entity.name == "Liste"
        assert entity.color == "red"
        assert entity.owner_id == USER_UUID

    def test_bean_to_entity_without_uuid_generates_default(self):
        bean = TaskListBean(name="Liste", owner_uuid=USER_UUID)
        entity = task_list_bean_to_entity(bean)
        assert entity.uuid is not None

    def test_update_entity_from_bean(self):
        entity = MagicMock()
        bean = TaskListBean(name="Nouveau nom", description="", color="green")
        task_list_update_entity_from_bean(entity, bean)
        assert entity.name == "Nouveau nom"
        assert entity.color == "green"


# ─────────────────────────────────────────────────────────────────────────────
# TaskItem mapper (Entity ↔ Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestTaskItemMapper:
    def _mock_entity(self):
        entity = MagicMock()
        entity.uuid = TASK_UUID
        entity.task_list_id = LIST_UUID
        entity.title = "Tâche"
        entity.note = "Note"
        entity.priority = "high"
        entity.done = True
        entity.position = 2
        entity.due_date = date(2026, 7, 10)
        entity.assignee_id = USER_UUID
        entity.created_by_id = USER_UUID
        entity.completed_by_id = None
        entity.completed_at = None
        entity.created_at = NOW
        entity.updated_at = NOW
        return entity

    def test_entity_to_bean(self):
        bean = task_item_entity_to_bean(self._mock_entity(), comment_count=5)
        assert bean.uuid == TASK_UUID
        assert bean.task_list_uuid == LIST_UUID
        assert bean.priority == "high"
        assert bean.done is True
        assert bean.due_date == date(2026, 7, 10)
        assert bean.assignee_uuid == USER_UUID
        assert bean.completed_by_uuid is None
        assert bean.comment_count == 5

    def test_entity_to_bean_null_fields(self):
        entity = self._mock_entity()
        entity.note = None
        entity.assignee_id = None
        entity.created_by_id = None
        bean = task_item_entity_to_bean(entity)
        assert bean.note == ""
        assert bean.assignee_uuid is None
        assert bean.created_by_uuid is None
        assert bean.comment_count == 0

    def test_bean_to_entity(self):
        bean = TaskItemBean(
            uuid=TASK_UUID,
            task_list_uuid=LIST_UUID,
            title="Tâche",
            priority="low",
            created_by_uuid=USER_UUID,
        )
        entity = task_item_bean_to_entity(bean)
        assert str(entity.uuid) == TASK_UUID
        assert entity.task_list_id == LIST_UUID
        assert entity.priority == "low"
        assert entity.created_by_id == USER_UUID

    def test_update_entity_from_bean_preserves_author(self):
        entity = MagicMock()
        bean = TaskItemBean(title="Maj", priority="normal", done=False)
        task_item_update_entity_from_bean(entity, bean)
        assert entity.title == "Maj"
        # created_by n'est pas touché par la mise à jour
        assert "created_by_id" not in [c[0] for c in entity.method_calls]


# ─────────────────────────────────────────────────────────────────────────────
# TaskComment mapper (Entity ↔ Bean)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestTaskCommentMapper:
    def test_entity_to_bean(self):
        entity = MagicMock()
        entity.uuid = "66666666-6666-4666-8666-666666666666"
        entity.task_id = TASK_UUID
        entity.author_id = USER_UUID
        entity.text = "Un commentaire"
        entity.created_at = NOW
        bean = task_comment_entity_to_bean(entity)
        assert bean.task_uuid == TASK_UUID
        assert bean.author_uuid == USER_UUID
        assert bean.text == "Un commentaire"

    def test_entity_to_bean_orphan_author(self):
        entity = MagicMock()
        entity.uuid = "66666666-6666-4666-8666-666666666666"
        entity.task_id = TASK_UUID
        entity.author_id = None
        entity.text = "x"
        entity.created_at = NOW
        bean = task_comment_entity_to_bean(entity)
        assert bean.author_uuid is None

    def test_bean_to_entity(self):
        bean = TaskCommentBean(
            task_uuid=TASK_UUID, author_uuid=USER_UUID, text="Comment"
        )
        entity = task_comment_bean_to_entity(bean)
        assert entity.task_id == TASK_UUID
        assert entity.author_id == USER_UUID
        assert entity.text == "Comment"


# ─────────────────────────────────────────────────────────────────────────────
# Mapper API (Bean ↔ dict)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestTaskListApiMapper:
    def test_api_to_bean_defaults(self):
        bean = task_list_api_to_bean({})
        assert bean.name == ""
        assert bean.color == "default"

    def test_api_to_bean_full(self):
        bean = task_list_api_to_bean(
            {"name": "Liste", "description": "d", "color": "purple"}
        )
        assert bean.name == "Liste"
        assert bean.color == "purple"

    def test_bean_to_api(self):
        bean = TaskListBean(
            uuid=LIST_UUID,
            name="Liste",
            owner_uuid=USER_UUID,
            member_uuids=["m1", "m2"],
            task_count=4,
            done_count=2,
            created_at=NOW,
        )
        data = task_list_bean_to_api(bean)
        assert data["uuid"] == LIST_UUID
        assert data["member_uuids"] == ["m1", "m2"]
        assert data["task_count"] == 4
        assert data["done_count"] == 2
        assert data["created_at"] == NOW.isoformat()
        assert "tasks" not in data

    def test_beans_to_api(self):
        beans = [TaskListBean(uuid=LIST_UUID, name="A")]
        assert len(task_list_beans_to_api(beans)) == 1

    def test_detail_bean_to_api_includes_tasks(self):
        bean = TaskListBean(
            uuid=LIST_UUID,
            name="Liste",
            tasks=[TaskItemBean(uuid=TASK_UUID, title="T")],
        )
        data = task_list_detail_bean_to_api(bean)
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["uuid"] == TASK_UUID


@pytest.mark.unit
class TestTaskItemApiMapper:
    def test_api_to_bean_parses_date(self):
        bean = task_item_api_to_bean(
            {
                "title": "T",
                "due_date": "2026-07-10",
                "assignee_uuid": USER_UUID,
                "priority": "critical",
            }
        )
        assert bean.due_date == date(2026, 7, 10)
        assert bean.assignee_uuid == USER_UUID
        assert bean.priority == "critical"

    def test_api_to_bean_defaults(self):
        bean = task_item_api_to_bean({"title": "T"})
        assert bean.priority == "normal"
        assert bean.due_date is None
        assert bean.assignee_uuid is None

    def test_bean_to_api(self):
        bean = TaskItemBean(
            uuid=TASK_UUID,
            task_list_uuid=LIST_UUID,
            title="T",
            due_date=date(2026, 7, 10),
            comment_count=3,
            created_at=NOW,
        )
        data = task_item_bean_to_api(bean)
        assert data["due_date"] == "2026-07-10"
        assert data["comment_count"] == 3
        assert data["task_list_uuid"] == LIST_UUID


@pytest.mark.unit
class TestTaskCommentApiMapper:
    def test_bean_to_api(self):
        bean = TaskCommentBean(
            uuid="c1",
            task_uuid=TASK_UUID,
            author_uuid=USER_UUID,
            text="Hello",
            created_at=NOW,
        )
        data = task_comment_bean_to_api(bean)
        assert data["text"] == "Hello"
        assert data["author_uuid"] == USER_UUID
        assert data["created_at"] == NOW.isoformat()

    def test_beans_to_api(self):
        beans = [TaskCommentBean(uuid="c1", task_uuid=TASK_UUID, text="x")]
        assert len(task_comment_beans_to_api(beans)) == 1
