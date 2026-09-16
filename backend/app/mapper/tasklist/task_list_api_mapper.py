"""Mapper API TaskList/TaskItem/TaskComment - Conversion Bean ↔ dict API."""

from typing import Any, Dict, List

from app.domain.tasklist.models.constants import LIST_COLOR_DEFAULT, PRIORITY_NORMAL
from app.domain.tasklist.models.task_comment_bean import TaskCommentBean
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string


def task_list_api_to_bean(data: Dict[str, Any]) -> TaskListBean:
    """Convertit des données API en TaskListBean (création/mise à jour)."""
    return TaskListBean(
        uuid=str(data.get("uuid", "") or ""),
        name=data.get("name", "") or "",
        description=data.get("description", "") or "",
        color=data.get("color", LIST_COLOR_DEFAULT) or LIST_COLOR_DEFAULT,
    )


def task_list_bean_to_api(bean: TaskListBean) -> Dict[str, Any]:
    """Convertit un TaskListBean en dict API (résumé, sans les tâches)."""
    return {
        "uuid": bean.uuid,
        "name": bean.name,
        "description": bean.description,
        "color": bean.color,
        "owner_uuid": bean.owner_uuid,
        "member_uuids": list(bean.member_uuids),
        "task_count": bean.task_count,
        "done_count": bean.done_count,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def task_list_beans_to_api(beans: List[TaskListBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de TaskListBean en dicts API."""
    return [task_list_bean_to_api(bean) for bean in beans]


def task_list_detail_bean_to_api(bean: TaskListBean) -> Dict[str, Any]:
    """Convertit un TaskListBean détaillé (tâches incluses) en dict API."""
    data = task_list_bean_to_api(bean)
    data["tasks"] = [task_item_bean_to_api(task) for task in bean.tasks]
    return data


def task_item_api_to_bean(data: Dict[str, Any]) -> TaskItemBean:
    """Convertit des données API en TaskItemBean (création)."""
    assignee_uuid = data.get("assignee_uuid")
    return TaskItemBean(
        uuid=str(data.get("uuid", "") or ""),
        title=data.get("title", "") or "",
        note=data.get("note", "") or "",
        priority=data.get("priority", PRIORITY_NORMAL) or PRIORITY_NORMAL,
        due_date=parse_date_string(data.get("due_date")),
        assignee_uuid=str(assignee_uuid) if assignee_uuid else None,
    )


def task_item_bean_to_api(bean: TaskItemBean) -> Dict[str, Any]:
    """Convertit un TaskItemBean en dict API."""
    return {
        "uuid": bean.uuid,
        "task_list_uuid": bean.task_list_uuid,
        "title": bean.title,
        "note": bean.note,
        "priority": bean.priority,
        "done": bean.done,
        "position": bean.position,
        "due_date": format_date_for_api(bean.due_date),
        "assignee_uuid": bean.assignee_uuid,
        "created_by_uuid": bean.created_by_uuid,
        "completed_by_uuid": bean.completed_by_uuid,
        "completed_at": format_date_for_api(bean.completed_at),
        "comment_count": bean.comment_count,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def task_comment_bean_to_api(bean: TaskCommentBean) -> Dict[str, Any]:
    """Convertit un TaskCommentBean en dict API."""
    return {
        "uuid": bean.uuid,
        "task_uuid": bean.task_uuid,
        "author_uuid": bean.author_uuid,
        "text": bean.text,
        "created_at": format_date_for_api(bean.created_at),
    }


def task_comment_beans_to_api(beans: List[TaskCommentBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de TaskCommentBean en dicts API."""
    return [task_comment_bean_to_api(bean) for bean in beans]
