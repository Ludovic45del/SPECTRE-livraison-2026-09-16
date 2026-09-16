"""Bean pour l'historique FSEC d'une embase."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecHistoryEntryBean:
    """Représente une entrée d'historique FSEC pour une embase."""

    fsec_uuid: str
    fsec_version_uuid: str
    fsec_name: str
    campaign_name: str
    campaign_uuid: str
    date_of_fulfilment: Optional[str] = None
    gas_type: Optional[str] = None
