"""Mapper PhotoView - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.steps.models.photo_view_bean import PhotoViewBean
from app.repository.steps.models.photo_view_entity import PhotoViewEntity


def photo_view_mapper_entity_to_bean(entity: PhotoViewEntity) -> PhotoViewBean:
    """Convertit une PhotoViewEntity en PhotoViewBean."""
    return PhotoViewBean(
        uuid=str(entity.uuid),
        pictures_step_id=(
            str(entity.pictures_step_id_id) if entity.pictures_step_id_id else ""
        ),
        name=entity.name,
        link=entity.link,
    )


def photo_view_mapper_bean_to_entity(bean: PhotoViewBean) -> PhotoViewEntity:
    """Convertit un PhotoViewBean en PhotoViewEntity."""
    entity = PhotoViewEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    if bean.pictures_step_id:
        entity.pictures_step_id_id = bean.pictures_step_id
    entity.name = bean.name
    entity.link = bean.link
    return entity


def photo_view_mapper_api_to_bean(data: Dict[str, Any]) -> PhotoViewBean:
    """Convertit des données API en PhotoViewBean."""
    return PhotoViewBean(
        uuid=data.get("uuid", ""),
        pictures_step_id=data.get("pictures_step_id", ""),
        name=data.get("name", ""),
        link=data.get("link"),
    )


def photo_view_mapper_bean_to_api(bean: PhotoViewBean) -> Dict[str, Any]:
    """Convertit un PhotoViewBean en données API."""
    return {
        "uuid": bean.uuid,
        "pictures_step_id": bean.pictures_step_id,
        "name": bean.name,
        "link": bean.link,
    }
