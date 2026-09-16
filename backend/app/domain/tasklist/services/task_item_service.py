"""Service Tâches — CRUD des tâches d'une liste partagée.

Le propriétaire et les membres d'une liste ont les mêmes droits sur ses
tâches : création, édition, complétion, suppression.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.tasklist.interface.task_item_repository import ITaskItemRepository
from app.domain.tasklist.interface.task_list_repository import ITaskListRepository
from app.domain.tasklist.models.constants import (
    MAX_TASK_NOTE_LENGTH,
    MAX_TASK_TITLE_LENGTH,
    VALID_PRIORITIES,
)
from app.domain.tasklist.models.task_item_bean import TaskItemBean
from app.domain.tasklist.models.task_list_bean import TaskListBean
from app.domain.tasklist.services.task_list_service import get_visible_task_list

logger = logging.getLogger(__name__)

# Champs modifiables via update_task ; les autres clés sont ignorées.
_UPDATABLE_FIELDS = {
    "title",
    "note",
    "priority",
    "done",
    "due_date",
    "assignee_uuid",
    "position",
}


def get_task_in_list(
    item_repository: ITaskItemRepository, list_uuid: str, task_uuid: str
) -> TaskItemBean:
    """Récupère une tâche en vérifiant son rattachement à la liste."""
    task = item_repository.get_by_uuid(str(task_uuid))
    if task is None or task.task_list_uuid != str(list_uuid):
        raise NotFoundException("TaskItem", str(task_uuid))
    return task


def _validate_task_payload(bean: TaskItemBean, task_list: TaskListBean) -> None:
    """Valide les champs éditables d'une tâche."""
    if not bean.title or not bean.title.strip():
        raise ValidationException("title", "Le titre de la tâche est requis")
    if len(bean.title.strip()) > MAX_TASK_TITLE_LENGTH:
        raise ValidationException(
            "title", f"Le titre dépasse {MAX_TASK_TITLE_LENGTH} caractères"
        )
    if len(bean.note or "") > MAX_TASK_NOTE_LENGTH:
        raise ValidationException(
            "note", f"La note dépasse {MAX_TASK_NOTE_LENGTH} caractères"
        )
    if bean.priority not in VALID_PRIORITIES:
        raise ValidationException("priority", f"Priorité inconnue: {bean.priority}")
    if bean.assignee_uuid is not None:
        allowed = {task_list.owner_uuid, *task_list.member_uuids}
        if str(bean.assignee_uuid) not in allowed:
            raise ValidationException(
                "assignee_uuid", "L'assigné doit être membre de la liste"
            )


def _apply_done_transition(bean: TaskItemBean, done: bool, requester_uuid: str) -> None:
    """Renseigne ou efface les champs de complétion selon la transition."""
    if done and not bean.done:
        bean.completed_by_uuid = requester_uuid
        bean.completed_at = datetime.now(timezone.utc)
    elif not done and bean.done:
        bean.completed_by_uuid = None
        bean.completed_at = None
    bean.done = done


def create_task(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    requester_uuid: str,
    list_uuid: str,
    bean: TaskItemBean,
) -> TaskItemBean:
    """Crée une tâche en fin de liste (visible par tous les membres)."""
    task_list = get_visible_task_list(list_repository, requester_uuid, list_uuid)
    bean.task_list_uuid = str(list_uuid)
    bean.title = (bean.title or "").strip()
    bean.created_by_uuid = requester_uuid
    bean.position = item_repository.next_position(str(list_uuid))
    # Une tâche naît toujours « à faire »
    bean.done = False
    bean.completed_by_uuid = None
    bean.completed_at = None
    _validate_task_payload(bean, task_list)
    result = item_repository.create(bean)
    logger.info(
        "Tâche créée: %s (%s) dans la liste %s par %s",
        result.uuid,
        result.title,
        list_uuid,
        requester_uuid,
    )
    return result


def update_task(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    requester_uuid: str,
    list_uuid: str,
    task_uuid: str,
    changes: dict,
) -> TaskItemBean:
    """Met à jour partiellement une tâche (seuls les champs fournis changent)."""
    task_list = get_visible_task_list(list_repository, requester_uuid, list_uuid)
    bean = get_task_in_list(item_repository, list_uuid, task_uuid)

    fields = {k: v for k, v in changes.items() if k in _UPDATABLE_FIELDS}
    if "title" in fields:
        bean.title = str(fields["title"] or "").strip()
    if "note" in fields:
        bean.note = str(fields["note"] or "")
    if "priority" in fields:
        bean.priority = str(fields["priority"] or "")
    if "due_date" in fields:
        bean.due_date = fields["due_date"]
    if "assignee_uuid" in fields:
        raw_assignee: Optional[str] = fields["assignee_uuid"]
        bean.assignee_uuid = str(raw_assignee) if raw_assignee else None
    if "position" in fields:
        position = int(fields["position"])
        if position < 0:
            raise ValidationException("position", "La position doit être positive")
        bean.position = position
    if "done" in fields:
        _apply_done_transition(bean, bool(fields["done"]), requester_uuid)

    _validate_task_payload(bean, task_list)
    return item_repository.update(bean)


def delete_task(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    requester_uuid: str,
    list_uuid: str,
    task_uuid: str,
) -> None:
    """Supprime une tâche de la liste."""
    get_visible_task_list(list_repository, requester_uuid, list_uuid)
    get_task_in_list(item_repository, list_uuid, task_uuid)
    item_repository.delete(str(task_uuid))
    logger.info(
        "Tâche supprimée: %s (liste %s) par %s", task_uuid, list_uuid, requester_uuid
    )
