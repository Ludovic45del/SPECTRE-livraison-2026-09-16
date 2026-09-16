"""Bean MachineRoom — salle physique abritant des machines."""

from dataclasses import dataclass


@dataclass
class MachineRoomBean:
    """Bean représentant une salle du référentiel."""

    id: int = 0
    code: str = ""
    label: str = ""
    color: str = ""
    sort_order: int = 0
