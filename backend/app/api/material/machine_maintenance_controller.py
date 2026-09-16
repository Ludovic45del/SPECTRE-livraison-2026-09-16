"""Controller MachineMaintenance — CRUD sur l'historique des interventions."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet

from app.api.material.serializers import MachineMaintenanceSerializer
from app.domain.exceptions import InvalidDataException
from app.domain.material.services.material_service import (
    create_maintenance,
    delete_maintenance,
    get_maintenances_for_machine,
    update_maintenance,
)
from app.mapper.material.machine_maintenance_mapper import (
    machine_maintenance_api_to_bean,
    machine_maintenance_bean_to_api,
    machine_maintenance_beans_to_api,
)
from app.repository.material.repositories.machine_maintenance_repository import (
    MachineMaintenanceRepository,
)
from app.repository.material.repositories.machine_repository import MachineRepository


class MachineMaintenanceController(ViewSet):
    """Liste filtrée par machine (?machine_uuid=…) + CRUD individuel."""

    permission_classes = [IsAuthenticated]
    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = MachineMaintenanceRepository()
        self.machine_repository = MachineRepository()

    def list(self, request) -> JsonResponse:
        machine_uuid = request.query_params.get("machine_uuid")
        if not machine_uuid:
            raise InvalidDataException("Le paramètre 'machine_uuid' est requis")
        beans = get_maintenances_for_machine(self.repository, machine_uuid)
        return JsonResponse(
            machine_maintenance_beans_to_api(beans),
            safe=False,
            encoder=DjangoJSONEncoder,
        )

    def create(self, request) -> JsonResponse:
        serializer = MachineMaintenanceSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = machine_maintenance_api_to_bean(serializer.validated_data)
        result = create_maintenance(self.repository, self.machine_repository, bean)
        return JsonResponse(
            machine_maintenance_bean_to_api(result),
            status=201,
            encoder=DjangoJSONEncoder,
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        serializer = MachineMaintenanceSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = machine_maintenance_api_to_bean(serializer.validated_data)
        bean.uuid = str(uuid)
        result = update_maintenance(self.repository, bean)
        return JsonResponse(
            machine_maintenance_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    def destroy(self, request, uuid=None) -> HttpResponse:
        delete_maintenance(self.repository, uuid)
        return HttpResponse(status=204)
