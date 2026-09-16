"""Bean Embase - Embase à gaz."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


@dataclass
class EmbaseBean:
    """Bean représentant une Embase à gaz."""

    # Identifiant
    uuid: str = ""

    # Identifiant & Type
    identifier: str = ""
    type: str = ""  # jet_de_gaz, hp, bp
    nombre_voies: int = 1  # 1 ou 2

    # --- VOIE V1 ---
    soufflet_v1: str = ""
    capteur_v1: str = ""
    offset_v1_mv: Optional[Decimal] = None
    mesurande_lie_v1_mv: Optional[Decimal] = None
    sensibilite_v1_mv: Optional[Decimal] = None
    signal_meteociel_v1_mv: Optional[Decimal] = None
    capteur_cible_pfeiffer_mbar: Optional[Decimal] = None
    etendue_v1_mbar: Optional[int] = None
    test_etancheite_he: str = ""
    test_capteur_mrg: str = ""
    etalonnage_date: Optional[date] = None
    observations_v1: str = ""

    # --- MECA ---
    operationnelle_aimant: bool = False
    operationnelle_broche: bool = False
    localisation_actuelle: str = ""
    cote_ve: Optional[Decimal] = None
    decalage_angulaire: str = ""
    chargement_mcc: str = ""

    # --- VOIE V2 ---
    soufflet_v2: str = ""
    capteur_v2: str = ""
    offset_v2_mv: Optional[Decimal] = None
    mesurande_lie_v2_mv: Optional[Decimal] = None
    sensibilite_v2_mv: Optional[Decimal] = None
    signal_meteociel_v2_mv: Optional[Decimal] = None
    capteur_cible_pfeiffer_v2_mbar: Optional[Decimal] = None
    etendue_v2_mbar: Optional[int] = None
    test_etancheite_he_v2: str = ""
    test_capteur_mrg_v2: str = ""
    observations_v2: str = ""
    electrovanne: bool = False

    # --- Historique FSECs gaz ---
    fsec_history: str = ""

    # Computed: date du dernier étalonnage (depuis la table ETALONNAGE)
    last_etalonnage_date: Optional[date] = None
    last_etalonnage_date_v1: Optional[date] = None
    last_etalonnage_date_v2: Optional[date] = None

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
