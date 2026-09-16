"""Controller Stock Catalog — API REST /api/v1/stock/catalog/."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ViewSet

from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.api.stock.serializers import (
    StockCatalogItemPatchSerializer,
    StockCatalogItemSerializer,
    StructurationBatchSerializer,
)
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.exceptions import InvalidDataException
from app.domain.stock.services.catalog_service import (
    count_items,
    create_item,
    create_structuration_batch,
    get_item,
    list_items,
    patch_item,
    soft_delete_item,
    update_item,
)
from app.mapper.stock.catalog_mapper import (
    stock_catalog_mapper_api_to_bean,
    stock_catalog_mapper_bean_to_api,
)
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)


def _parse_bool_query_param(value, default=None):
    """Parse 'true'/'false' string → bool. Retourne `default` si absent ou inconnu."""
    if value is None:
        return default
    lowered = str(value).strip().lower()
    if lowered in ("true", "1", "yes"):
        return True
    if lowered in ("false", "0", "no"):
        return False
    return default


class StockCatalogPagination(PageNumberPagination):
    """Pagination pour le catalogue Stock."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200


class StockCatalogController(PaginatedControllerMixin, ViewSet):
    """ViewSet REST pour /api/v1/stock/catalog/."""

    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = StockCatalogRepository()
        self.paginator = StockCatalogPagination()

    # ----------------------------------------------------------------- list

    def list(self, request) -> JsonResponse:
        """GET /api/v1/stock/catalog/ — liste paginée filtrable."""
        params = request.query_params
        kind = params.get("kind") or None
        category = params.get("category") or None
        status = params.get("status") or None
        installation = params.get("installation") or None
        search = params.get("search") or None
        is_active = _parse_bool_query_param(params.get("is_active"), default=True)

        filters = dict(
            kind=kind,
            category=category,
            status=status,
            installation=installation,
            is_active=is_active,
            search=search,
        )

        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: list_items(
                self.repository, limit=limit, offset=offset, **filters
            ),
            count_func=lambda: count_items(self.repository, **filters),
        )
        return self.paginate_or_json(request, source, stock_catalog_mapper_bean_to_api)

    # ----------------------------------------------------------------- retrieve

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """GET /api/v1/stock/catalog/:uuid/."""
        bean = get_item(self.repository, uuid)
        return JsonResponse(
            stock_catalog_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- create

    def create(self, request) -> JsonResponse:
        """POST /api/v1/stock/catalog/."""
        serializer = StockCatalogItemSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        bean = stock_catalog_mapper_api_to_bean(serializer.validated_data)
        result = create_item(self.repository, bean)
        return JsonResponse(
            stock_catalog_mapper_bean_to_api(result),
            status=201,
            encoder=DjangoJSONEncoder,
        )

    # ----------------------------------------------------------------- batch structuration

    @action(detail=False, methods=["get"], url_path="next-structuration-number")
    def next_structuration_number(self, request) -> JsonResponse:
        """GET /api/v1/stock/catalog/next-structuration-number/.

        Renvoie le prochain numéro de série global qui serait attribué à la
        première pièce d'un nouveau paquet de structuration (aperçu UI).
        """
        return JsonResponse({"next": self.repository.next_structuration_number()})

    @action(detail=False, methods=["post"], url_path="batch-structuration")
    def batch_structuration(self, request) -> JsonResponse:
        """POST /api/v1/stock/catalog/batch-structuration/.

        Crée un paquet de structurations numérotées automatiquement (cf. CDC §8.1).
        Renvoie la liste des items créés (201).
        """
        serializer = StructurationBatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        data = serializer.validated_data
        results = create_structuration_batch(
            self.repository,
            structuration_type=data["structuration_type"],
            installation=data["installation"],
            quantity=data["quantity"],
            fsec_name=data.get("fsec_name"),
            caracteristique=data.get("caracteristique"),
            fournisseur=data.get("fournisseur"),
            materiaux_mat=data.get("materiaux_mat"),
            matiere=data.get("matiere"),
            masse_mg=data.get("masse_mg"),
            boite=data.get("boite"),
            emplacement=data.get("emplacement"),
            remarques=data.get("remarques"),
        )
        payload = [stock_catalog_mapper_bean_to_api(b) for b in results]
        return JsonResponse(payload, safe=False, status=201, encoder=DjangoJSONEncoder)

    # ----------------------------------------------------------------- update (PUT)

    def update(self, request, uuid=None) -> JsonResponse:
        """PUT /api/v1/stock/catalog/:uuid/ — remplacement complet."""
        data = request.data.copy()
        data["uuid"] = uuid
        serializer = StockCatalogItemSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        bean = stock_catalog_mapper_api_to_bean(serializer.validated_data)
        result = update_item(self.repository, bean)
        return JsonResponse(
            stock_catalog_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- partial_update (PATCH)

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """PATCH /api/v1/stock/catalog/:uuid/ — mise à jour partielle."""
        serializer = StockCatalogItemPatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        result = patch_item(self.repository, uuid, serializer.validated_data)
        return JsonResponse(
            stock_catalog_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- destroy

    def get_permissions(self):
        """Suppression réservée admin (cf. CDC §5.1)."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def destroy(self, request, uuid=None) -> HttpResponse:
        """DELETE /api/v1/stock/catalog/:uuid/ — soft delete."""
        soft_delete_item(self.repository, uuid)
        return HttpResponse(status=204)

    # ----------------------------------------------------------------- custom action

    @action(
        detail=False,
        methods=["get"],
        url_path="available-for-fsec/(?P<fsec_uuid>[^/.]+)",
    )
    def available_for_fsec(self, request, fsec_uuid=None) -> JsonResponse:
        """GET /api/v1/stock/catalog/available-for-fsec/:fsec_uuid/.

        Items assignables à une FSEC (CDC §5.4) :
        - consommables actifs ;
        - éléments `dispo` OU déjà attribués à cette même FSEC.

        Filtres optionnels : `?kind=` et `?category=`.
        """
        kind = request.query_params.get("kind") or None
        category = request.query_params.get("category") or None
        beans = self.repository.list_available_for_fsec(
            fsec_uuid, kind=kind, category=category
        )
        payload = [stock_catalog_mapper_bean_to_api(b) for b in beans]
        return JsonResponse(payload, safe=False, encoder=DjangoJSONEncoder)
