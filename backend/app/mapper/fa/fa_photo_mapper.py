"""Mapper FaPhoto - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.fa.models.fa_photo_bean import FaPhotoBean
from app.repository.fa.models.fa_photo_entity import FaPhotoEntity


def fa_photo_mapper_entity_to_bean(entity: FaPhotoEntity) -> FaPhotoBean:
    """Convertit une FaPhotoEntity en FaPhotoBean."""
    return FaPhotoBean(
        uuid=str(entity.uuid),
        fa_uuid=str(entity.fa_id) if entity.fa_id else "",
        image_url=entity.image.url if entity.image else None,
        caption=entity.caption,
        order=entity.order,
        created_at=entity.created_at,
    )


def fa_photo_mapper_bean_to_api(bean: FaPhotoBean) -> Dict[str, Any]:
    """Convertit un FaPhotoBean en données API."""
    return {
        "uuid": bean.uuid,
        "fa_uuid": bean.fa_uuid,
        "image": bean.image_url,
        "caption": bean.caption,
        "order": bean.order,
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
    }
