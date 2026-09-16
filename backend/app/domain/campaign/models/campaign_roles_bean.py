"""Bean CampaignRoles - Rôle dans les équipes de campagne."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CampaignRolesBean:
    """Bean représentant un rôle de campagne."""

    id: Optional[int] = None
    label: str = ""
