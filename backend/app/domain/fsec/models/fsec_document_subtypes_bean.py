"""Bean FsecDocumentSubtypes - Sous-type de document FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecDocumentSubtypesBean:
    """Bean représentant un sous-type de document FSEC."""

    id: Optional[int] = None
    type_id: Optional[int] = None
    label: str = ""
