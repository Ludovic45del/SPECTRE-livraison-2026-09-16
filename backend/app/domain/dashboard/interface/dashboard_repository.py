"""Interface IDashboardRepository - Repository abstrait pour le Dashboard."""

import abc
from typing import List

from app.domain.dashboard.models.dashboard_bean import (
    DashboardCountsBean,
    RecentActivityItemBean,
)


class IDashboardRepository(abc.ABC):
    """Interface abstraite pour le repository Dashboard (lecture seule)."""

    @abc.abstractmethod
    def get_counts(self) -> DashboardCountsBean:
        """Récupère les compteurs agrégés (campagnes, FSECs, FAs par statut/criticité)."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_recent_activity(self, limit: int = 10) -> List[RecentActivityItemBean]:
        """Récupère les éléments d'activité récente (campagnes, FSECs, FAs)."""
        raise NotImplementedError
