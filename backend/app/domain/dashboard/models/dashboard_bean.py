"""Beans Dashboard - DTOs pour les données agrégées du dashboard."""

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class CountsByStatusBean:
    """Compteurs par statut pour une entité."""

    total: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)


@dataclass
class FaCountsBean:
    """Compteurs FA avec statut et criticité."""

    total: int = 0
    by_status: Dict[str, int] = field(default_factory=dict)
    by_criticality: Dict[str, int] = field(default_factory=dict)


@dataclass
class DashboardCountsBean:
    """Compteurs agrégés pour le dashboard."""

    campaigns: CountsByStatusBean = field(default_factory=CountsByStatusBean)
    fsecs: CountsByStatusBean = field(default_factory=CountsByStatusBean)
    fas: FaCountsBean = field(default_factory=FaCountsBean)


@dataclass
class RecentActivityItemBean:
    """Élément d'activité récente."""

    id: str = ""
    type: str = ""
    name: str = ""
    status_id: Optional[int] = None
    last_updated: Optional[str] = None
    # Slug d'URL calculé (campagne/FSEC/FA/embase) pour les liens d'activité.
    slug: Optional[str] = None

    # Champs spécifiques campagne
    type_id: Optional[int] = None
    installation_id: Optional[int] = None
    year: Optional[int] = None
    semester: Optional[str] = None

    # Champs spécifiques FSEC
    campaign_name: Optional[str] = None
    localisation: Optional[str] = None

    # Champs spécifiques FA
    criticality_id: Optional[int] = None

    # Champs spécifiques Embase
    embase_type: Optional[str] = None
    localisation_actuelle: Optional[str] = None

    # Champs spécifiques Planning
    step_label: Optional[str] = None
    fsec_name: Optional[str] = None
