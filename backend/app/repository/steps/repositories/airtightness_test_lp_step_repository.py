"""Repository AirtightnessTestLpStep - Implémentation."""

from django.db import transaction

from app.domain.steps.interface.steps_repository import (
    IAirtightnessTestLpStepRepository,
)
from app.domain.steps.models.airtightness_test_lp_step_bean import (
    AirtightnessTestLpStepBean,
)
from app.mapper.steps.airtightness_test_lp_step_mapper import (
    airtightness_test_lp_step_mapper_bean_to_entity,
    airtightness_test_lp_step_mapper_entity_to_bean,
)
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)
from app.repository.steps.repositories.base_step_repository import BaseStepRepository


class AirtightnessTestLpStepRepository(
    BaseStepRepository[AirtightnessTestLpStepBean, AirtightnessTestLpStepEntity],
    IAirtightnessTestLpStepRepository,
):
    """Implémentation du repository AirtightnessTestLpStep."""

    entity_class = AirtightnessTestLpStepEntity
    bean_to_entity = staticmethod(airtightness_test_lp_step_mapper_bean_to_entity)
    entity_to_bean = staticmethod(airtightness_test_lp_step_mapper_entity_to_bean)
    select_related_fields = ("fsec_version_id", "embase")

    @transaction.atomic
    def update(self, bean: AirtightnessTestLpStepBean) -> AirtightnessTestLpStepBean:
        """Met à jour un test d'étanchéité."""
        entity = AirtightnessTestLpStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.embase_id = bean.embase_id if bean.embase_id else None
        entity.leak_rate_dtri = bean.leak_rate_dtri
        entity.gas_type = bean.gas_type
        entity.experiment_pressure = bean.experiment_pressure
        entity.airtightness_test_duration = bean.airtightness_test_duration
        entity.operator = bean.operator
        entity.operator_user_id = bean.operator_user_uuid
        entity.date_of_fulfilment = bean.date_of_fulfilment
        entity.save()
        return self.entity_to_bean(entity)
