"""Interface IEtalonnageRepository - Repository abstrait pour Etalonnage."""

import abc
import datetime
from typing import List, Optional

from app.domain.embase.models.etalonnage_bean import EtalonnageBean


class IEtalonnageRepository(abc.ABC):
    """Interface abstraite pour le repository Etalonnage."""

    @abc.abstractmethod
    def create(self, bean: EtalonnageBean) -> EtalonnageBean:
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[EtalonnageBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_embase_uuid(
        self, embase_uuid: str, voie: Optional[int] = None
    ) -> List[EtalonnageBean]:
        """Récupère les étalonnages d'une embase, optionnellement filtrés par voie."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def get_latest_by_embase_voie(
        self, embase_uuid: str, voie: int
    ) -> Optional[EtalonnageBean]:
        """Récupère l'étalonnage le plus récent pour une embase/voie."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_embase_voie_date(
        self, embase_uuid: str, voie: int, date: datetime.date
    ) -> bool:
        """Vérifie si un étalonnage existe pour cette embase/voie/date."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_by_embase_uuid(self, embase_uuid: str, voie: Optional[int] = None) -> int:
        """Retourne le nombre d'étalonnages pour une embase."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_embase_uuid_paginated(
        self,
        embase_uuid: str,
        voie: Optional[int] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[EtalonnageBean]:
        """Récupère les étalonnages d'une embase avec pagination."""
        raise NotImplementedError
