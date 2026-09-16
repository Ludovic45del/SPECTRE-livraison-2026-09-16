"""Bean CampaignTypes - Type de campagne."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CampaignTypesBean:
    """Bean représentant un type de campagne."""

    id: Optional[int] = None
    label: str = ""
    color: str = ""
