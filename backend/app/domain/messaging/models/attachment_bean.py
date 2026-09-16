"""Beans Attachment — pièce jointe d'un message (lecture) et fichier reçu (écriture)."""

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class AttachmentBean:
    """Pièce jointe persistée d'un message.

    `url` est l'adresse publique du fichier sous `MEDIA_URL` (None si le
    fichier n'est plus disponible) ; `is_image` permet au frontend d'afficher
    une vignette plutôt qu'une puce de téléchargement.
    """

    uuid: str = ""
    original_name: str = ""
    content_type: str = ""
    size: int = 0
    url: Optional[str] = None
    is_image: bool = False


@dataclass
class AttachmentUploadBean:
    """Fichier reçu à la publication d'un message.

    `file` est un objet fichier opaque (UploadedFile côté API) : le domaine ne
    l'inspecte jamais, il ne valide que `name`, `content_type` et `size`.
    """

    name: str = ""
    content_type: str = ""
    size: int = 0
    file: Any = None
