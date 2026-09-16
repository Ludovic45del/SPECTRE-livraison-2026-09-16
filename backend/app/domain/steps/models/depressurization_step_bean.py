"""Bean DepressurizationStep - Étape de dépressurisation."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class DepressurizationStepBean:
    """Bean représentant une étape de dépressurisation."""

    uuid: str = ""
    fsec_version_id: str = ""
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    date_of_fulfilment: Optional[date] = None
    pressure_gauge: Optional[float] = None
    enclosure_pressure_measured: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    observations: Optional[str] = None
    depressurization_time_before_firing: Optional[float] = None
    computed_pressure_before_firing: Optional[float] = None
