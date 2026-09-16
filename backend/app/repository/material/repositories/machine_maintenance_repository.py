"""Repository MachineMaintenance — CRUD sur l'historique des interventions."""

from typing import List, Optional

from django.db import transaction

from app.domain.material.interface.machine_maintenance_repository import (
    IMachineMaintenanceRepository,
)
from app.domain.material.models.machine_maintenance_bean import MachineMaintenanceBean
from app.mapper.material.machine_maintenance_mapper import (
    machine_maintenance_bean_to_entity,
    machine_maintenance_entity_to_bean,
    machine_maintenance_update_entity_from_bean,
)
from app.repository.material.models.machine_maintenance_entity import (
    MachineMaintenanceEntity,
)


class MachineMaintenanceRepository(IMachineMaintenanceRepository):
    """Implémentation du repository MachineMaintenance."""

    def get_by_machine(self, machine_uuid: str) -> List[MachineMaintenanceBean]:
        entities = MachineMaintenanceEntity.objects.filter(
            machine_id=machine_uuid
        ).order_by("-date", "-created_at")
        return [machine_maintenance_entity_to_bean(e) for e in entities]

    def get_by_uuid(self, uuid: str) -> Optional[MachineMaintenanceBean]:
        try:
            entity = MachineMaintenanceEntity.objects.get(uuid=uuid)
            return machine_maintenance_entity_to_bean(entity)
        except MachineMaintenanceEntity.DoesNotExist:
            return None

    @transaction.atomic
    def create(self, bean: MachineMaintenanceBean) -> MachineMaintenanceBean:
        entity = machine_maintenance_bean_to_entity(bean)
        entity.save()
        return machine_maintenance_entity_to_bean(entity)

    @transaction.atomic
    def update(self, bean: MachineMaintenanceBean) -> MachineMaintenanceBean:
        entity = MachineMaintenanceEntity.objects.get(uuid=bean.uuid)
        machine_maintenance_update_entity_from_bean(entity, bean)
        entity.save()
        return machine_maintenance_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = MachineMaintenanceEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except MachineMaintenanceEntity.DoesNotExist:
            return False
