"""Controller Stock Alerts — API REST /api/v1/stock/alerts/."""

from datetime import date

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.viewsets import ViewSet

from app.domain.stock.services.alert_service import get_alerts
from app.mapper.stock.catalog_mapper import stock_catalog_mapper_bean_to_api
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)


class StockAlertController(ViewSet):
    """ViewSet REST pour /api/v1/stock/alerts/.

    Une seule action `list` qui retourne le payload agrégé décrit en CDC §5.4 :
    {
      "low_stock": [...],
      "expired": [...],
      "expiring_soon": [...]
    }
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = StockCatalogRepository()

    def list(self, request) -> JsonResponse:
        """GET /api/v1/stock/alerts/."""
        alerts = get_alerts(self.repository, today=date.today())
        payload = {
            "low_stock": [
                stock_catalog_mapper_bean_to_api(b) for b in alerts.low_stock
            ],
            "expired": [stock_catalog_mapper_bean_to_api(b) for b in alerts.expired],
            "expiring_soon": [
                stock_catalog_mapper_bean_to_api(b) for b in alerts.expiring_soon
            ],
        }
        return JsonResponse(payload, encoder=DjangoJSONEncoder)
