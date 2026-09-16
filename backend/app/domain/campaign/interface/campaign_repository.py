"""Interface ICampaignRepository - Repository abstrait pour Campaign."""

import abc
from typing import List, Optional

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.domain.shared.base_child_repository_interface import IBaseChildRepository


class ICampaignRepository(abc.ABC):
    """Interface abstraite pour le repository Campaign."""

    @abc.abstractmethod
    def create(self, bean: CampaignBean) -> CampaignBean:
        """Crée une nouvelle campagne."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[CampaignBean]:
        """Récupère une campagne par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_slug(self, slug: str) -> Optional[CampaignBean]:
        """Récupère une campagne par son slug d'URL calculé."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all(
        self, limit: Optional[int] = None, offset: int = 0
    ) -> List[CampaignBean]:
        """Récupère toutes les campagnes avec pagination optionnelle."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_all(self) -> int:
        """Retourne le nombre total de campagnes."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: CampaignBean) -> CampaignBean:
        """Met à jour une campagne."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime une campagne par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_name_year_semester(self, name: str, year: int, semester: str) -> bool:
        """Vérifie si une campagne existe avec ce triplet unique."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_duplicate(
        self, exclude_uuid: str, name: str, year: int, semester: str
    ) -> bool:
        """Vérifie si une AUTRE campagne existe avec ce triplet (exclut l'UUID donné)."""
        raise NotImplementedError


class ICampaignTeamsRepository(IBaseChildRepository[CampaignTeamsBean]):
    """Interface pour le repository CampaignTeams.

    Hérite de IBaseChildRepository qui fournit: create, get_by_uuid, get_by_parent_uuid, update, delete.
    Ajoute get_by_campaign_uuid comme alias de get_by_parent_uuid pour la rétro-compatibilité.
    """

    @abc.abstractmethod
    def get_by_campaign_uuid(self, campaign_uuid: str) -> List[CampaignTeamsBean]:
        """Récupère tous les membres d'une équipe de campagne."""
        raise NotImplementedError


class ICampaignDocumentsRepository(IBaseChildRepository[CampaignDocumentsBean]):
    """Interface pour le repository CampaignDocuments.

    Hérite de IBaseChildRepository qui fournit: create, get_by_uuid, get_by_parent_uuid, update, delete.
    Ajoute get_by_campaign_uuid comme alias de get_by_parent_uuid pour la rétro-compatibilité.
    """

    @abc.abstractmethod
    def get_by_campaign_uuid(self, campaign_uuid: str) -> List[CampaignDocumentsBean]:
        """Récupère tous les documents d'une campagne."""
        raise NotImplementedError
