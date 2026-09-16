"""Bean FaPhoto - Photo de la galerie d'une Fiche d'Anomalie."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class FaPhotoBean:
    """Bean représentant une photo de FA."""

    uuid: str = ""
    fa_uuid: str = ""
    # URL relative servie via MEDIA_URL (ex: /api/media/fa/photos/xxx.jpg).
    image_url: Optional[str] = None
    caption: Optional[str] = None
    order: int = 0
    created_at: Optional[datetime] = None
