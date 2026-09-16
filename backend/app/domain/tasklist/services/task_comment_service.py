"""Service Commentaires — annotations des tâches d'une liste partagée.

Tout membre (ou le propriétaire) peut commenter une tâche. Un commentaire
n'est supprimable que par son auteur ou par le propriétaire de la liste.
"""

import logging
from typing import List

from app.domain.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.domain.tasklist.interface.task_comment_repository import ITaskCommentRepository
from app.domain.tasklist.interface.task_item_repository import ITaskItemRepository
from app.domain.tasklist.interface.task_list_repository import ITaskListRepository
from app.domain.tasklist.models.constants import MAX_COMMENT_LENGTH
from app.domain.tasklist.models.task_comment_bean import TaskCommentBean
from app.domain.tasklist.services.task_item_service import get_task_in_list
from app.domain.tasklist.services.task_list_service import get_visible_task_list

logger = logging.getLogger(__name__)


def get_task_comments(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    comment_repository: ITaskCommentRepository,
    requester_uuid: str,
    list_uuid: str,
    task_uuid: str,
) -> List[TaskCommentBean]:
    """Commentaires d'une tâche, en ordre chronologique."""
    get_visible_task_list(list_repository, requester_uuid, list_uuid)
    get_task_in_list(item_repository, list_uuid, task_uuid)
    return comment_repository.get_by_task(str(task_uuid))


def add_task_comment(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    comment_repository: ITaskCommentRepository,
    requester_uuid: str,
    list_uuid: str,
    task_uuid: str,
    text: str,
) -> TaskCommentBean:
    """Ajoute un commentaire du demandeur sur une tâche."""
    get_visible_task_list(list_repository, requester_uuid, list_uuid)
    get_task_in_list(item_repository, list_uuid, task_uuid)
    text = (text or "").strip()
    if not text:
        raise ValidationException("text", "Le commentaire ne peut pas être vide")
    if len(text) > MAX_COMMENT_LENGTH:
        raise ValidationException(
            "text", f"Le commentaire dépasse {MAX_COMMENT_LENGTH} caractères"
        )
    bean = TaskCommentBean(
        task_uuid=str(task_uuid), author_uuid=requester_uuid, text=text
    )
    result = comment_repository.create(bean)
    logger.info(
        "Commentaire ajouté: %s sur la tâche %s par %s",
        result.uuid,
        task_uuid,
        requester_uuid,
    )
    return result


def delete_task_comment(
    list_repository: ITaskListRepository,
    item_repository: ITaskItemRepository,
    comment_repository: ITaskCommentRepository,
    requester_uuid: str,
    list_uuid: str,
    task_uuid: str,
    comment_uuid: str,
) -> None:
    """Supprime un commentaire (auteur du commentaire ou propriétaire de la liste)."""
    task_list = get_visible_task_list(list_repository, requester_uuid, list_uuid)
    get_task_in_list(item_repository, list_uuid, task_uuid)
    comment = comment_repository.get_by_uuid(str(comment_uuid))
    if comment is None or comment.task_uuid != str(task_uuid):
        raise NotFoundException("TaskComment", str(comment_uuid))
    if requester_uuid != comment.author_uuid and requester_uuid != task_list.owner_uuid:
        raise ForbiddenException(
            "seul l'auteur du commentaire ou le propriétaire de la liste "
            "peut le supprimer"
        )
    comment_repository.delete(str(comment_uuid))
    logger.info(
        "Commentaire supprimé: %s (tâche %s) par %s",
        comment_uuid,
        task_uuid,
        requester_uuid,
    )
