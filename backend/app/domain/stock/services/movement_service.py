"""Service Movement — logique métier des mouvements de stock.

Voir CAHIER_DES_CHARGES_STOCK.md §3.2 et §5.2.
"""

import logging
from datetime import date
from typing import List, Optional

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.interface.movement_repository import IStockMovementRepository
from app.domain.stock.models.stock_constants import (
    ERROR_CODE_INVALID_KIND_OPERATION,
    ITEM_KIND_CONSUMABLE,
)
from app.domain.stock.models.stock_movement_bean import StockMovementBean

logger = logging.getLogger(__name__)


def _ensure_catalog_item_is_consumable(
    catalog_repository: IStockCatalogRepository, catalog_item_uuid: str
) -> None:
    """Garantit qu'un mouvement ne peut être créé que sur un consommable (CDC §3.2)."""
    item = catalog_repository.get_by_uuid(catalog_item_uuid)
    if item is None:
        raise NotFoundException("StockCatalogItem", catalog_item_uuid)
    if item.kind != ITEM_KIND_CONSUMABLE:
        raise ValidationException(
            ERROR_CODE_INVALID_KIND_OPERATION,
            "Les mouvements de stock ne sont autorisés que pour les consommables. "
            f"L'item '{item.name}' est de kind='{item.kind}'.",
        )


def create_movement(
    movement_repository: IStockMovementRepository,
    catalog_repository: IStockCatalogRepository,
    bean: StockMovementBean,
) -> StockMovementBean:
    """Crée un mouvement et met à jour la quantité du catalog_item atomiquement."""
    _ensure_catalog_item_is_consumable(catalog_repository, bean.catalog_item_uuid)

    logger.info(
        "Creating stock movement type=%s delta=%s catalog_item=%s",
        bean.movement_type,
        bean.quantite_delta,
        bean.catalog_item_uuid,
    )
    result = movement_repository.create_with_quantity_update(bean)
    logger.info(
        "Created stock movement uuid=%s quantite_apres=%s",
        result.uuid,
        result.quantite_apres,
    )
    return result


def get_movement(
    movement_repository: IStockMovementRepository, uuid: str
) -> StockMovementBean:
    """Récupère un mouvement par UUID."""
    bean = movement_repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("StockMovement", uuid)
    return bean


def list_movements(
    movement_repository: IStockMovementRepository,
    catalog_item_uuid: Optional[str] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[StockMovementBean]:
    """Liste paginée des mouvements selon filtres (cf. CDC §5.2)."""
    return movement_repository.list_by_filters(
        catalog_item_uuid=catalog_item_uuid,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )


def count_movements(
    movement_repository: IStockMovementRepository,
    catalog_item_uuid: Optional[str] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> int:
    """Compte des mouvements selon filtres."""
    return movement_repository.count_by_filters(
        catalog_item_uuid=catalog_item_uuid,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
    )


def delete_movement_admin(
    movement_repository: IStockMovementRepository, uuid: str
) -> bool:
    """Supprime un mouvement (admin only) et recalcule la quantité de l'item."""
    existing = movement_repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("StockMovement", uuid)

    logger.info("Deleting stock movement uuid=%s (admin)", uuid)
    if not movement_repository.delete_and_recompute(uuid):
        raise NotFoundException("StockMovement", uuid)
    logger.info("Deleted stock movement uuid=%s, quantite recomputed", uuid)
    return True
