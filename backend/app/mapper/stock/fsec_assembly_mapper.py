"""Mapper FsecAssemblyItem — Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.stock.models.fsec_assembly_item_bean import (
    FsecAssemblyItemBean,
    FsecAssemblyItemDetailBean,
)
from app.mapper.stock.catalog_mapper import stock_catalog_mapper_bean_to_api
from app.repository.stock.models.fsec_assembly_item_entity import FsecAssemblyItemEntity


def fsec_assembly_mapper_entity_to_bean(
    entity: FsecAssemblyItemEntity,
) -> FsecAssemblyItemBean:
    """Convertit une FsecAssemblyItemEntity en FsecAssemblyItemBean."""
    return FsecAssemblyItemBean(
        uuid=str(entity.uuid),
        fsec_uuid=str(entity.fsec_uuid),
        catalog_item_uuid=str(entity.catalog_item_id),
        sort_order=entity.sort_order,
        remarque=entity.remarque,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def fsec_assembly_mapper_bean_to_entity(
    bean: FsecAssemblyItemBean,
) -> FsecAssemblyItemEntity:
    """Convertit un FsecAssemblyItemBean en FsecAssemblyItemEntity (sans persistance)."""
    entity = FsecAssemblyItemEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_uuid = bean.fsec_uuid
    entity.catalog_item_id = bean.catalog_item_uuid
    entity.sort_order = bean.sort_order
    entity.remarque = bean.remarque
    return entity


def fsec_assembly_mapper_api_to_bean(data: Dict[str, Any]) -> FsecAssemblyItemBean:
    """Convertit un payload API en FsecAssemblyItemBean."""
    return FsecAssemblyItemBean(
        uuid=data.get("uuid", ""),
        fsec_uuid=data.get("fsec_uuid", ""),
        catalog_item_uuid=data.get("catalog_item_uuid", ""),
        sort_order=data.get("sort_order", 0),
        remarque=data.get("remarque"),
    )


def fsec_assembly_mapper_bean_to_api(bean: FsecAssemblyItemBean) -> Dict[str, Any]:
    """Convertit un FsecAssemblyItemBean en payload API."""
    return {
        "uuid": bean.uuid,
        "fsec_uuid": bean.fsec_uuid,
        "catalog_item_uuid": bean.catalog_item_uuid,
        "sort_order": bean.sort_order,
        "remarque": bean.remarque,
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
        "updated_at": bean.updated_at.isoformat() if bean.updated_at else None,
    }


def fsec_assembly_mapper_detail_bean_to_api(
    detail: FsecAssemblyItemDetailBean,
) -> Dict[str, Any]:
    """Convertit un FsecAssemblyItemDetailBean en payload API enrichi du catalog_item.

    Format retourné (cf. CDC §5.3) :
    {
      ...champs FsecAssemblyItem...,
      "catalog_item": { ...champs StockCatalogItem... }
    }
    """
    payload = fsec_assembly_mapper_bean_to_api(detail.item)
    payload["catalog_item"] = stock_catalog_mapper_bean_to_api(detail.catalog_item)
    return payload
