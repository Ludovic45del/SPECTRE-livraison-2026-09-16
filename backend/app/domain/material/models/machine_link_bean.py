"""Bean MachineLink — lien documentaire associé à une machine."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class MachineLinkBean:
    """Bean représentant un lien externe rattaché à une machine."""

    uuid: str = ""
    machine_uuid: str = ""
    label: str = ""
    url: str = ""
    position: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
