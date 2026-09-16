"""Repository PermeationStep - Implémentation."""

from django.db import transaction

from app.domain.steps.interface.steps_repository import IPermeationStepRepository
from app.domain.steps.models.permeation_step_bean import PermeationStepBean
from app.mapper.steps.permeation_step_mapper import (
    permeation_step_mapper_bean_to_entity,
    permeation_step_mapper_entity_to_bean,
)
from app.repository.steps.models.permeation_step_entity import PermeationStepEntity
from app.repository.steps.repositories.base_step_repository import BaseStepRepository


class PermeationStepRepository(
    BaseStepRepository[PermeationStepBean, PermeationStepEntity],
    IPermeationStepRepository,
):
    """Implémentation du repository PermeationStep."""

    entity_class = PermeationStepEntity
    bean_to_entity = staticmethod(permeation_step_mapper_bean_to_entity)
    entity_to_bean = staticmethod(permeation_step_mapper_entity_to_bean)
    select_related_fields = ("fsec_version_id",)

    @transaction.atomic
    def update(self, bean: PermeationStepBean) -> PermeationStepBean:
        """Met à jour une étape de perméation."""
        entity = PermeationStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.gas_type = bean.gas_type
        entity.target_pressure = bean.target_pressure
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.start_date = bean.start_date
        entity.estimated_end_date = bean.estimated_end_date
        entity.sensor_pressure = bean.sensor_pressure
        entity.computed_shot_pressure = bean.computed_shot_pressure
        entity.save()
        return self.entity_to_bean(entity)
