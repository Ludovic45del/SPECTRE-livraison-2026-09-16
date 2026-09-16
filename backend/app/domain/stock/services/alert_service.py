"""Service Alert — calcul des alertes du module Stock (CDC §5.4)."""

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import List

from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import EXPIRATION_WARNING_DAYS

logger = logging.getLogger(__name__)


@dataclass
class StockAlertsBean:
    """Agrégat retourné par le endpoint /stock/alerts/."""

    low_stock: List[StockCatalogItemBean] = field(default_factory=list)
    expired: List[StockCatalogItemBean] = field(default_factory=list)
    expiring_soon: List[StockCatalogItemBean] = field(default_factory=list)


def get_alerts(
    catalog_repository: IStockCatalogRepository,
    today: date,
    days_ahead: int = EXPIRATION_WARNING_DAYS,
) -> StockAlertsBean:
    """Retourne les 3 listes d'alertes (CDC §5.4).

    - low_stock : consommables actifs sous seuil d'alerte.
    - expired : consommables actifs périmés (date_peremption ≤ today).
    - expiring_soon : consommables actifs périmant entre demain et today + days_ahead.
    """
    return StockAlertsBean(
        low_stock=catalog_repository.find_low_stock(),
        expired=catalog_repository.find_expired(today),
        expiring_soon=catalog_repository.find_expiring_soon(today, days_ahead),
    )
