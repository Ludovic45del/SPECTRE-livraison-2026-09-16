"""Bean FsecStatus - Statut de FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecStatusBean:
    """Bean représentant un statut de FSEC."""

    id: Optional[int] = None
    label: str = ""
    color: str = ""
