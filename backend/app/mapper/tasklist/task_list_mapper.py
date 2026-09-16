"""Mapper TaskList - Conversion Entity ↔ Bean."""

from typing import List, Optional

from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.repository.tasklist.models.task_list_entity import TaskListEntity


def task_list_entity_to_bean(
    entity: TaskListEntity,
    member_uuids: Optional[List[str]] = None,
    task_count: int = 0,
    done_count: int = 0,
    tasks: Optional[List[TaskItemBean]] = None,
) -> TaskListBean:
    """Convertit une TaskListEntity en TaskListBean.

    Les agrégats (membres, compteurs, tâches) sont calculés par le repository
    et injectés ici pour éviter les requêtes N+1.
    """
    return TaskListBean(
        uuid=str(entity.uuid),
        name=entity.name,
        description=entity.description or "",
        color=entity.color,
        owner_uuid=str(entity.owner_id) if entity.owner_id else "",
        member_uuids=member_uuids or [],
        task_count=task_count,
        done_count=done_count,
        tasks=tasks or [],
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def task_list_bean_to_entity(bean: TaskListBean) -> TaskListEntity:
    """Convertit un TaskListBean en TaskListEntity (sans les agrégats)."""
    entity = TaskListEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.name = bean.name
    entity.description = bean.description or ""
    entity.color = bean.color
    entity.owner_id = bean.owner_uuid
    return entity


def task_list_update_entity_from_bean(
    entity: TaskListEntity, bean: TaskListBean
) -> None:
    """Applique les champs éditables du bean sur l'entité (hors uuid/owner)."""
    entity.name = bean.name
    entity.description = bean.description or ""
    entity.color = bean.color
