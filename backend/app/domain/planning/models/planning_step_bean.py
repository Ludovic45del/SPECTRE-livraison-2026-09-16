"""Bean PlanningStep - Etape de planning campagne (referentiel)."""

from dataclasses import dataclass


@dataclass
class PlanningStepBean:
    """Bean representant une etape du planning campagne."""

    id: int | None = None
    label: str = ""
    color: str = ""
    display_order: int = 0
    min_status_for_done: int | None = None
    use_shooting_date: bool = False
    gas_only: bool = False
