"""Mapper StockMovement — Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.stock.models.stock_movement_bean import StockMovementBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.stock.models.stock_movement_entity import StockMovementEntity


def stock_movement_mapper_entity_to_bean(
    entity: StockMovementEntity,
) -> StockMovementBean:
    """Convertit une StockMovementEntity en StockMovementBean."""
    return StockMovementBean(
        uuid=str(entity.uuid),
        catalog_item_uuid=str(entity.catalog_item_id),
        movement_type=entity.movement_type,
        quantite_delta=entity.quantite_delta,
        quantite_apres=entity.quantite_apres,
        date=entity.date,
        remarque=entity.remarque,
        auteur_name=entity.auteur_name,
        created_at=entity.created_at,
    )


def stock_movement_mapper_bean_to_entity(
    bean: StockMovementBean,
) -> StockMovementEntity:
    """Convertit un StockMovementBean en StockMovementEntity (sans persistance).

    Note : `quantite_apres` est calculé par le repository lors du `create_with_quantity_update`,
    pas par ce mapper. La valeur portée par le bean ici peut être 0 (placeholder).
    """
    entity = StockMovementEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.catalog_item_id = bean.catalog_item_uuid
    entity.movement_type = bean.movement_type
    entity.quantite_delta = bean.quantite_delta
    entity.quantite_apres = bean.quantite_apres
    entity.date = bean.date
    entity.remarque = bean.remarque
    entity.auteur_name = bean.auteur_name
    return entity


def stock_movement_mapper_api_to_bean(data: Dict[str, Any]) -> StockMovementBean:
    """Convertit un payload API (déjà validé) en StockMovementBean."""
    return StockMovementBean(
        uuid=data.get("uuid", ""),
        catalog_item_uuid=data.get("catalog_item_uuid", ""),
        movement_type=data.get("movement_type", ""),
        quantite_delta=data.get("quantite_delta", 0),
        # quantite_apres : calculé serveur, jamais reçu du client (CDC §3.2)
        quantite_apres=0,
        date=parse_date_string(data.get("date")),
        remarque=data.get("remarque"),
        auteur_name=data.get("auteur_name"),
    )


def stock_movement_mapper_bean_to_api(bean: StockMovementBean) -> Dict[str, Any]:
    """Convertit un StockMovementBean en payload API JSON-sérialisable."""
    return {
        "uuid": bean.uuid,
        "catalog_item_uuid": bean.catalog_item_uuid,
        "movement_type": bean.movement_type,
        "quantite_delta": bean.quantite_delta,
        "quantite_apres": bean.quantite_apres,
        "date": format_date_for_api(bean.date),
        "remarque": bean.remarque,
        "auteur_name": bean.auteur_name,
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
    }
