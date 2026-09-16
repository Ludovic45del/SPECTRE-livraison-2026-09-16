"""Mapper RepressurizationStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.repressurization_step_bean import RepressurizationStepBean
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    parse_datetime_from_api,
    read_operator_user_uuid,
)
from app.repository.steps.models.repressurization_step_entity import (
    RepressurizationStepEntity,
)


def repressurization_step_mapper_entity_to_bean(
    entity: RepressurizationStepEntity,
) -> RepressurizationStepBean:
    """Convertit une RepressurizationStepEntity en RepressurizationStepBean."""
    return RepressurizationStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        gas_type=entity.gas_type,
        start_date=entity.start_date,
        estimated_end_date=entity.estimated_end_date,
        sensor_pressure=entity.sensor_pressure,
        computed_pressure=entity.computed_pressure,
    )


def repressurization_step_mapper_bean_to_entity(
    bean: RepressurizationStepBean,
) -> RepressurizationStepEntity:
    """Convertit un RepressurizationStepBean en RepressurizationStepEntity."""
    entity = RepressurizationStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.operator = bean.operator
    entity.operator_user_id = bean.operator_user_uuid
    entity.gas_type = bean.gas_type
    entity.start_date = bean.start_date
    entity.estimated_end_date = bean.estimated_end_date
    entity.sensor_pressure = bean.sensor_pressure
    entity.computed_pressure = bean.computed_pressure
    return entity


def repressurization_step_mapper_api_to_bean(
    data: Dict[str, Any],
) -> RepressurizationStepBean:
    """Convertit des données API en RepressurizationStepBean."""
    return RepressurizationStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        gas_type=data.get("gas_type"),
        start_date=parse_datetime_from_api(data.get("start_date")),
        estimated_end_date=parse_datetime_from_api(data.get("estimated_end_date")),
        sensor_pressure=data.get("sensor_pressure"),
        computed_pressure=data.get("computed_pressure"),
    )


def repressurization_step_mapper_bean_to_api(
    bean: RepressurizationStepBean,
) -> Dict[str, Any]:
    """Convertit un RepressurizationStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "gas_type": bean.gas_type,
        "start_date": bean.start_date.isoformat() if bean.start_date else None,
        "estimated_end_date": (
            bean.estimated_end_date.isoformat() if bean.estimated_end_date else None
        ),
        "sensor_pressure": bean.sensor_pressure,
        "computed_pressure": bean.computed_pressure,
    }
