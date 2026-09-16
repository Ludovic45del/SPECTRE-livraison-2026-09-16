"""Bean PermeationStep - Étape de perméation."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PermeationStepBean:
    """Bean représentant une étape de perméation."""

    uuid: str = ""
    fsec_version_id: str = ""
    gas_type: Optional[str] = None
    target_pressure: Optional[float] = None
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    start_date: Optional[datetime] = None
    estimated_end_date: Optional[datetime] = None
    sensor_pressure: Optional[float] = None
    computed_shot_pressure: Optional[float] = None
