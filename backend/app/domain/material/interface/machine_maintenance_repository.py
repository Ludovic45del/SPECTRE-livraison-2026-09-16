"""Interface IMachineMaintenanceRepository — historique des interventions."""

import abc
from typing import List, Optional

from app.domain.material.models.machine_maintenance_bean import MachineMaintenanceBean


class IMachineMaintenanceRepository(abc.ABC):
    """Interface abstraite pour le repository MachineMaintenance."""

    @abc.abstractmethod
    def get_by_machine(self, machine_uuid: str) -> List[MachineMaintenanceBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[MachineMaintenanceBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create(self, bean: MachineMaintenanceBean) -> MachineMaintenanceBean:
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: MachineMaintenanceBean) -> MachineMaintenanceBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        raise NotImplementedError
