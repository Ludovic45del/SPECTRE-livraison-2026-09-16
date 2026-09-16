"""Repository PicturesStep - Implémentation IPicturesStepRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.steps.interface.steps_repository import IPicturesStepRepository
from app.domain.steps.models.pictures_step_bean import PicturesStepBean
from app.mapper.steps.pictures_step_mapper import (
    pictures_step_mapper_bean_to_entity,
    pictures_step_mapper_entity_to_bean,
)
from app.repository.steps.models.pictures_step_entity import PicturesStepEntity


class PicturesStepRepository(IPicturesStepRepository):
    """Implémentation du repository PicturesStep."""

    select_related_fields = ("fsec_version_id",)

    def _base_queryset(self):
        """Returns queryset with select_related applied."""
        return PicturesStepEntity.objects.select_related(*self.select_related_fields)

    @transaction.atomic
    def create(self, bean: PicturesStepBean) -> PicturesStepBean:
        """Crée une nouvelle étape de photos."""
        entity = pictures_step_mapper_bean_to_entity(bean)
        entity.save()
        return pictures_step_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[PicturesStepBean]:
        """Récupère une étape de photos par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return pictures_step_mapper_entity_to_bean(entity)
        except PicturesStepEntity.DoesNotExist:
            return None

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[PicturesStepBean]:
        """Récupère toutes les étapes de photos d'un FSEC."""
        entities = self._base_queryset().filter(fsec_version_id_id=fsec_version_id)
        return [pictures_step_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: PicturesStepBean) -> PicturesStepBean:
        """Met à jour une étape de photos."""
        entity = PicturesStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.date = bean.date
        entity.comments = bean.comments
        entity.save()
        return pictures_step_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une étape de photos par son UUID."""
        try:
            entity = PicturesStepEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except PicturesStepEntity.DoesNotExist:
            return False
