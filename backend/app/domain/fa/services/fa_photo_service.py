"""Service FaPhoto - Logique métier de la galerie de photos d'une FA."""

import logging
from typing import Any, List, Optional

from app.domain.exceptions import NotFoundException
from app.domain.fa.interface.fa_photo_repository import IFaPhotoRepository
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.models.fa_photo_bean import FaPhotoBean

logger = logging.getLogger(__name__)


def list_fa_photos(
    photo_repository: IFaPhotoRepository, fa_uuid: str
) -> List[FaPhotoBean]:
    """Liste les photos d'une FA (galerie ordonnée)."""
    return photo_repository.list_by_fa(fa_uuid)


def add_fa_photo(
    photo_repository: IFaPhotoRepository,
    fa_repository: IFaRepository,
    fa_uuid: str,
    image_file: Any,
    caption: Optional[str] = None,
) -> FaPhotoBean:
    """Ajoute une photo à une FA après avoir vérifié qu'elle existe.

    Raises:
        NotFoundException: si la FA n'existe pas.
    """
    if fa_repository.get_by_uuid(fa_uuid) is None:
        raise NotFoundException("FA", fa_uuid)
    result = photo_repository.add(fa_uuid, image_file, caption)
    logger.info("Photo ajoutée à la FA %s: %s", fa_uuid, result.uuid)
    return result


def delete_fa_photo(
    photo_repository: IFaPhotoRepository, fa_uuid: str, photo_uuid: str
) -> bool:
    """Supprime une photo d'une FA.

    Vérifie que la photo existe ET appartient bien à cette FA (évite qu'un
    photo_uuid d'une autre FA soit supprimé via une mauvaise route).

    Raises:
        NotFoundException: si la photo n'existe pas ou n'appartient pas à la FA.
    """
    photo = photo_repository.get_by_uuid(photo_uuid)
    # Comparaison insensible à la casse : photo.fa_uuid est l'UUID canonique
    # (minuscule) tandis que fa_uuid vient de l'URL et peut être en majuscules.
    if photo is None or str(photo.fa_uuid).lower() != str(fa_uuid).lower():
        raise NotFoundException("FaPhoto", photo_uuid)
    photo_repository.delete(photo_uuid)
    logger.info("Photo %s supprimée de la FA %s", photo_uuid, fa_uuid)
    return True
