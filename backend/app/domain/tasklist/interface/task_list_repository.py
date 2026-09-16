"""Interface ITaskListRepository — listes partagées et adhésions."""

import abc
from typing import List, Optional

from app.domain.tasklist.models.task_list_bean import TaskListBean


class ITaskListRepository(abc.ABC):
    """Contrat d'accès aux listes partagées.

    Toutes les lectures hydratent `member_uuids`, `task_count` et `done_count`.
    """

    @abc.abstractmethod
    def get_all_for_user(self, user_uuid: str) -> List[TaskListBean]:
        """Liste les listes dont l'utilisateur est propriétaire ou membre."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[TaskListBean]:
        """Récupère une liste (sans ses tâches)."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_detail_by_uuid(self, uuid: str) -> Optional[TaskListBean]:
        """Récupère une liste avec ses tâches (compteurs de commentaires inclus)."""
        raise NotImplementedError

    @abc.abstractmethod
    def create(self, bean: TaskListBean) -> TaskListBean:
        """Crée la liste et ses adhésions initiales dans une transaction."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: TaskListBean) -> TaskListBean:
        """Met à jour nom / description / couleur."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime la liste (cascade sur membres, tâches, commentaires)."""
        raise NotImplementedError

    @abc.abstractmethod
    def add_members(self, list_uuid: str, member_uuids: List[str]) -> None:
        """Ajoute des adhésions (les doublons doivent être filtrés en amont)."""
        raise NotImplementedError

    @abc.abstractmethod
    def remove_member(self, list_uuid: str, member_uuid: str) -> bool:
        """Retire une adhésion. False si l'utilisateur n'était pas membre."""
        raise NotImplementedError

    @abc.abstractmethod
    def existing_user_uuids(self, user_uuids: List[str]) -> List[str]:
        """Filtre les uuids correspondant à des profils utilisateurs existants."""
        raise NotImplementedError
