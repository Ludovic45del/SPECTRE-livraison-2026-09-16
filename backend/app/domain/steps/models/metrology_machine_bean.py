"""Bean MetrologyMachine - Machine de métrologie."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class MetrologyMachineBean:
    """Bean représentant une machine de métrologie."""

    id: Optional[int] = None
    label: str = ""
    color: str = ""
