"""Interface IMachineRepository — CRUD machines + agrégat liens documentaires."""

import abc
from typing import List, Optional

from app.domain.material.models.machine_bean import MachineBean
from app.domain.material.models.machine_link_bean import MachineLinkBean


class IMachineRepository(abc.ABC):
    """Interface abstraite pour le repository Machine."""

    @abc.abstractmethod
    def get_all(self, room_id: Optional[int] = None) -> List[MachineBean]:
        """Liste les machines, optionnellement filtrées par salle."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[MachineBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create(
        self,
        bean: MachineBean,
        link_beans: List[MachineLinkBean],
    ) -> MachineBean:
        """Crée la machine avec ses liens dans une transaction."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(
        self,
        bean: MachineBean,
        link_beans: List[MachineLinkBean],
    ) -> MachineBean:
        """Met à jour la machine et remplace l'intégralité de ses liens."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        raise NotImplementedError
