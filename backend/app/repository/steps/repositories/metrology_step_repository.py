"""Repository MetrologyStep - Implémentation IMetrologyStepRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.exceptions import ValidationException
from app.domain.steps.interface.steps_repository import IMetrologyStepRepository
from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
from app.mapper.steps.metrology_step_mapper import (
    metrology_step_mapper_bean_to_entity,
    metrology_step_mapper_entity_to_bean,
)
from app.repository.material.models.machine_entity import MachineEntity
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity
from app.repository.steps.repositories.base_step_repository import resolve_step_users

METROLOGY_ROOM_CODE = "B2"


class MetrologyStepRepository(IMetrologyStepRepository):
    """Implémentation du repository MetrologyStep."""

    select_related_fields = ("fsec_version_id", "rack_id")
    prefetch_related_fields = ("machines", "machines__room", "metrologist_users")

    def _base_queryset(self):
        """Returns queryset with select_related + prefetch_related applied."""
        return MetrologyStepEntity.objects.select_related(
            *self.select_related_fields
        ).prefetch_related(*self.prefetch_related_fields)

    def _resolve_machines(self, machine_uuids: List[str]) -> List[MachineEntity]:
        """Charge les MachineEntity correspondantes et valide la salle B2."""
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
            if machine.room.code != METROLOGY_ROOM_CODE
        ]
        if wrong_room:
            raise ValidationException(
                "machine_uuids",
                f"Machines hors de la salle {METROLOGY_ROOM_CODE}: {sorted(wrong_room)}",
            )
        return machines

    @transaction.atomic
    def create(self, bean: MetrologyStepBean) -> MetrologyStepBean:
        """Crée une nouvelle étape de métrologie."""
        machines = self._resolve_machines(bean.machine_uuids)
        metrologists = resolve_step_users(bean.metrologist_user_uuids)

        entity = metrology_step_mapper_bean_to_entity(bean)
        entity.save()

        if machines:
            entity.machines.set(machines)
        entity.metrologist_users.set(metrologists)

        return metrology_step_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[MetrologyStepBean]:
        """Récupère une étape de métrologie par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return metrology_step_mapper_entity_to_bean(entity)
        except MetrologyStepEntity.DoesNotExist:
            return None

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[MetrologyStepBean]:
        """Récupère toutes les étapes de métrologie d'un FSEC."""
        entities = self._base_queryset().filter(fsec_version_id_id=fsec_version_id)
        return [metrology_step_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: MetrologyStepBean) -> MetrologyStepBean:
        """Met à jour une étape de métrologie."""
        machines = self._resolve_machines(bean.machine_uuids)
        metrologists = resolve_step_users(bean.metrologist_user_uuids)

        entity = MetrologyStepEntity.objects.get(uuid=bean.uuid)
        entity.fsec_version_id_id = bean.fsec_version_id
        entity.rack_id_id = bean.rack_id
        entity.metrologist_name = bean.metrologist_name
        # FK simple synchronisée sur le premier métrologue (rétro-compat).
        entity.metrologist_user_id = (
            bean.metrologist_user_uuids[0] if bean.metrologist_user_uuids else None
        )
        entity.date = bean.date
        entity.comments = bean.comments
        entity.metro_file_link = bean.metro_file_link
        entity.visrad_link = bean.visrad_link
        entity.save()

        entity.machines.set(machines)
        entity.metrologist_users.set(metrologists)

        return metrology_step_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une étape de métrologie par son UUID."""
        try:
            entity = MetrologyStepEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except MetrologyStepEntity.DoesNotExist:
            return False
