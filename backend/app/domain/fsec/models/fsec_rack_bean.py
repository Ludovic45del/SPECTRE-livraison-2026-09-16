"""Bean FsecRack - Rack de rangement FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecRackBean:
    """Bean représentant un rack de rangement FSEC."""

    id: Optional[int] = None
    label: str = ""
    color: str = ""
    is_full: bool = False
