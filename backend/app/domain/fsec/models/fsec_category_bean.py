"""Bean FsecCategory - Catégorie de FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecCategoryBean:
    """Bean représentant une catégorie de FSEC."""

    id: Optional[int] = None
    label: str = ""
    color: str = ""
