"""Bean FsecDocumentTypes - Type de document FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecDocumentTypesBean:
    """Bean représentant un type de document FSEC."""

    id: Optional[int] = None
    label: str = ""
