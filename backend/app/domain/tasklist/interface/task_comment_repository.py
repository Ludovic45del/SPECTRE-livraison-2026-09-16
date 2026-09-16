"""Interface ITaskCommentRepository — commentaires des tâches."""

import abc
from typing import List, Optional

from app.domain.tasklist.models.task_comment_bean import TaskCommentBean


class ITaskCommentRepository(abc.ABC):
    """Contrat d'accès aux commentaires d'une tâche."""

    @abc.abstractmethod
    def get_by_task(self, task_uuid: str) -> List[TaskCommentBean]:
        """Commentaires d'une tâche, en ordre chronologique."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[TaskCommentBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create(self, bean: TaskCommentBean) -> TaskCommentBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        raise NotImplementedError
