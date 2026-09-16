"""Bean PicturesStep - Étape de photos."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class PicturesStepBean:
    """Bean représentant une étape de photos."""

    uuid: str = ""
    fsec_version_id: str = ""
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    date: Optional[date] = None
    comments: Optional[str] = None
