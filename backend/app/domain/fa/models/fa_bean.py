"""Bean Fa - Fiche d'Anomalie."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class FaBean:
    """Bean représentant une Fiche d'Anomalie (FA)."""

    # Identifiant
    uuid: str = ""

    # Foreign Keys
    fsec_version_id: str = ""
    status_id: Optional[int] = None
    type_id: Optional[int] = None
    criticality_id: Optional[int] = None

    # Identifiant généré automatiquement
    identifier: str = ""

    # Phase Ouvert
    fsec_step_id: Optional[int] = None  # Étape FSEC où l'anomalie a été découverte
    fsec_step_other: Optional[str] = None  # Précision si "Autre" est sélectionné
    discoverer: str = ""
    discoverer_user_uuid: Optional[str] = None
    event_date: Optional[date] = None
    observation: str = ""
    location_equipment: Optional[str] = None
    quick_analysis: str = ""
    immediate_measures: Optional[str] = None
    iec_validation_open: bool = False
    iec_validation_open_date: Optional[date] = None
    iec_validation_open_name: Optional[str] = None
    iec_validation_open_user_uuid: Optional[str] = None

    # Phase En cours.
    # Pas de date de passage en cours : seules les dates d'ouverture et de clôture
    # sont conservées (KPIs DCP simplifiés).
    cause: Optional[str] = None
    experience_impact: Optional[str] = None
    iec_validation_progress: bool = False
    iec_validation_progress_name: Optional[str] = None
    iec_validation_progress_user_uuid: Optional[str] = None

    # Phase Clos
    closure_validation: Optional[str] = None
    closure_date: Optional[date] = None
    closure_validator_name: Optional[str] = None
    closure_validator_user_uuid: Optional[str] = None

    # Metadata
    created_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None

    # Champs dérivés (lecture seule, exposés dans /fas/ pour éviter au front
    # de re-fetcher /fsecs/ + /campaigns/ uniquement pour résoudre ces libellés).
    # Remplis par fa_mapper_entity_to_bean depuis le select_related élargi.
    fsec_name: Optional[str] = None
    # Nom complet d'affichage de la FSEC (``{année}-{installation}_{campagne}_{nom}``).
    fsec_display_name: Optional[str] = None
    installation: Optional[str] = None

    # Slugs d'URL calculés (non persistés) : `slug` de la FA (slugify identifier),
    # `fsec_slug` et `campaign_slug` des parents pour la navigation croisée.
    slug: Optional[str] = None
    fsec_slug: Optional[str] = None
    campaign_slug: Optional[str] = None
