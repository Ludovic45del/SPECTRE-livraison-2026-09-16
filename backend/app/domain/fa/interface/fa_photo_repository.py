"""Interface IFaPhotoRepository - Repository abstrait pour les photos de FA."""

import abc
from typing import Any, List, Optional

from app.domain.fa.models.fa_photo_bean import FaPhotoBean


class IFaPhotoRepository(abc.ABC):
    """Interface abstraite pour le repository des photos de FA."""

    @abc.abstractmethod
    def list_by_fa(self, fa_uuid: str) -> List[FaPhotoBean]:
        """Liste les photos d'une FA, ordonnées par `order` puis `created_at`."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, photo_uuid: str) -> Optional[FaPhotoBean]:
        """Récupère une photo par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def add(
        self, fa_uuid: str, image_file: Any, caption: Optional[str] = None
    ) -> FaPhotoBean:
        """Ajoute une photo à une FA (placée en fin de galerie)."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, photo_uuid: str) -> bool:
        """Supprime définitivement une photo (et son fichier disque)."""
        raise NotImplementedError
