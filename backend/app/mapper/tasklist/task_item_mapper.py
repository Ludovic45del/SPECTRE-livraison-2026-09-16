"""Mapper TaskItem - Conversion Entity ↔ Bean."""

from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.repository.tasklist.models.task_item_entity import TaskItemEntity


def _optional_uuid(raw) -> str | None:
    return str(raw) if raw else None


def task_item_entity_to_bean(
    entity: TaskItemEntity, comment_count: int = 0
) -> TaskItemBean:
    """Convertit une TaskItemEntity en TaskItemBean.

    `comment_count` est calculé par le repository (annotation) et injecté ici.
    """
    return TaskItemBean(
        uuid=str(entity.uuid),
        task_list_uuid=str(entity.task_list_id) if entity.task_list_id else "",
        title=entity.title,
        note=entity.note or "",
        priority=entity.priority,
        done=entity.done,
        position=entity.position,
        due_date=entity.due_date,
        assignee_uuid=_optional_uuid(entity.assignee_id),
        created_by_uuid=_optional_uuid(entity.created_by_id),
        completed_by_uuid=_optional_uuid(entity.completed_by_id),
        completed_at=entity.completed_at,
        comment_count=comment_count,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def task_item_bean_to_entity(bean: TaskItemBean) -> TaskItemEntity:
    """Convertit un TaskItemBean en TaskItemEntity."""
    entity = TaskItemEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.task_list_id = bean.task_list_uuid
    task_item_update_entity_from_bean(entity, bean)
    entity.created_by_id = bean.created_by_uuid
    return entity


def task_item_update_entity_from_bean(
    entity: TaskItemEntity, bean: TaskItemBean
) -> None:
    """Applique les champs éditables du bean sur l'entité (hors uuid/liste/auteur)."""
    entity.title = bean.title
    entity.note = bean.note or ""
    entity.priority = bean.priority
    entity.done = bean.done
    entity.position = bean.position
    entity.due_date = bean.due_date
    entity.assignee_id = bean.assignee_uuid
    entity.completed_by_id = bean.completed_by_uuid
    entity.completed_at = bean.completed_at
