"""Repository AssemblyStep - Implémentation IAssemblyStepRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.exceptions import ValidationException
from app.domain.steps.interface.steps_repository import IAssemblyStepRepository
from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
from app.mapper.steps.assembly_step_mapper import (
    assembly_step_mapper_bean_to_entity,
    assembly_step_mapper_entity_to_bean,
)
from app.repository.material.models.machine_entity import MachineEntity
from app.repository.steps.models.assembly_step_entity import AssemblyStepEntity
from app.repository.steps.repositories.base_step_repository import resolve_step_users

ASSEMBLY_ROOM_CODE = "B1"


class AssemblyStepRepository(IAssemblyStepRepository):
    """Implémentation du repository AssemblyStep."""

    select_related_fields = ("fsec_version_id",)
    prefetch_related_fields = ("machines", "machines__room", "operator_users")

    def _base_queryset(self):
        """Returns queryset with select_related and prefetch_related applied."""
        return AssemblyStepEntity.objects.select_related(
            *self.select_related_fields
        ).prefetch_related(*self.prefetch_related_fields)

    def _resolve_machines(self, machine_uuids: List[str]) -> List[MachineEntity]:
        """Charge les MachineEntity correspondantes et valide la salle B1."""
        if not machine_uuids:
            return []
        machines = list(
            MachineEntity.objects.select_related("room").filter(uuid__in=machine_uuids)
        )
        found_uuids = {str(machine.uuid) for machine in machines}
        missing = set(machine_uuids) - found_uuids
        if missing:
            raise ValidationException(
                "machine_uuids",
                f"Machines introuvables: {sorted(missing)}",
            )
        wrong_room = [
            str(machine.uuid)
            for machine in machines
            if machine.room.code != ASSEMBLY_ROOM_CODE
        ]
        if wrong_room:
            raise ValidationException(
                "machine_uuids",
                f"Machines hors de la salle {ASSEMBLY_ROOM_CODE}: {sorted(wrong_room)}",
            )
        return machines

    @transaction.atomic
    def create(self, bean: AssemblyStepBean) -> AssemblyStepBean:
        """Crée une nouvelle étape d'assemblage."""
        machines = self._resolve_machines(bean.machine_uuids)
        operators = resolve_step_users(bean.operator_user_uuids)

        entity = assembly_step_mapper_bean_to_entity(bean)
        entity.save()

        if machines:
            entity.machines.set(machines)
        entity.operator_users.set(operators)

        return assembly_step_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[AssemblyStepBean]:
        """Récupère une étape d'assemblage par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return assembly_step_mapper_entity_to_bean(entity)
        except AssemblyStepEntity.DoesNotExist:
            return None

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[AssemblyStepBean]:
        """Récupère toutes les étapes d'assemblage d'un FSEC."""
        entities = self._base_queryset().filter(fsec_version_id_id=fsec_version_id)
        return [assembly_step_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: AssemblyStepBean) -> AssemblyStepBean:
        """Met à jour une étape d'assemblage."""
        machines = self._resolve_machines(bean.machine_uuids)
        operators = resolve_step_users(bean.operator_user_uuids)

        entity = AssemblyStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.operator = bean.operator
        # FK simple synchronisée sur le premier assembleur (rétro-compat).
        entity.operator_user_id = (
            bean.operator_user_uuids[0] if bean.operator_user_uuids else None
        )
        entity.start_date = bean.start_date
        entity.end_date = bean.end_date
        entity.comments = bean.comments
        entity.save()

        entity.machines.set(machines)
        entity.operator_users.set(operators)

        return assembly_step_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une étape d'assemblage par son UUID."""
        try:
            entity = AssemblyStepEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except AssemblyStepEntity.DoesNotExist:
            return False
