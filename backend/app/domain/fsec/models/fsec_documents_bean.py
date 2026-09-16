"""Bean FsecDocuments - Document FSEC."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class FsecDocumentsBean:
    """Bean représentant un document FSEC."""

    uuid: str = ""
    fsec_id: str = ""  # Référence vers version_uuid du FSEC
    subtype_id: Optional[int] = None
    name: str = ""
    path: str = ""
    date: Optional[date] = None
