"""Controller Embase - API REST pour les Embases à gaz."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ViewSet

from app.api.embase.serializers import EmbasePatchSerializer, EmbaseSerializer
from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.embase.services.embase_service import (
    count_all_embases,
    create_embase,
    delete_embase,
    get_all_embases,
    get_embase_by_slug,
    get_embase_by_uuid,
    get_fsec_history,
    patch_embase,
    update_embase,
)
from app.domain.exceptions import InvalidDataException
from app.mapper.embase.embase_api_mapper import (
    embase_mapper_api_to_bean,
    embase_mapper_bean_to_api,
    fsec_history_entry_bean_to_api,
)
from app.repository.embase.repositories.embase_repository import EmbaseRepository


class EmbasePagination(PageNumberPagination):
    """Pagination pour les Embases."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class EmbaseController(PaginatedControllerMixin, ViewSet):
    """Controller REST pour les Embases à gaz."""

    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = EmbaseRepository()
        self.paginator = EmbasePagination()

    def list(self, request) -> JsonResponse:
        """Liste toutes les Embases (GET /)."""
        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: get_all_embases(
                self.repository, limit=limit, offset=offset
            ),
            count_func=lambda: count_all_embases(self.repository),
        )
        return self.paginate_or_json(request, source, embase_mapper_bean_to_api)

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """Récupère une Embase par UUID (GET /:uuid/)."""
        bean = get_embase_by_uuid(self.repository, uuid)
        return JsonResponse(embase_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[^/]+)")
    def by_slug(self, request, slug=None) -> JsonResponse:
        """Récupère une Embase par son slug d'URL (GET /by-slug/:slug/)."""
        bean = get_embase_by_slug(self.repository, slug)
        return JsonResponse(embase_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        """Crée une nouvelle Embase (POST /)."""
        serializer = EmbaseSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = embase_mapper_api_to_bean(serializer.validated_data)
        result = create_embase(self.repository, bean)
        return JsonResponse(
            embase_mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        """Met à jour une Embase (PUT /:uuid/)."""
        data = request.data.copy()
        data["uuid"] = uuid

        serializer = EmbaseSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = embase_mapper_api_to_bean(serializer.validated_data)
        result = update_embase(self.repository, bean)
        return JsonResponse(
            embase_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """Met à jour partiellement une Embase (PATCH /:uuid/)."""
        serializer = EmbasePatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        result = patch_embase(self.repository, uuid, serializer.validated_data)
        return JsonResponse(
            embase_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    def get_permissions(self):
        """Admin-only pour la suppression."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def destroy(self, request, uuid=None) -> HttpResponse:
        """Supprime une Embase (DELETE /:uuid/)."""
        delete_embase(self.repository, uuid)
        return HttpResponse(status=204)

    @action(detail=True, methods=["get"], url_path="fsec-history")
    def fsec_history(self, request, uuid=None) -> JsonResponse:
        """Retourne les FSECs dans lesquels cette embase a été utilisée (GET /:uuid/fsec-history/)."""
        result = get_fsec_history(self.repository, uuid)
        data = [fsec_history_entry_bean_to_api(entry) for entry in result]
        return JsonResponse(data, safe=False, encoder=DjangoJSONEncoder)
