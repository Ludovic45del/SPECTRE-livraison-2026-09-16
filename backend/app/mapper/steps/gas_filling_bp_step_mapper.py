"""Mapper GasFillingBpStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.gas_filling_bp_step_bean import GasFillingBpStepBean
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    parse_date_from_api,
    read_operator_user_uuid,
)
from app.repository.steps.models.gas_filling_bp_step_entity import (
    GasFillingBpStepEntity,
)


def gas_filling_bp_step_mapper_entity_to_bean(
    entity: GasFillingBpStepEntity,
) -> GasFillingBpStepBean:
    """Convertit une GasFillingBpStepEntity en GasFillingBpStepBean."""
    return GasFillingBpStepBean(
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
        leak_test_duration=entity.leak_test_duration,
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        date_of_fulfilment=entity.date_of_fulfilment,
        gas_base=entity.gas_base,
        gas_container=entity.gas_container,
        observations=entity.observations,
    )


def gas_filling_bp_step_mapper_bean_to_entity(
    bean: GasFillingBpStepBean,
) -> GasFillingBpStepEntity:
    """Convertit un GasFillingBpStepBean en GasFillingBpStepEntity."""
    entity = GasFillingBpStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.embase_id = bean.embase_id if bean.embase_id else None
    entity.leak_rate_dtri = bean.leak_rate_dtri
    entity.gas_type = bean.gas_type
    entity.experiment_pressure = bean.experiment_pressure
    entity.leak_test_duration = bean.leak_test_duration
    entity.operator = bean.operator
    entity.operator_user_id = bean.operator_user_uuid
    entity.date_of_fulfilment = bean.date_of_fulfilment
    entity.gas_base = bean.gas_base
    entity.gas_container = bean.gas_container
    entity.observations = bean.observations
    return entity


def gas_filling_bp_step_mapper_api_to_bean(
    data: Dict[str, Any],
) -> GasFillingBpStepBean:
    """Convertit des données API en GasFillingBpStepBean."""
    return GasFillingBpStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        embase_id=data.get("embase_id"),
        leak_rate_dtri=data.get("leak_rate_dtri"),
        gas_type=data.get("gas_type"),
        experiment_pressure=data.get("experiment_pressure"),
        leak_test_duration=data.get("leak_test_duration"),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        date_of_fulfilment=parse_date_from_api(data.get("date_of_fulfilment")),
        gas_base=data.get("gas_base"),
        gas_container=data.get("gas_container"),
        observations=data.get("observations"),
    )


def gas_filling_bp_step_mapper_bean_to_api(
    bean: GasFillingBpStepBean,
) -> Dict[str, Any]:
    """Convertit un GasFillingBpStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "embase_id": bean.embase_id,
        "embase_identifier": bean.embase_identifier,
        "leak_rate_dtri": bean.leak_rate_dtri,
        "gas_type": bean.gas_type,
        "experiment_pressure": bean.experiment_pressure,
        "leak_test_duration": bean.leak_test_duration,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "date_of_fulfilment": (
            bean.date_of_fulfilment.isoformat() if bean.date_of_fulfilment else None
        ),
        "gas_base": bean.gas_base,
        "gas_container": bean.gas_container,
        "observations": bean.observations,
    }
