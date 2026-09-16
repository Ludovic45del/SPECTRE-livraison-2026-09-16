"""Interface IMachineRoomRepository — accès aux salles du référentiel."""

import abc
from typing import List, Optional

from app.domain.material.models.machine_room_bean import MachineRoomBean


class IMachineRoomRepository(abc.ABC):
    """Interface abstraite pour le repository MachineRoom."""

    @abc.abstractmethod
    def get_all(self) -> List[MachineRoomBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_id(self, room_id: int) -> Optional[MachineRoomBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_code(self, code: str) -> Optional[MachineRoomBean]:
        raise NotImplementedError
