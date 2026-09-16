"""Bean PlanningWeekState - Semaine grisee."""

import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class PlanningWeekStateBean:
    """Bean representant l'etat d'une semaine dans le planning."""

    uuid: uuid_mod.UUID | None = None
    year: int = 0
    week_num: int = 0
    state: str = ""  # 'vacances' | 'fermeture'
