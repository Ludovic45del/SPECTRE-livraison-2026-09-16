"""Mapper AirtightnessTestLpStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.airtightness_test_lp_step_bean import (
    AirtightnessTestLpStepBean,
)
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    parse_date_from_api,
    read_operator_user_uuid,
)
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)


def airtightness_test_lp_step_mapper_entity_to_bean(
    entity: AirtightnessTestLpStepEntity,
) -> AirtightnessTestLpStepBean:
    """Convertit une AirtightnessTestLpStepEntity en AirtightnessTestLpStepBean."""
    return AirtightnessTestLpStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        embase_id=str(entity.embase_id) if entity.embase_id else None,
        embase_identifier=(
            entity.embase.identifier if entity.embase_id and entity.embase else None
        ),
        leak_rate_dtri=entity.leak_rate_dtri,
        gas_type=entity.gas_type,
        experiment_pressure=entity.experiment_pressure,
        airtightness_test_duration=entity.airtightness_test_duration,
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        date_of_fulfilment=entity.date_of_fulfilment,
        phase=entity.phase or "BP",
    )


def airtightness_test_lp_step_mapper_bean_to_entity(
    bean: AirtightnessTestLpStepBean,
) -> AirtightnessTestLpStepEntity:
    """Convertit un AirtightnessTestLpStepBean en AirtightnessTestLpStepEntity."""
    entity = AirtightnessTestLpStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.embase_id = bean.embase_id if bean.embase_id else None
    entity.leak_rate_dtri = bean.leak_rate_dtri
    entity.gas_type = bean.gas_type
    entity.experiment_pressure = bean.experiment_pressure
    entity.airtightness_test_duration = bean.airtightness_test_duration
    entity.operator = bean.operator
    entity.operator_user_id = bean.operator_user_uuid
    entity.date_of_fulfilment = bean.date_of_fulfilment
    entity.phase = bean.phase or "BP"
    return entity


def airtightness_test_lp_step_mapper_api_to_bean(
    data: Dict[str, Any],
) -> AirtightnessTestLpStepBean:
    """Convertit des données API en AirtightnessTestLpStepBean."""
    return AirtightnessTestLpStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        embase_id=data.get("embase_id"),
        leak_rate_dtri=data.get("leak_rate_dtri"),
        gas_type=data.get("gas_type"),
        experiment_pressure=data.get("experiment_pressure"),
        airtightness_test_duration=data.get("airtightness_test_duration"),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        date_of_fulfilment=parse_date_from_api(data.get("date_of_fulfilment")),
        phase=data.get("phase") or "BP",
    )


def airtightness_test_lp_step_mapper_bean_to_api(
    bean: AirtightnessTestLpStepBean,
) -> Dict[str, Any]:
    """Convertit un AirtightnessTestLpStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "embase_id": bean.embase_id,
        "embase_identifier": bean.embase_identifier,
        "leak_rate_dtri": bean.leak_rate_dtri,
        "gas_type": bean.gas_type,
        "experiment_pressure": bean.experiment_pressure,
        "airtightness_test_duration": bean.airtightness_test_duration,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "date_of_fulfilment": (
            bean.date_of_fulfilment.isoformat() if bean.date_of_fulfilment else None
        ),
        "phase": bean.phase or "BP",
    }
