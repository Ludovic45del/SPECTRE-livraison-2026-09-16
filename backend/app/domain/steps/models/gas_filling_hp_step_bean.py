"""Bean GasFillingHpStep - Remplissage gaz haute pression."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class GasFillingHpStepBean:
    """Bean représentant un remplissage gaz haute pression."""

    uuid: str = ""
    fsec_version_id: str = ""
    embase_id: Optional[str] = None
    embase_identifier: Optional[str] = None
    leak_rate_dtri: Optional[str] = None
    gas_type: Optional[str] = None
    experiment_pressure: Optional[float] = None
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    date_of_fulfilment: Optional[date] = None
    gas_base: Optional[int] = None
    gas_container: Optional[int] = None
    observations: Optional[str] = None
