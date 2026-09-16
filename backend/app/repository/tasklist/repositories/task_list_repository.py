"""Repository TaskList — CRUD des listes partagées + adhésions.

Toutes les lectures hydratent en masse (anti N+1) : membres via une seule
requête sur TASK_LIST_MEMBER, compteurs de tâches via annotations.
"""

from typing import Dict, List, Optional

from django.db import transaction
from django.db.models import Count, Q

from app.domain.tasklist.interface.task_list_repository import ITaskListRepository
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.mapper.tasklist.task_item_mapper import task_item_entity_to_bean
from app.mapper.tasklist.task_list_mapper import (
    task_list_bean_to_entity,
    task_list_entity_to_bean,
    task_list_update_entity_from_bean,
)
from app.repository.tasklist.models.task_item_entity import TaskItemEntity
from app.repository.tasklist.models.task_list_entity import TaskListEntity
from app.repository.tasklist.models.task_list_member_entity import TaskListMemberEntity
from app.repository.user.models.user_profile_entity import UserProfileEntity


def _annotate_counts(queryset):
    """Ajoute task_count/done_count au queryset de listes."""
    return queryset.annotate(
        agg_task_count=Count("items", distinct=True),
        agg_done_count=Count("items", filter=Q(items__done=True), distinct=True),
    )


def _members_by_list(list_uuids: List[str]) -> Dict[str, List[str]]:
    """Récupère les uuids membres de plusieurs listes en une seule requête."""
    members: Dict[str, List[str]] = {}
    rows = (
        TaskListMemberEntity.objects.filter(task_list_id__in=list_uuids)
        .order_by("created_at")
        .values_list("task_list_id", "member_id")
    )
    for list_uuid, member_uuid in rows:
        members.setdefault(str(list_uuid), []).append(str(member_uuid))
    return members


def _entity_to_bean_with_aggregates(
    entity: TaskListEntity,
    members: Dict[str, List[str]],
    tasks: Optional[List[TaskItemBean]] = None,
) -> TaskListBean:
    return task_list_entity_to_bean(
        entity,
        member_uuids=members.get(str(entity.uuid), []),
        task_count=getattr(entity, "agg_task_count", 0),
        done_count=getattr(entity, "agg_done_count", 0),
        tasks=tasks,
    )


class TaskListRepository(ITaskListRepository):
    """Implémentation ORM du repository des listes partagées."""

    def get_all_for_user(self, user_uuid: str) -> List[TaskListBean]:
        entities = list(
            _annotate_counts(
                TaskListEntity.objects.filter(
                    Q(owner_id=user_uuid) | Q(memberships__member_id=user_uuid)
                ).distinct()
            )
        )
        members = _members_by_list([str(e.uuid) for e in entities])
        return [_entity_to_bean_with_aggregates(e, members) for e in entities]

    def get_by_uuid(self, uuid: str) -> Optional[TaskListBean]:
        try:
            entity = _annotate_counts(TaskListEntity.objects.filter(uuid=uuid)).get()
        except (TaskListEntity.DoesNotExist, ValueError):
            return None
        members = _members_by_list([str(entity.uuid)])
        return _entity_to_bean_with_aggregates(entity, members)

    def get_detail_by_uuid(self, uuid: str) -> Optional[TaskListBean]:
        try:
            entity = _annotate_counts(TaskListEntity.objects.filter(uuid=uuid)).get()
        except (TaskListEntity.DoesNotExist, ValueError):
            return None
        members = _members_by_list([str(entity.uuid)])
        task_entities = TaskItemEntity.objects.filter(task_list_id=uuid).annotate(
            agg_comment_count=Count("comments")
        )
        tasks = [
            task_item_entity_to_bean(t, comment_count=t.agg_comment_count)
            for t in task_entities
        ]
        return _entity_to_bean_with_aggregates(entity, members, tasks=tasks)

    @transaction.atomic
    def create(self, bean: TaskListBean) -> TaskListBean:
        entity = task_list_bean_to_entity(bean)
        entity.save()
        if bean.member_uuids:
            TaskListMemberEntity.objects.bulk_create(
                TaskListMemberEntity(task_list_id=entity.uuid, member_id=member_uuid)
                for member_uuid in bean.member_uuids
            )
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def update(self, bean: TaskListBean) -> TaskListBean:
        entity = TaskListEntity.objects.get(uuid=bean.uuid)
        task_list_update_entity_from_bean(entity, bean)
        entity.save()
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = TaskListEntity.objects.get(uuid=uuid)
        except (TaskListEntity.DoesNotExist, ValueError):
            return False
        entity.delete()
        return True

    @transaction.atomic
    def add_members(self, list_uuid: str, member_uuids: List[str]) -> None:
        TaskListMemberEntity.objects.bulk_create(
            (
                TaskListMemberEntity(task_list_id=list_uuid, member_id=member_uuid)
                for member_uuid in member_uuids
            ),
            ignore_conflicts=True,
        )

    @transaction.atomic
    def remove_member(self, list_uuid: str, member_uuid: str) -> bool:
        deleted, _ = TaskListMemberEntity.objects.filter(
            task_list_id=list_uuid, member_id=member_uuid
        ).delete()
        return deleted > 0

    def existing_user_uuids(self, user_uuids: List[str]) -> List[str]:
        found = UserProfileEntity.objects.filter(uuid__in=user_uuids).values_list(
            "uuid", flat=True
        )
        return [str(u) for u in found]
