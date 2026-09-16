"""Bean PlanningFsecCellLink - Lien FSEC -> cellule planning."""

import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class PlanningFsecCellLinkBean:
    """Bean representant l'association d'un FSEC a une cellule du planning."""

    uuid: uuid_mod.UUID | None = None
    campaign_uuid: uuid_mod.UUID | None = None
    step_label: str = ""
    year: int = 0
    week_num: int = 0
    fsec_uuid: uuid_mod.UUID | None = None
