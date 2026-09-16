"""Bean LabEvent - Evenement sur une machine."""

import datetime
import uuid as uuid_mod
from dataclasses import dataclass


@dataclass
class LabEventBean:
    """Bean representant un evenement labo (maintenance, panne, etc.)."""

    uuid: uuid_mod.UUID | None = None
    machine_uuid: uuid_mod.UUID | None = None
    category: str = ""
    description: str = ""
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
