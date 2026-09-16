"""Repository TaskItem — CRUD des tâches d'une liste partagée."""

from typing import Optional

from django.db import transaction
from django.db.models import Count, Max

from app.domain.tasklist.interface.task_item_repository import ITaskItemRepository
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.mapper.tasklist.task_item_mapper import (
    task_item_bean_to_entity,
    task_item_entity_to_bean,
    task_item_update_entity_from_bean,
)
from app.repository.tasklist.models.task_item_entity import TaskItemEntity


class TaskItemRepository(ITaskItemRepository):
    """Implémentation ORM du repository des tâches."""

    def get_by_uuid(self, uuid: str) -> Optional[TaskItemBean]:
        try:
            entity = (
                TaskItemEntity.objects.filter(uuid=uuid)
                .annotate(agg_comment_count=Count("comments"))
                .get()
            )
        except (TaskItemEntity.DoesNotExist, ValueError):
            return None
        return task_item_entity_to_bean(entity, comment_count=entity.agg_comment_count)

    @transaction.atomic
    def create(self, bean: TaskItemBean) -> TaskItemBean:
        entity = task_item_bean_to_entity(bean)
        entity.save()
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def update(self, bean: TaskItemBean) -> TaskItemBean:
        entity = TaskItemEntity.objects.get(uuid=bean.uuid)
        task_item_update_entity_from_bean(entity, bean)
        entity.save()
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = TaskItemEntity.objects.get(uuid=uuid)
        except (TaskItemEntity.DoesNotExist, ValueError):
            return False
        entity.delete()
        return True

    def next_position(self, list_uuid: str) -> int:
        max_position = TaskItemEntity.objects.filter(task_list_id=list_uuid).aggregate(
            max_position=Max("position")
        )["max_position"]
        return 0 if max_position is None else max_position + 1
