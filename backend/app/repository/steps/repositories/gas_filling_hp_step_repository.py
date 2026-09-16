"""Repository GasFillingHpStep - Implémentation."""

from django.db import transaction

from app.domain.steps.interface.steps_repository import IGasFillingHpStepRepository
from app.domain.steps.models.gas_filling_hp_step_bean import GasFillingHpStepBean
from app.mapper.steps.gas_filling_hp_step_mapper import (
    gas_filling_hp_step_mapper_bean_to_entity,
    gas_filling_hp_step_mapper_entity_to_bean,
)
from app.repository.steps.models.gas_filling_hp_step_entity import (
    GasFillingHpStepEntity,
)
from app.repository.steps.repositories.base_step_repository import BaseStepRepository


class GasFillingHpStepRepository(
    BaseStepRepository[GasFillingHpStepBean, GasFillingHpStepEntity],
    IGasFillingHpStepRepository,
):
    """Implémentation du repository GasFillingHpStep."""

    entity_class = GasFillingHpStepEntity
    bean_to_entity = staticmethod(gas_filling_hp_step_mapper_bean_to_entity)
    entity_to_bean = staticmethod(gas_filling_hp_step_mapper_entity_to_bean)
    select_related_fields = ("fsec_version_id", "embase")

    @transaction.atomic
    def update(self, bean: GasFillingHpStepBean) -> GasFillingHpStepBean:
        """Met à jour un remplissage gaz HP."""
        entity = self._base_queryset().get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.embase_id = bean.embase_id if bean.embase_id else None
        entity.leak_rate_dtri = bean.leak_rate_dtri
        entity.gas_type = bean.gas_type
        entity.experiment_pressure = bean.experiment_pressure
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.date_of_fulfilment = bean.date_of_fulfilment
        entity.gas_base = bean.gas_base
        entity.gas_container = bean.gas_container
        entity.observations = bean.observations
        entity.save()
        return self.entity_to_bean(entity)
