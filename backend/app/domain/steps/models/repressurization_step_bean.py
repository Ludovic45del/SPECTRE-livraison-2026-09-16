"""Bean RepressurizationStep - Étape de repressurisation."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class RepressurizationStepBean:
    """Bean représentant une étape de repressurisation."""

    uuid: str = ""
    fsec_version_id: str = ""
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    gas_type: Optional[str] = None
    start_date: Optional[datetime] = None
    estimated_end_date: Optional[datetime] = None
    sensor_pressure: Optional[float] = None
    computed_pressure: Optional[float] = None
