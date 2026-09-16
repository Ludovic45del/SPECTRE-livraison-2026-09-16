"""Repository RepressurizationStep - Implémentation."""

from django.db import transaction

from app.domain.steps.interface.steps_repository import IRepressurizationStepRepository
from app.domain.steps.models.repressurization_step_bean import RepressurizationStepBean
from app.mapper.steps.repressurization_step_mapper import (
    repressurization_step_mapper_bean_to_entity,
    repressurization_step_mapper_entity_to_bean,
)
from app.repository.steps.models.repressurization_step_entity import (
    RepressurizationStepEntity,
)
from app.repository.steps.repositories.base_step_repository import BaseStepRepository


class RepressurizationStepRepository(
    BaseStepRepository[RepressurizationStepBean, RepressurizationStepEntity],
    IRepressurizationStepRepository,
):
    """Implémentation du repository RepressurizationStep."""

    entity_class = RepressurizationStepEntity
    bean_to_entity = staticmethod(repressurization_step_mapper_bean_to_entity)
    entity_to_bean = staticmethod(repressurization_step_mapper_entity_to_bean)
    select_related_fields = ("fsec_version_id",)

    @transaction.atomic
    def update(self, bean: RepressurizationStepBean) -> RepressurizationStepBean:
        """Met à jour une étape de repressurisation."""
        entity = RepressurizationStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.gas_type = bean.gas_type
        entity.start_date = bean.start_date
        entity.estimated_end_date = bean.estimated_end_date
        entity.sensor_pressure = bean.sensor_pressure
        entity.computed_pressure = bean.computed_pressure
        entity.save()
        return self.entity_to_bean(entity)
