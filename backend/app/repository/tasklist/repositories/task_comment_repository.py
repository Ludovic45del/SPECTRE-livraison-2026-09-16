"""Repository TaskComment — commentaires des tâches."""

from typing import List, Optional

from django.db import transaction

from app.domain.tasklist.interface.task_comment_repository import ITaskCommentRepository
from app.domain.tasklist.models.task_comment_bean import TaskCommentBean
from app.mapper.tasklist.task_comment_mapper import (
    task_comment_bean_to_entity,
    task_comment_entity_to_bean,
)
from app.repository.tasklist.models.task_comment_entity import TaskCommentEntity


class TaskCommentRepository(ITaskCommentRepository):
    """Implémentation ORM du repository des commentaires."""

    def get_by_task(self, task_uuid: str) -> List[TaskCommentBean]:
        return [
            task_comment_entity_to_bean(entity)
            for entity in TaskCommentEntity.objects.filter(task_id=task_uuid)
        ]

    def get_by_uuid(self, uuid: str) -> Optional[TaskCommentBean]:
        try:
            entity = TaskCommentEntity.objects.get(uuid=uuid)
        except (TaskCommentEntity.DoesNotExist, ValueError):
            return None
        return task_comment_entity_to_bean(entity)

    @transaction.atomic
    def create(self, bean: TaskCommentBean) -> TaskCommentBean:
        entity = task_comment_bean_to_entity(bean)
        entity.save()
        return task_comment_entity_to_bean(
            TaskCommentEntity.objects.get(uuid=entity.uuid)
        )

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = TaskCommentEntity.objects.get(uuid=uuid)
        except (TaskCommentEntity.DoesNotExist, ValueError):
            return False
        entity.delete()
        return True
