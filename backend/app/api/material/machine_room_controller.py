"""Controller MachineRoom — lecture seule du référentiel des salles."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet

from app.domain.material.services.material_service import get_all_rooms
from app.mapper.material.machine_room_mapper import machine_room_beans_to_api
from app.repository.material.repositories.machine_room_repository import (
    MachineRoomRepository,
)


class MachineRoomController(ViewSet):
    """Endpoint en lecture seule sur le référentiel des salles."""

    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = MachineRoomRepository()

    def list(self, request) -> JsonResponse:
        beans = get_all_rooms(self.repository)
        return JsonResponse(
            machine_room_beans_to_api(beans), safe=False, encoder=DjangoJSONEncoder
        )
