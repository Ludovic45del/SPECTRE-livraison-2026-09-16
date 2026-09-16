"""Controller FsecAssemblyItem — API REST /api/v1/fsec-assembly-items/."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ViewSet

from app.api.stock.serializers import (
    FsecAssemblyItemCreateSerializer,
    FsecAssemblyItemPatchSerializer,
)
from app.domain.exceptions import InvalidDataException
from app.domain.stock.services.fsec_assembly_service import (
    add_assembly_item,
    get_assembly_item,
    list_assembly_items_by_fsec,
    patch_assembly_item,
    remove_assembly_item,
)
from app.mapper.stock.fsec_assembly_mapper import (
    fsec_assembly_mapper_bean_to_api,
    fsec_assembly_mapper_detail_bean_to_api,
)
from app.repository.fsec.repositories.fsec_repository import FsecRepository
from app.repository.stock.repositories.fsec_assembly_item_repository import (
    FsecAssemblyItemRepository,
)
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)


class FsecAssemblyItemController(ViewSet):
    """ViewSet REST pour /api/v1/fsec-assembly-items/.

    Pas de pagination ici : un tableau récap par FSEC contient quelques dizaines
    de lignes au plus.
    """

    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.assembly_repository = FsecAssemblyItemRepository()
        self.catalog_repository = StockCatalogRepository()
        self.fsec_repository = FsecRepository()

    # ----------------------------------------------------------------- retrieve

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """GET /api/v1/fsec-assembly-items/:uuid/."""
        bean = get_assembly_item(self.assembly_repository, uuid)
        return JsonResponse(
            fsec_assembly_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- create

    def create(self, request) -> JsonResponse:
        """POST /api/v1/fsec-assembly-items/."""
        serializer = FsecAssemblyItemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        validated = serializer.validated_data
        result = add_assembly_item(
            assembly_repository=self.assembly_repository,
            catalog_repository=self.catalog_repository,
            fsec_repository=self.fsec_repository,
            fsec_uuid=str(validated["fsec_uuid"]),
            catalog_item_uuid=str(validated["catalog_item_uuid"]),
            sort_order=validated.get("sort_order", 0),
            remarque=validated.get("remarque"),
        )
        return JsonResponse(
            fsec_assembly_mapper_bean_to_api(result),
            status=201,
            encoder=DjangoJSONEncoder,
        )

    # ----------------------------------------------------------------- partial_update

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """PATCH /api/v1/fsec-assembly-items/:uuid/ — sort_order & remarque uniquement."""
        serializer = FsecAssemblyItemPatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        result = patch_assembly_item(
            assembly_repository=self.assembly_repository,
            fsec_repository=self.fsec_repository,
            uuid=uuid,
            partial_data=serializer.validated_data,
        )
        return JsonResponse(
            fsec_assembly_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    # ----------------------------------------------------------------- destroy

    def destroy(self, request, uuid=None) -> HttpResponse:
        """DELETE /api/v1/fsec-assembly-items/:uuid/."""
        remove_assembly_item(
            assembly_repository=self.assembly_repository,
            catalog_repository=self.catalog_repository,
            fsec_repository=self.fsec_repository,
            uuid=uuid,
        )
        return HttpResponse(status=204)

    # ----------------------------------------------------------------- custom action

    @action(
        detail=False,
        methods=["get"],
        url_path="fsec/(?P<fsec_uuid>[^/.]+)",
    )
    def list_by_fsec(self, request, fsec_uuid=None) -> JsonResponse:
        """GET /api/v1/fsec-assembly-items/fsec/:fsec_uuid/.

        Retourne la liste enrichie (catalog_item joint) pour éviter le N+1
        côté frontend (CDC §5.3).
        """
        details = list_assembly_items_by_fsec(self.assembly_repository, fsec_uuid)
        payload = [fsec_assembly_mapper_detail_bean_to_api(d) for d in details]
        return JsonResponse(payload, safe=False, encoder=DjangoJSONEncoder)
