"""Bean Etalonnage - Données d'étalonnage d'une embase."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


@dataclass
class EtalonnageBean:
    """Bean représentant un étalonnage d'embase."""

    uuid: str = ""
    embase_uuid: str = ""
    voie: int = 1

    # Données de calibration
    offset_0_bar_mv: Optional[Decimal] = None
    mesurande_0_bar_lie: Optional[Decimal] = None
    signal_etendue_mv: Optional[Decimal] = None
    signal_pa_meteociel: Optional[Decimal] = None

    # Metadata étalonnage
    date: Optional[date] = None
    operateur: str = ""
    operateur_user_uuid: Optional[str] = None

    # Metadata système
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
