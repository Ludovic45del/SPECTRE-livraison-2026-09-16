"""Controller Dashboard - Endpoint agrégé en lecture seule pour la page d'accueil."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.viewsets import ViewSet

from app.core.permissions import IsReadOnlyOrOperateur
from app.domain.dashboard.services.dashboard_service import get_dashboard_data
from app.mapper.dashboard.dashboard_mapper import (
    dashboard_activity_item_bean_to_api,
    dashboard_counts_bean_to_api,
)
from app.repository.dashboard.repositories.dashboard_repository import (
    DashboardRepository,
)


class DashboardController(ViewSet):
    """Endpoint agrégé pour le dashboard (lecture seule, pas de CRUD)."""

    permission_classes = [IsReadOnlyOrOperateur]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = DashboardRepository()

    def list(self, request) -> JsonResponse:
        """GET /api/v1/dashboard/ — compteurs agrégés + activité récente."""
        try:
            limit = min(int(request.query_params.get("limit", 10)), 50)
        except (ValueError, TypeError):
            limit = 10
        counts, recent_activity = get_dashboard_data(self.repository, limit=limit)
        return JsonResponse(
            {
                "counts": dashboard_counts_bean_to_api(counts),
                "recent_activity": [
                    dashboard_activity_item_bean_to_api(item)
                    for item in recent_activity
                ],
            },
            encoder=DjangoJSONEncoder,
        )
