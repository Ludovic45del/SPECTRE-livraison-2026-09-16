"""Bean Machine — équipement physique rattaché à une salle."""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional

from app.domain.material.models.constants import MACHINE_STATUS_IN_SERVICE
from app.domain.material.models.machine_link_bean import MachineLinkBean


@dataclass
class MachineBean:
    """Bean représentant une machine, agrégeant ses liens documentaires.

    `links` est chargé par le repository lors du `get_*` — il participe à la
    persistance directe (création/MAJ via endpoints dédiés).
    """

    uuid: str = ""
    name: str = ""
    room_id: int = 0
    reference: str = ""
    manufacturer: str = ""
    model: str = ""
    commissioning_date: Optional[date] = None
    status: str = MACHINE_STATUS_IN_SERVICE
    responsible_user_uuid: Optional[str] = None
    description: str = ""

    # Agrégats (lecture seule à travers ce bean)
    links: List[MachineLinkBean] = field(default_factory=list)
    # Prochaine échéance de maintenance la plus proche (dérivée des maintenances).
    next_maintenance_date: Optional[date] = None
    last_maintenance_date: Optional[date] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
