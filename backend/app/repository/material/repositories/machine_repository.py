"""Repository Machine — CRUD + hydratation des agrégats liens et dates maintenance."""

from typing import Dict, List, Optional

from django.db import transaction
from django.db.models import Max, Min, Q

from app.domain.material.interface.machine_repository import IMachineRepository
from app.domain.material.models.machine_bean import MachineBean
from app.domain.material.models.machine_link_bean import MachineLinkBean
from app.mapper.material.machine_link_mapper import machine_link_entity_to_bean
from app.mapper.material.machine_mapper import (
    machine_bean_to_entity,
    machine_entity_to_bean,
    machine_update_entity_from_bean,
)
from app.repository.material.models.machine_entity import MachineEntity
from app.repository.material.models.machine_link_entity import MachineLinkEntity
from app.repository.material.models.machine_maintenance_entity import (
    MachineMaintenanceEntity,
)


class MachineRepository(IMachineRepository):
    """Implémentation du repository Machine.

    `get_all` et `get_by_uuid` hydratent les agrégats (liens, dates
    de maintenance) en une poignée de requêtes ; on évite le N+1 grâce à
    des regroupements en mémoire.
    """

    # ----- Lecture ---------------------------------------------------------

    def get_all(self, room_id: Optional[int] = None) -> List[MachineBean]:
        qs = MachineEntity.objects.all()
        if room_id is not None:
            qs = qs.filter(room_id=room_id)
        machines = list(qs)
        if not machines:
            return []

        machine_uuids = [m.uuid for m in machines]
        links_by_machine = self._fetch_links_by_machine(machine_uuids)
        maintenance_dates_by_machine = self._fetch_maintenance_dates_by_machine(
            machine_uuids
        )

        beans: List[MachineBean] = []
        for entity in machines:
            bean = machine_entity_to_bean(entity)
            self._attach_aggregates(
                bean,
                entity.uuid,
                links_by_machine,
                maintenance_dates_by_machine,
            )
            beans.append(bean)
        return beans

    def get_by_uuid(self, uuid: str) -> Optional[MachineBean]:
        try:
            entity = MachineEntity.objects.get(uuid=uuid)
        except MachineEntity.DoesNotExist:
            return None

        bean = machine_entity_to_bean(entity)
        self._attach_aggregates(
            bean,
            entity.uuid,
            self._fetch_links_by_machine([entity.uuid]),
            self._fetch_maintenance_dates_by_machine([entity.uuid]),
        )
        return bean

    # ----- Écriture --------------------------------------------------------

    @transaction.atomic
    def create(
        self,
        bean: MachineBean,
        link_beans: List[MachineLinkBean],
    ) -> MachineBean:
        entity = machine_bean_to_entity(bean)
        entity.save()
        self._replace_links(entity.uuid, link_beans)
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def update(
        self,
        bean: MachineBean,
        link_beans: List[MachineLinkBean],
    ) -> MachineBean:
        entity = MachineEntity.objects.get(uuid=bean.uuid)
        machine_update_entity_from_bean(entity, bean)
        entity.save()
        self._replace_links(entity.uuid, link_beans)
        return self.get_by_uuid(str(entity.uuid))  # type: ignore[return-value]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = MachineEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except MachineEntity.DoesNotExist:
            return False

    # ----- Helpers privés --------------------------------------------------

    @staticmethod
    def _fetch_links_by_machine(machine_uuids) -> Dict[str, List]:
        links = MachineLinkEntity.objects.filter(machine_id__in=machine_uuids).order_by(
            "position", "created_at"
        )
        grouped: Dict[str, List] = {}
        for link in links:
            grouped.setdefault(str(link.machine_id), []).append(
                machine_link_entity_to_bean(link)
            )
        return grouped

    @staticmethod
    def _fetch_maintenance_dates_by_machine(machine_uuids) -> Dict[str, Dict]:
        """Agrège, par machine, la dernière maintenance et la prochaine échéance la plus proche."""
        rows = (
            MachineMaintenanceEntity.objects.filter(machine_id__in=machine_uuids)
            .values("machine_id")
            .annotate(
                last_date=Max("date"),
                next_date=Min(
                    "next_maintenance_date",
                    filter=Q(next_maintenance_date__isnull=False),
                ),
            )
        )
        return {
            str(row["machine_id"]): {
                "last_maintenance_date": row["last_date"],
                "next_maintenance_date": row["next_date"],
            }
            for row in rows
        }

    @staticmethod
    def _attach_aggregates(
        bean: MachineBean,
        entity_uuid,
        links_by_machine,
        maintenance_dates_by_machine,
    ) -> None:
        key = str(entity_uuid)
        bean.links = links_by_machine.get(key, [])
        dates = maintenance_dates_by_machine.get(key)
        if dates:
            bean.last_maintenance_date = dates["last_maintenance_date"]
            bean.next_maintenance_date = dates["next_maintenance_date"]

    @staticmethod
    def _replace_links(machine_uuid, link_beans: List[MachineLinkBean]) -> None:
        """Remplace l'intégralité des liens d'une machine (delete + recreate).

        Approche simple et lisible — la volumétrie attendue est faible
        (quelques liens par machine), donc la perte d'historique de l'UUID
        n'est pas un problème.
        """
        MachineLinkEntity.objects.filter(machine_id=machine_uuid).delete()
        new_entities = [
            MachineLinkEntity(
                machine_id=machine_uuid,
                label=link.label,
                url=link.url,
                position=link.position if link.position is not None else idx,
            )
            for idx, link in enumerate(link_beans)
        ]
        if new_entities:
            MachineLinkEntity.objects.bulk_create(new_entities)
