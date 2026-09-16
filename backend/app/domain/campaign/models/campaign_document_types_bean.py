"""Bean CampaignDocumentTypes - Type de document de campagne."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CampaignDocumentTypesBean:
    """Bean représentant un type de document de campagne."""

    id: Optional[int] = None
    label: str = ""
