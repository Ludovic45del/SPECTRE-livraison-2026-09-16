"""Mapper SealingStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.sealing_step_bean import SealingStepBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.steps.models.sealing_step_entity import SealingStepEntity


def _metrologist_user_uuid(entity: SealingStepEntity):
    raw = getattr(entity, "metrologist_user_id", None)
    return str(raw) if raw else None


def sealing_step_mapper_entity_to_bean(entity: SealingStepEntity) -> SealingStepBean:
    """Convertit une SealingStepEntity en SealingStepBean."""
    return SealingStepBean(
        uuid=str(entity.uuid),
        metrology_step_id=(
            str(entity.metrology_step_id_id) if entity.metrology_step_id_id else ""
        ),
        date=entity.date,
        metrologist_name=entity.metrologist_name,
        metrologist_user_uuid=_metrologist_user_uuid(entity),
        rack_id=entity.rack_id_id if entity.rack_id_id is not None else None,
        interface_io=entity.interface_io,
        comments=entity.comments,
        verification_status=entity.verification_status,
        verification_remark=entity.verification_remark,
    )


def sealing_step_mapper_bean_to_entity(bean: SealingStepBean) -> SealingStepEntity:
    """Convertit un SealingStepBean en SealingStepEntity."""
    entity = SealingStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    if bean.metrology_step_id:
        entity.metrology_step_id_id = bean.metrology_step_id
    entity.date = bean.date
    entity.metrologist_name = bean.metrologist_name
    entity.metrologist_user_id = bean.metrologist_user_uuid
    entity.rack_id_id = bean.rack_id
    entity.interface_io = bean.interface_io
    entity.comments = bean.comments
    entity.verification_status = bean.verification_status
    entity.verification_remark = bean.verification_remark
    return entity


def sealing_step_mapper_api_to_bean(data: Dict[str, Any]) -> SealingStepBean:
    """Convertit des données API en SealingStepBean."""
    user_uuid = data.get("metrologist_user_uuid")
    return SealingStepBean(
        uuid=data.get("uuid", ""),
        metrology_step_id=data.get("metrology_step_id", ""),
        date=parse_date_string(data.get("date")),
        metrologist_name=data.get("metrologist_name"),
        metrologist_user_uuid=str(user_uuid) if user_uuid else None,
        rack_id=data.get("rack_id"),
        interface_io=data.get("interface_io"),
        comments=data.get("comments"),
        verification_status=data.get("verification_status"),
        verification_remark=data.get("verification_remark"),
    )


def sealing_step_mapper_bean_to_api(bean: SealingStepBean) -> Dict[str, Any]:
    """Convertit un SealingStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "metrology_step_id": bean.metrology_step_id,
        "date": format_date_for_api(bean.date),
        "metrologist_name": bean.metrologist_name,
        "metrologist_user_uuid": bean.metrologist_user_uuid,
        "rack_id": bean.rack_id,
        "interface_io": bean.interface_io,
        "comments": bean.comments,
        "verification_status": bean.verification_status,
        "verification_remark": bean.verification_remark,
    }
