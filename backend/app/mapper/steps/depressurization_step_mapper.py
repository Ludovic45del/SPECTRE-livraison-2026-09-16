"""Mapper DepressurizationStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.depressurization_step_bean import DepressurizationStepBean
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    parse_date_from_api,
    parse_datetime_from_api,
    read_operator_user_uuid,
)
from app.repository.steps.models.depressurization_step_entity import (
    DepressurizationStepEntity,
)


def depressurization_step_mapper_entity_to_bean(
    entity: DepressurizationStepEntity,
) -> DepressurizationStepBean:
    """Convertit une DepressurizationStepEntity en DepressurizationStepBean."""
    return DepressurizationStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        date_of_fulfilment=entity.date_of_fulfilment,
        pressure_gauge=entity.pressure_gauge,
        enclosure_pressure_measured=entity.enclosure_pressure_measured,
        start_time=entity.start_time,
        end_time=entity.end_time,
        observations=entity.observations,
        depressurization_time_before_firing=entity.depressurization_time_before_firing,
        computed_pressure_before_firing=entity.computed_pressure_before_firing,
    )


def depressurization_step_mapper_bean_to_entity(
    bean: DepressurizationStepBean,
) -> DepressurizationStepEntity:
    """Convertit un DepressurizationStepBean en DepressurizationStepEntity."""
    entity = DepressurizationStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
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
    return entity


def depressurization_step_mapper_api_to_bean(
    data: Dict[str, Any],
) -> DepressurizationStepBean:
    """Convertit des données API en DepressurizationStepBean."""
    return DepressurizationStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        date_of_fulfilment=parse_date_from_api(data.get("date_of_fulfilment")),
        pressure_gauge=data.get("pressure_gauge"),
        enclosure_pressure_measured=data.get("enclosure_pressure_measured"),
        start_time=parse_datetime_from_api(data.get("start_time")),
        end_time=parse_datetime_from_api(data.get("end_time")),
        observations=data.get("observations"),
        depressurization_time_before_firing=data.get(
            "depressurization_time_before_firing"
        ),
        computed_pressure_before_firing=data.get("computed_pressure_before_firing"),
    )


def depressurization_step_mapper_bean_to_api(
    bean: DepressurizationStepBean,
) -> Dict[str, Any]:
    """Convertit un DepressurizationStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "date_of_fulfilment": (
            bean.date_of_fulfilment.isoformat() if bean.date_of_fulfilment else None
        ),
        "pressure_gauge": bean.pressure_gauge,
        "enclosure_pressure_measured": bean.enclosure_pressure_measured,
        "start_time": bean.start_time.isoformat() if bean.start_time else None,
        "end_time": bean.end_time.isoformat() if bean.end_time else None,
        "observations": bean.observations,
        "depressurization_time_before_firing": bean.depressurization_time_before_firing,
        "computed_pressure_before_firing": bean.computed_pressure_before_firing,
    }
