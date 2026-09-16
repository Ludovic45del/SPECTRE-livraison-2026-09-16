"""Bean PlanningMemberPeriod - Disponibilite d'un membre."""

import datetime
import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class PlanningMemberPeriodBean:
    """Bean representant une periode d'indisponibilite d'un membre."""

    uuid: uuid_mod.UUID | None = None
    member_name: str = ""
    member_role: str = ""
    year: int = 0
    period_type: str = ""
    commentaire: str | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
