"""Repository SealingStep - Implémentation ISealingStepRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.steps.interface.steps_repository import ISealingStepRepository
from app.domain.steps.models.sealing_step_bean import SealingStepBean
from app.mapper.steps.sealing_step_mapper import (
    sealing_step_mapper_bean_to_entity,
    sealing_step_mapper_entity_to_bean,
)
from app.repository.steps.models.sealing_step_entity import SealingStepEntity


class SealingStepRepository(ISealingStepRepository):
    """Implémentation du repository SealingStep."""

    select_related_fields = ("metrology_step_id", "rack_id")

    def _base_queryset(self):
        """Returns queryset with select_related applied."""
        return SealingStepEntity.objects.select_related(*self.select_related_fields)

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[SealingStepBean]:
        """Récupère toutes les étapes de scellement d'un FSEC (via MetrologyStep)."""
        entities = self._base_queryset().filter(
            metrology_step_id__fsec_version_id=fsec_version_id
        )
        return [sealing_step_mapper_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create(self, bean: SealingStepBean) -> SealingStepBean:
        """Crée une nouvelle étape de scellement."""
        entity = sealing_step_mapper_bean_to_entity(bean)
        entity.save()
        return sealing_step_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[SealingStepBean]:
        """Récupère une étape de scellement par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return sealing_step_mapper_entity_to_bean(entity)
        except SealingStepEntity.DoesNotExist:
            return None

    def get_by_metrology_step_id(
        self, metrology_step_id: str
    ) -> Optional[SealingStepBean]:
        """Récupère l'étape de scellement liée à une métrologie."""
        try:
            entity = self._base_queryset().get(metrology_step_id_id=metrology_step_id)
            return sealing_step_mapper_entity_to_bean(entity)
        except SealingStepEntity.DoesNotExist:
            return None

    @transaction.atomic
    def update(self, bean: SealingStepBean) -> SealingStepBean:
        """Met à jour une étape de scellement."""
        entity = SealingStepEntity.objects.get(uuid=bean.uuid)
        entity.metrology_step_id_id = bean.metrology_step_id
        entity.date = bean.date
        entity.metrologist_name = bean.metrologist_name
        entity.metrologist_user_id = bean.metrologist_user_uuid
        entity.rack_id_id = bean.rack_id
        entity.interface_io = bean.interface_io
        entity.comments = bean.comments
        entity.verification_status = bean.verification_status
        entity.verification_remark = bean.verification_remark
        entity.save()
        return sealing_step_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une étape de scellement par son UUID."""
        try:
            entity = SealingStepEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except SealingStepEntity.DoesNotExist:
            return False
