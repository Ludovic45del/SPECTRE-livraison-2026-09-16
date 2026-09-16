"""Repository MachineRoom — lecture seule du référentiel des salles."""

from typing import List, Optional

from app.domain.material.interface.machine_room_repository import IMachineRoomRepository
from app.domain.material.models.machine_room_bean import MachineRoomBean
from app.mapper.material.machine_room_mapper import machine_room_entity_to_bean
from app.repository.material.models.machine_room_entity import MachineRoomEntity


class MachineRoomRepository(IMachineRoomRepository):
    """Implémentation du repository MachineRoom."""

    def get_all(self) -> List[MachineRoomBean]:
        return [
            machine_room_entity_to_bean(entity)
            for entity in MachineRoomEntity.objects.all()
        ]

    def get_by_id(self, room_id: int) -> Optional[MachineRoomBean]:
        try:
            entity = MachineRoomEntity.objects.get(id=room_id)
            return machine_room_entity_to_bean(entity)
        except MachineRoomEntity.DoesNotExist:
            return None

    def get_by_code(self, code: str) -> Optional[MachineRoomBean]:
        try:
            entity = MachineRoomEntity.objects.get(code=code)
            return machine_room_entity_to_bean(entity)
        except MachineRoomEntity.DoesNotExist:
            return None
