"""Interface IBaseChildRepository - Repository générique pour entités enfants (Teams, Documents)."""

import abc
from typing import Generic, List, Optional, TypeVar

TBean = TypeVar("TBean")


class IBaseChildRepository(abc.ABC, Generic[TBean]):
    """Interface abstraite générique pour les repositories d'entités enfants.

    Utilisé pour Teams, Documents et autres entités liées à un parent (Campaign, FSEC).
    Remplace les interfaces dupliquées ICampaignTeamsRepository, ICampaignDocumentsRepository,
    IFsecTeamsRepository, IFsecDocumentsRepository.
    """

    @abc.abstractmethod
    def create(self, bean: TBean) -> TBean:
        """Crée une nouvelle entité."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[TBean]:
        """Récupère une entité par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_parent_uuid(self, parent_uuid: str) -> List[TBean]:
        """Récupère toutes les entités liées à un parent."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: TBean) -> TBean:
        """Met à jour une entité."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime une entité par son UUID."""
        raise NotImplementedError
