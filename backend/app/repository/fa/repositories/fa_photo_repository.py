"""Repository FaPhoto - Implémentation IFaPhotoRepository."""

from typing import Any, List, Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max

from app.domain.fa.interface.fa_photo_repository import IFaPhotoRepository
from app.domain.fa.models.fa_photo_bean import FaPhotoBean
from app.mapper.fa.fa_photo_mapper import fa_photo_mapper_entity_to_bean
from app.repository.fa.models.fa_photo_entity import FaPhotoEntity


class FaPhotoRepository(IFaPhotoRepository):
    """Implémentation du repository des photos de FA."""

    def list_by_fa(self, fa_uuid: str) -> List[FaPhotoBean]:
        """Liste les photos d'une FA (ordre de galerie)."""
        entities = FaPhotoEntity.objects.filter(fa_id=fa_uuid).order_by(
            "order", "created_at"
        )
        return [fa_photo_mapper_entity_to_bean(e) for e in entities]

    def get_by_uuid(self, photo_uuid: str) -> Optional[FaPhotoBean]:
        """Récupère une photo par son UUID.

        Un photo_uuid malformé (segment d'URL libre) est traité comme « absent »
        (None) plutôt que de propager une ValidationError → 500.
        """
        try:
            entity = FaPhotoEntity.objects.get(uuid=photo_uuid)
            return fa_photo_mapper_entity_to_bean(entity)
        except (FaPhotoEntity.DoesNotExist, ValidationError, ValueError):
            return None

    @transaction.atomic
    def add(
        self, fa_uuid: str, image_file: Any, caption: Optional[str] = None
    ) -> FaPhotoBean:
        """Ajoute une photo en fin de galerie (order = max(order) + 1)."""
        next_order = FaPhotoEntity.objects.filter(fa_id=fa_uuid).aggregate(
            m=Max("order")
        )["m"]
        entity = FaPhotoEntity(
            fa_id=fa_uuid,
            image=image_file,
            caption=caption,
            order=(next_order + 1) if next_order is not None else 0,
        )
        entity.save()
        return fa_photo_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, photo_uuid: str) -> bool:
        """Supprime la photo et son fichier disque (pas d'orphelin)."""
        try:
            entity = FaPhotoEntity.objects.get(uuid=photo_uuid)
        except (FaPhotoEntity.DoesNotExist, ValidationError, ValueError):
            return False
        if entity.image:
            entity.image.delete(save=False)
        entity.delete()
        return True
