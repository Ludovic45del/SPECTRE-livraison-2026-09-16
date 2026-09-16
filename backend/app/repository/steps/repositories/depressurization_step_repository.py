"""Repository DepressurizationStep - Implémentation."""

from django.db import transaction

from app.domain.steps.interface.steps_repository import IDepressurizationStepRepository
from app.domain.steps.models.depressurization_step_bean import DepressurizationStepBean
from app.mapper.steps.depressurization_step_mapper import (
    depressurization_step_mapper_bean_to_entity,
    depressurization_step_mapper_entity_to_bean,
)
from app.repository.steps.models.depressurization_step_entity import (
    DepressurizationStepEntity,
)
from app.repository.steps.repositories.base_step_repository import BaseStepRepository


class DepressurizationStepRepository(
    BaseStepRepository[DepressurizationStepBean, DepressurizationStepEntity],
    IDepressurizationStepRepository,
):
    """Implémentation du repository DepressurizationStep."""

    entity_class = DepressurizationStepEntity
    bean_to_entity = staticmethod(depressurization_step_mapper_bean_to_entity)
    entity_to_bean = staticmethod(depressurization_step_mapper_entity_to_bean)
    select_related_fields = ("fsec_version_id",)

    @transaction.atomic
    def update(self, bean: DepressurizationStepBean) -> DepressurizationStepBean:
        """Met à jour une étape de dépressurisation."""
        entity = DepressurizationStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.date_of_fulfilment = bean.date_of_fulfilment
        entity.pressure_gauge = bean.pressure_gauge
        entity.enclosure_pressure_measured = bean.enclosure_pressure_measured
        entity.start_time = bean.start_time
        entity.end_time = bean.end_time
        entity.observations = bean.observations
        entity.depressurization_time_before_firing = (
            bean.depressurization_time_before_firing
        )
        entity.computed_pressure_before_firing = bean.computed_pressure_before_firing
        entity.save()
        return self.entity_to_bean(entity)
