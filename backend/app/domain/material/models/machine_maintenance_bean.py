"""Bean MachineMaintenance — intervention de maintenance sur une machine."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from app.domain.material.models.constants import MAINTENANCE_TYPE_PREVENTIVE


@dataclass
class MachineMaintenanceBean:
    """Bean représentant une intervention de maintenance (préventive ou curative)."""

    uuid: str = ""
    machine_uuid: str = ""
    date: Optional[date] = None
    type: str = MAINTENANCE_TYPE_PREVENTIVE
    performed_by_user_uuid: Optional[str] = None
    performed_by_name: str = ""
    description: str = ""
    next_maintenance_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
