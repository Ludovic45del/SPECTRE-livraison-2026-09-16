"""Controller Machine — CRUD complet avec sous-collection liens documentaires."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet

from app.api.material.serializers import MachineListQuerySerializer, MachineSerializer
from app.domain.exceptions import InvalidDataException
from app.domain.material.models.machine_link_bean import MachineLinkBean
from app.domain.material.services.material_service import (
    create_machine,
    delete_machine,
    get_all_machines,
    get_machine_by_uuid,
    update_machine,
)
from app.mapper.material.machine_api_mapper import (
    machine_api_to_bean,
    machine_bean_to_api,
    machine_beans_to_api,
)
from app.repository.material.repositories.machine_repository import MachineRepository
from app.repository.material.repositories.machine_room_repository import (
    MachineRoomRepository,
)


def _extract_links(payload) -> list[MachineLinkBean]:
    """Convertit le tableau `links` du payload en beans, en préservant l'ordre."""
    raw_links = payload.get("links", []) or []
    return [
        MachineLinkBean(
            label=item.get("label", ""),
            url=item.get("url", ""),
            position=int(item.get("position", idx) or idx),
        )
        for idx, item in enumerate(raw_links)
    ]


class MachineController(ViewSet):
    """CRUD machines, avec gestion atomique des liens associés."""

    permission_classes = [IsAuthenticated]
    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = MachineRepository()
        self.room_repository = MachineRoomRepository()

    def list(self, request) -> JsonResponse:
        query = MachineListQuerySerializer(data=request.query_params)
        if not query.is_valid():
            raise InvalidDataException(str(query.errors))
        room_id = query.validated_data.get("room_id")
        beans = get_all_machines(self.repository, room_id=room_id)
        return JsonResponse(
            machine_beans_to_api(beans), safe=False, encoder=DjangoJSONEncoder
        )

    def retrieve(self, request, uuid=None) -> JsonResponse:
        bean = get_machine_by_uuid(self.repository, uuid)
        return JsonResponse(machine_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        serializer = MachineSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        payload = serializer.validated_data
        bean = machine_api_to_bean(payload)
        link_beans = _extract_links(payload)

        result = create_machine(
            self.repository,
            self.room_repository,
            bean,
            link_beans,
        )
        return JsonResponse(
            machine_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        serializer = MachineSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        payload = serializer.validated_data
        bean = machine_api_to_bean(payload)
        bean.uuid = str(uuid)
        link_beans = _extract_links(payload)

        result = update_machine(
            self.repository,
            self.room_repository,
            bean,
            link_beans,
        )
        return JsonResponse(machine_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        delete_machine(self.repository, uuid)
        return HttpResponse(status=204)
