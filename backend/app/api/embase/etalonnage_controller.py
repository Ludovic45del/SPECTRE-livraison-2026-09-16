"""Controller Etalonnage - API REST pour les étalonnages d'embases."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ViewSet

from app.api.embase.serializers import (
    EtalonnageListQuerySerializer,
    EtalonnageSerializer,
)
from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.embase.services.etalonnage_service import (
    count_etalonnages_by_embase,
    create_etalonnage,
    delete_etalonnage,
    get_etalonnage_by_uuid,
    get_etalonnages_by_embase,
)
from app.domain.exceptions import InvalidDataException
from app.mapper.embase.etalonnage_mapper import (
    etalonnage_mapper_api_to_bean,
    etalonnage_mapper_bean_to_api,
)
from app.repository.embase.repositories.embase_repository import EmbaseRepository
from app.repository.embase.repositories.etalonnage_repository import (
    EtalonnageRepository,
)


class EtalonnagePagination(PageNumberPagination):
    """Pagination pour les étalonnages."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class EtalonnageController(PaginatedControllerMixin, ViewSet):
    """Controller REST pour les étalonnages d'embases à gaz."""

    lookup_field = "uuid"

    def get_permissions(self):
        """Admin-only pour la suppression."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = EtalonnageRepository()
        self.embase_repository = EmbaseRepository()
        self.paginator = EtalonnagePagination()

    def create(self, request) -> JsonResponse:
        """Crée un nouvel étalonnage (POST /)."""
        serializer = EtalonnageSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = etalonnage_mapper_api_to_bean(serializer.validated_data)
        result = create_etalonnage(self.repository, self.embase_repository, bean)
        return JsonResponse(
            etalonnage_mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def list(self, request) -> JsonResponse:
        """Liste les étalonnages d'une embase (GET /?embase_uuid=...&voie=1|2)."""
        serializer = EtalonnageListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        embase_uuid = str(serializer.validated_data["embase_uuid"])
        voie = serializer.validated_data.get("voie")
        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: get_etalonnages_by_embase(
                self.repository, embase_uuid, voie=voie, limit=limit, offset=offset
            ),
            count_func=lambda: count_etalonnages_by_embase(
                self.repository, embase_uuid, voie=voie
            ),
        )
        return self.paginate_or_json(request, source, etalonnage_mapper_bean_to_api)

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """Récupère un étalonnage par UUID (GET /:uuid/)."""
        bean = get_etalonnage_by_uuid(self.repository, uuid)
        return JsonResponse(
            etalonnage_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    def destroy(self, request, uuid=None) -> HttpResponse:
        """Supprime un étalonnage (DELETE /:uuid/)."""
        delete_etalonnage(self.repository, self.embase_repository, uuid)
        return HttpResponse(status=204)
