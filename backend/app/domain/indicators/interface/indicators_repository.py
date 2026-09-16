"""Interface IIndicatorsRepository - Repository abstrait pour les indicateurs."""

import abc
from typing import List, Optional

from app.domain.indicators.models.indicators_bean import (
    CampaignIndicatorsBean,
    FaIndicatorsBean,
    FsecIndicatorsBean,
    StepDurationBean,
)


class IIndicatorsRepository(abc.ABC):
    """Interface abstraite pour le repository Indicators (lecture seule).

    Toutes les méthodes acceptent une période définie par :
    - `year`  : année cible (obligatoire).
    - `semester` : 1 (janv→juin), 2 (juil→déc) ou None (toute l'année).
    """

    @abc.abstractmethod
    def get_fa_indicators(
        self, year: int, semester: Optional[int] = None
    ) -> FaIndicatorsBean:
        """Indicateurs FA : volumétrie, ventilations, délais de traitement."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_fsec_indicators(
        self, year: int, semester: Optional[int] = None
    ) -> FsecIndicatorsBean:
        """Indicateurs FSEC : volumétrie, ventilations, cycle time, throughput."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_campaign_indicators(
        self, year: int, semester: Optional[int] = None, limit: int = 8
    ) -> CampaignIndicatorsBean:
        """Indicateurs campagnes : volumétrie, ventilations, densité FSEC, durée."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_step_durations(
        self, year: int, semester: Optional[int] = None
    ) -> List[StepDurationBean]:
        """Délais moyens/médians entre étapes (sur FSEC tirées dans la période)."""
        raise NotImplementedError
