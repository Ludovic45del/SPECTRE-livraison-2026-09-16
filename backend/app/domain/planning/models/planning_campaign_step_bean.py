"""Bean PlanningCampaignStep - Etape programmee d'une campagne."""

import datetime
import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class PlanningCampaignStepBean:
    """Bean representant une etape programmee (Assemblage, Metrologie, etc.)."""

    uuid: uuid_mod.UUID | None = None
    campaign_uuid: uuid_mod.UUID | None = None
    fsec_uuid: uuid_mod.UUID | None = None
    step_label: str = ""
    year: int = 0
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
