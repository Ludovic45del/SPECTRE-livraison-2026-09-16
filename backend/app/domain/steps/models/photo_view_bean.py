"""Bean PhotoView - Vue/Photo individuelle."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class PhotoViewBean:
    """Bean représentant une vue/photo individuelle."""

    uuid: str = ""
    pictures_step_id: str = ""
    name: str = ""
    link: Optional[str] = None
