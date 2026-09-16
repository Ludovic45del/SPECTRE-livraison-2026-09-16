"""Interface ITaskItemRepository — tâches d'une liste partagée."""

import abc
from typing import Optional

from app.domain.tasklist.models.task_item_bean import TaskItemBean


class ITaskItemRepository(abc.ABC):
    """Contrat d'accès aux tâches. Les lectures hydratent `comment_count`."""

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[TaskItemBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create(self, bean: TaskItemBean) -> TaskItemBean:
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: TaskItemBean) -> TaskItemBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def next_position(self, list_uuid: str) -> int:
        """Position suivante en fin de liste (max + 1, 0 si liste vide)."""
        raise NotImplementedError
