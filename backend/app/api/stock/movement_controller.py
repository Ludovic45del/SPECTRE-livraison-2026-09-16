"""Controller Stock Movement — API REST /api/v1/stock/movements/."""

from datetime import datetime

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ViewSet

from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.api.stock.serializers import StockMovementSerializer
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.exceptions import InvalidDataException
from app.domain.stock.services.movement_service import (
    count_movements,
    create_movement,
    delete_movement_admin,
    get_movement,
    list_movements,
)
from app.mapper.stock.movement_mapper import (
    stock_movement_mapper_api_to_bean,
    stock_movement_mapper_bean_to_api,
)
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)
from app.repository.stock.repositories.stock_movement_repository import (
    StockMovementRepository,
)


def _parse_date_query_param(value):
    """Parse 'YYYY-MM-DD' → date. Retourne None si absent ou invalide."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


class StockMovementPagination(PageNumberPagination):
    """Pagination des mouvements."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200


class StockMovementController(PaginatedControllerMixin, ViewSet):
    """ViewSet REST pour /api/v1/stock/movements/.

    Pas de PUT/PATCH : les mouvements sont immuables après création (cf. CDC §3.2).
    Pour corriger : créer un mouvement d'ajustement.
    """

    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.movement_repository = StockMovementRepository()
        self.catalog_repository = StockCatalogRepository()
        self.paginator = StockMovementPagination()

    # ----------------------------------------------------------------- list

    def list(self, request) -> JsonResponse:
        """GET /api/v1/stock/movements/."""
        params = request.query_params
        catalog_item_uuid = params.get("catalog_item_uuid") or None
        movement_type = params.get("movement_type") or None
        date_from = _parse_date_query_param(params.get("date_from"))
        date_to = _parse_date_query_param(params.get("date_to"))

        filters = dict(
            catalog_item_uuid=catalog_item_uuid,
            movement_type=movement_type,
            date_from=date_from,
            date_to=date_to,
        )
        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: list_movements(
                self.movement_repository, limit=limit, offset=offset, **filters
            ),
            count_func=lambda: count_movements(self.movement_repository, **filters),
        )
        return self.paginate_or_json(request, source, stock_movement_mapper_bean_to_api)

    # ----------------------------------------------------------------- retrieve

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """GET /api/v1/stock/movements/:uuid/."""
        bean = get_movement(self.movement_repository, uuid)
        return JsonResponse(
            stock_movement_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- create

    def create(self, request) -> JsonResponse:
        """POST /api/v1/stock/movements/."""
        serializer = StockMovementSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        bean = stock_movement_mapper_api_to_bean(serializer.validated_data)
        result = create_movement(
            self.movement_repository, self.catalog_repository, bean
        )
        return JsonResponse(
            stock_movement_mapper_bean_to_api(result),
            status=201,
            encoder=DjangoJSONEncoder,
        )

    # ----------------------------------------------------------------- destroy

    def get_permissions(self):
        """Suppression réservée admin (CDC §5.2)."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def destroy(self, request, uuid=None) -> HttpResponse:
        """DELETE /api/v1/stock/movements/:uuid/ — admin only, recalcule la quantité."""
        delete_movement_admin(self.movement_repository, uuid)
        return HttpResponse(status=204)
