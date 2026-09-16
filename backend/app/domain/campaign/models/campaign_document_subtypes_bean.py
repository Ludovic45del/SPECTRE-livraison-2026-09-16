"""Bean CampaignDocumentSubtypes - Sous-type de document de campagne."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CampaignDocumentSubtypesBean:
    """Bean représentant un sous-type de document de campagne."""

    id: Optional[int] = None
    type_id: Optional[int] = None
    label: str = ""
