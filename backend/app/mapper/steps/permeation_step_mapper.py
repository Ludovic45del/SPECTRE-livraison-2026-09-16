"""Mapper PermeationStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.permeation_step_bean import PermeationStepBean
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    parse_datetime_from_api,
    read_operator_user_uuid,
)
from app.repository.steps.models.permeation_step_entity import PermeationStepEntity


def permeation_step_mapper_entity_to_bean(
    entity: PermeationStepEntity,
) -> PermeationStepBean:
    """Convertit une PermeationStepEntity en PermeationStepBean."""
    return PermeationStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        gas_type=entity.gas_type,
        target_pressure=entity.target_pressure,
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        start_date=entity.start_date,
        estimated_end_date=entity.estimated_end_date,
        sensor_pressure=entity.sensor_pressure,
        computed_shot_pressure=entity.computed_shot_pressure,
    )


def permeation_step_mapper_bean_to_entity(
    bean: PermeationStepBean,
) -> PermeationStepEntity:
    """Convertit un PermeationStepBean en PermeationStepEntity."""
    entity = PermeationStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.gas_type = bean.gas_type
    entity.target_pressure = bean.target_pressure
    entity.operator = bean.operator
    entity.operator_user_id = bean.operator_user_uuid
    entity.start_date = bean.start_date
    entity.estimated_end_date = bean.estimated_end_date
    entity.sensor_pressure = bean.sensor_pressure
    entity.computed_shot_pressure = bean.computed_shot_pressure
    return entity


def permeation_step_mapper_api_to_bean(data: Dict[str, Any]) -> PermeationStepBean:
    """Convertit des données API en PermeationStepBean."""
    return PermeationStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        gas_type=data.get("gas_type"),
        target_pressure=data.get("target_pressure"),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        start_date=parse_datetime_from_api(data.get("start_date")),
        estimated_end_date=parse_datetime_from_api(data.get("estimated_end_date")),
        sensor_pressure=data.get("sensor_pressure"),
        computed_shot_pressure=data.get("computed_shot_pressure"),
    )


def permeation_step_mapper_bean_to_api(bean: PermeationStepBean) -> Dict[str, Any]:
    """Convertit un PermeationStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "gas_type": bean.gas_type,
        "target_pressure": bean.target_pressure,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "start_date": bean.start_date.isoformat() if bean.start_date else None,
        "estimated_end_date": (
            bean.estimated_end_date.isoformat() if bean.estimated_end_date else None
        ),
        "sensor_pressure": bean.sensor_pressure,
        "computed_shot_pressure": bean.computed_shot_pressure,
    }
