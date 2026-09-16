"""Bean CampaignDocuments - Document de campagne."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class CampaignDocumentsBean:
    """Bean représentant un document de campagne."""

    uuid: str = ""
    campaign_uuid: str = ""
    subtype_id: Optional[int] = None
    file_type_id: Optional[int] = None
    name: str = ""
    path: str = ""
    date: Optional[date] = None
