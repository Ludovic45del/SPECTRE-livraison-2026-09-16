"""Bean PlanningCellAnnotation - Annotation textuelle sur une cellule campagne."""

import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class PlanningCellAnnotationBean:
    """Bean representant une annotation sur une cellule du planning campagne."""

    uuid: uuid_mod.UUID | None = None
    campaign_uuid: uuid_mod.UUID | None = None
    step_label: str = ""
    year: int = 0
    week_num: int = 0
    text: str = ""
