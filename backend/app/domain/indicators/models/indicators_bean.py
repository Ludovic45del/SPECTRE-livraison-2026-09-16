"""Beans Indicators - DTOs pour les indicateurs agrégés."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class StepDurationBean:
    """Durée d'une transition entre deux étapes du workflow FSEC (en jours).

    Calculée sur les FSEC tirées dans l'année (shooting_date dans l'année filtrée),
    pour disposer d'un pipeline complet et éviter les biais de FSEC en cours.
    """

    key: str
    label: str
    count: int = 0
    avg_days: Optional[float] = None
    median_days: Optional[float] = None
    min_days: Optional[float] = None
    max_days: Optional[float] = None
    is_gas: bool = False


@dataclass
class FaIndicatorsBean:
    """Indicateurs agrégés sur les Fiches d'Anomalie.

    Note : on ne suit plus la phase intermédiaire "En cours" en délais (la
    "date de passage en cours" a été supprimée du modèle). Le suivi se limite
    à : évènement → ouverture, ouverture → clôture, et lifecycle complet
    (évènement → clôture).
    """

    total_created_in_year: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)
    by_criticality: Dict[str, int] = field(default_factory=dict)
    by_discovery_step: Dict[str, int] = field(default_factory=dict)
    open_stock_all_years: int = 0
    avg_event_to_open_days: Optional[float] = None
    avg_open_to_closure_days: Optional[float] = None
    avg_total_lifecycle_days: Optional[float] = None
    created_per_month: Dict[str, int] = field(default_factory=dict)


@dataclass
class FsecIndicatorsBean:
    """Indicateurs agrégés sur les FSEC."""

    total_created_in_year: int = 0
    total_shot_in_year: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)
    by_category: Dict[str, int] = field(default_factory=dict)
    avg_cycle_time_days: Optional[float] = None
    median_cycle_time_days: Optional[float] = None
    shot_per_month: Dict[str, int] = field(default_factory=dict)


@dataclass
class CampaignVolumeBean:
    """Volume de FSEC d'une campagne (pour le classement par densité)."""

    uuid: str
    name: str
    fsec_count: int = 0


@dataclass
class CampaignIndicatorsBean:
    """Indicateurs agrégés sur les campagnes de la période (year + semester).

    Les campagnes portent directement `year` et `semester` : le filtrage est
    donc direct sur l'entité campagne (pas via la FSEC comme pour FA/FSEC).
    `total_fsec`/`total_fsec_shot` recoupent volontairement la section FSEC,
    mais sont déclinés ici par campagne pour le ratio de densité et le top.
    """

    total_in_period: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)
    by_type: Dict[str, int] = field(default_factory=dict)
    by_installation: Dict[str, int] = field(default_factory=dict)
    total_fsec: int = 0
    total_fsec_shot: int = 0
    avg_fsec_per_campaign: Optional[float] = None
    avg_duration_days: Optional[float] = None
    started_per_month: Dict[str, int] = field(default_factory=dict)
    top_by_volume: List[CampaignVolumeBean] = field(default_factory=list)


@dataclass
class IndicatorsBean:
    """Conteneur global des indicateurs pour une année donnée."""

    year: int = 0
    fa: FaIndicatorsBean = field(default_factory=FaIndicatorsBean)
    fsec: FsecIndicatorsBean = field(default_factory=FsecIndicatorsBean)
    campaign: CampaignIndicatorsBean = field(default_factory=CampaignIndicatorsBean)
    step_durations: List[StepDurationBean] = field(default_factory=list)
    bottleneck_step_key: Optional[str] = None
