"""Mapper PicturesStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.pictures_step_bean import PicturesStepBean
from app.mapper.steps.base_step_mapper import (
    normalize_user_uuid,
    read_operator_user_uuid,
)
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.steps.models.pictures_step_entity import PicturesStepEntity


def pictures_step_mapper_entity_to_bean(entity: PicturesStepEntity) -> PicturesStepBean:
    """Convertit une PicturesStepEntity en PicturesStepBean."""
    return PicturesStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        operator=entity.operator,
        operator_user_uuid=read_operator_user_uuid(entity),
        date=entity.date,
        comments=entity.comments,
    )


def pictures_step_mapper_bean_to_entity(bean: PicturesStepBean) -> PicturesStepEntity:
    """Convertit un PicturesStepBean en PicturesStepEntity."""
    entity = PicturesStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.operator = bean.operator
    entity.operator_user_id = bean.operator_user_uuid
    entity.date = bean.date
    entity.comments = bean.comments
    return entity


def pictures_step_mapper_api_to_bean(data: Dict[str, Any]) -> PicturesStepBean:
    """Convertit des données API en PicturesStepBean."""
    return PicturesStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        operator=data.get("operator"),
        operator_user_uuid=normalize_user_uuid(data.get("operator_user_uuid")),
        date=parse_date_string(data.get("date")),
        comments=data.get("comments"),
    )


def pictures_step_mapper_bean_to_api(bean: PicturesStepBean) -> Dict[str, Any]:
    """Convertit un PicturesStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "date": format_date_for_api(bean.date),
        "comments": bean.comments,
    }
