"""Mapper TaskComment - Conversion Entity ↔ Bean."""

from app.domain.tasklist.models.task_comment_bean import TaskCommentBean
from app.repository.tasklist.models.task_comment_entity import TaskCommentEntity


def task_comment_entity_to_bean(entity: TaskCommentEntity) -> TaskCommentBean:
    """Convertit une TaskCommentEntity en TaskCommentBean."""
    return TaskCommentBean(
        uuid=str(entity.uuid),
        task_uuid=str(entity.task_id) if entity.task_id else "",
        author_uuid=str(entity.author_id) if entity.author_id else None,
        text=entity.text,
        created_at=entity.created_at,
    )


def task_comment_bean_to_entity(bean: TaskCommentBean) -> TaskCommentEntity:
    """Convertit un TaskCommentBean en TaskCommentEntity."""
    entity = TaskCommentEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.task_id = bean.task_uuid
    entity.author_id = bean.author_uuid
    entity.text = bean.text
    return entity
