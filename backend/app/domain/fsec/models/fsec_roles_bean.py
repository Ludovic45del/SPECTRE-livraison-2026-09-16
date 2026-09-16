"""Bean FsecRoles - Rôle dans les équipes FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecRolesBean:
    """Bean représentant un rôle FSEC."""

    id: Optional[int] = None
    label: str = ""
