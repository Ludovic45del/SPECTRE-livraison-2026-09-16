"""Repository PhotoView - Implémentation IPhotoViewRepository."""

import uuid as uuid_module
from typing import List, Optional

from django.db import transaction

from app.domain.steps.interface.steps_repository import IPhotoViewRepository
from app.domain.steps.models.photo_view_bean import PhotoViewBean
from app.mapper.steps.photo_view_mapper import (
    photo_view_mapper_bean_to_entity,
    photo_view_mapper_entity_to_bean,
)
from app.repository.steps.models.photo_view_entity import PhotoViewEntity


class PhotoViewRepository(IPhotoViewRepository):
    """Implémentation du repository PhotoView."""

    select_related_fields = ("pictures_step_id",)

    def _base_queryset(self):
        """Returns queryset with select_related applied."""
        return PhotoViewEntity.objects.select_related(*self.select_related_fields)

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[PhotoViewBean]:
        """Récupère toutes les vues/photos d'un FSEC (via PicturesStep)."""
        entities = self._base_queryset().filter(
            pictures_step_id__fsec_version_id=fsec_version_id
        )
        return [photo_view_mapper_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create(self, bean: PhotoViewBean) -> PhotoViewBean:
        """Crée une nouvelle vue/photo."""
        entity = photo_view_mapper_bean_to_entity(bean)
        entity.save()
        return photo_view_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[PhotoViewBean]:
        """Récupère une vue/photo par son UUID."""
        try:
            uuid_value = uuid_module.UUID(uuid) if isinstance(uuid, str) else uuid
            entity = self._base_queryset().get(uuid=uuid_value)
            return photo_view_mapper_entity_to_bean(entity)
        except PhotoViewEntity.DoesNotExist:
            return None
        except ValueError:
            return None

    def get_by_pictures_step_id(self, pictures_step_id: str) -> List[PhotoViewBean]:
        """Récupère toutes les vues/photos d'un PicturesStep."""
        entities = self._base_queryset().filter(
            pictures_step_id_id=uuid_module.UUID(pictures_step_id)
        )
        return [photo_view_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: PhotoViewBean) -> PhotoViewBean:
        """Met à jour une vue/photo."""
        uuid_value = (
            uuid_module.UUID(bean.uuid) if isinstance(bean.uuid, str) else bean.uuid
        )
        entity = PhotoViewEntity.objects.get(uuid=uuid_value)
        if bean.pictures_step_id:
            entity.pictures_step_id_id = bean.pictures_step_id
        entity.name = bean.name
        entity.link = bean.link
        entity.save()
        return photo_view_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une vue/photo par son UUID."""
        try:
            uuid_value = uuid_module.UUID(uuid) if isinstance(uuid, str) else uuid
            entity = PhotoViewEntity.objects.get(uuid=uuid_value)
            entity.delete()
            return True
        except (PhotoViewEntity.DoesNotExist, ValueError):
            return False
