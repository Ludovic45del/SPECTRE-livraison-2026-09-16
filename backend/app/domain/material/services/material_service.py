"""Service Matériel — logique métier des salles, machines, liens, maintenance.

Conventions :
- Toutes les fonctions du service lèvent des exceptions métier (`NotFoundException`,
  `ConflictException`, `InvalidDataException`) qui sont traduites en codes HTTP
  par le middleware d'exception.
- Les services n'accèdent jamais directement aux entités Django — uniquement via
  les interfaces de repository.
"""

import logging
from typing import List

from app.domain.exceptions import InvalidDataException, NotFoundException
from app.domain.material.interface.machine_maintenance_repository import (
    IMachineMaintenanceRepository,
)
from app.domain.material.interface.machine_repository import IMachineRepository
from app.domain.material.interface.machine_room_repository import IMachineRoomRepository
from app.domain.material.models.constants import (
    VALID_MACHINE_STATUSES,
    VALID_MAINTENANCE_TYPES,
)
from app.domain.material.models.machine_bean import MachineBean
from app.domain.material.models.machine_link_bean import MachineLinkBean
from app.domain.material.models.machine_maintenance_bean import MachineMaintenanceBean
from app.domain.material.models.machine_room_bean import MachineRoomBean

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Salles
# ---------------------------------------------------------------------------


def get_all_rooms(repository: IMachineRoomRepository) -> List[MachineRoomBean]:
    return repository.get_all()


# ---------------------------------------------------------------------------
# Machines
# ---------------------------------------------------------------------------


def get_all_machines(
    repository: IMachineRepository, room_id: int | None = None
) -> List[MachineBean]:
    return repository.get_all(room_id=room_id)


def get_machine_by_uuid(repository: IMachineRepository, uuid: str) -> MachineBean:
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("Machine", uuid)
    return bean


def _validate_machine_payload(
    bean: MachineBean,
    room_repo: IMachineRoomRepository,
) -> None:
    if not bean.name.strip():
        raise InvalidDataException("Le nom de la machine est requis")
    if bean.status not in VALID_MACHINE_STATUSES:
        raise InvalidDataException(f"Statut invalide: {bean.status}")
    if room_repo.get_by_id(bean.room_id) is None:
        raise InvalidDataException(f"Salle inconnue: id={bean.room_id}")


def _validate_links(link_beans: List[MachineLinkBean]) -> None:
    for idx, link in enumerate(link_beans):
        if not link.label.strip():
            raise InvalidDataException(f"Le label du lien #{idx + 1} est requis")
        if not link.url.strip():
            raise InvalidDataException(f"L'URL du lien #{idx + 1} est requise")


def create_machine(
    machine_repo: IMachineRepository,
    room_repo: IMachineRoomRepository,
    bean: MachineBean,
    link_beans: List[MachineLinkBean],
) -> MachineBean:
    _validate_machine_payload(bean, room_repo)
    _validate_links(link_beans)
    result = machine_repo.create(bean, link_beans)
    logger.info("Machine créée: %s (%s)", result.uuid, result.name)
    return result


def update_machine(
    machine_repo: IMachineRepository,
    room_repo: IMachineRoomRepository,
    bean: MachineBean,
    link_beans: List[MachineLinkBean],
) -> MachineBean:
    if not bean.uuid:
        raise InvalidDataException("UUID requis pour mise à jour")
    if machine_repo.get_by_uuid(bean.uuid) is None:
        raise NotFoundException("Machine", bean.uuid)
    _validate_machine_payload(bean, room_repo)
    _validate_links(link_beans)
    return machine_repo.update(bean, link_beans)


def delete_machine(repository: IMachineRepository, uuid: str) -> None:
    if not repository.delete(uuid):
        raise NotFoundException("Machine", uuid)
    logger.info("Machine supprimée: %s", uuid)


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------


def get_maintenances_for_machine(
    repository: IMachineMaintenanceRepository, machine_uuid: str
) -> List[MachineMaintenanceBean]:
    return repository.get_by_machine(machine_uuid)


def _validate_maintenance_payload(bean: MachineMaintenanceBean) -> None:
    if bean.date is None:
        raise InvalidDataException("La date de maintenance est requise")
    if bean.type not in VALID_MAINTENANCE_TYPES:
        raise InvalidDataException(f"Type de maintenance invalide: {bean.type}")
    if (
        bean.next_maintenance_date is not None
        and bean.date is not None
        and bean.next_maintenance_date < bean.date
    ):
        raise InvalidDataException(
            "La prochaine échéance ne peut pas être antérieure à la date de l'intervention"
        )


def create_maintenance(
    maintenance_repo: IMachineMaintenanceRepository,
    machine_repo: IMachineRepository,
    bean: MachineMaintenanceBean,
) -> MachineMaintenanceBean:
    if machine_repo.get_by_uuid(bean.machine_uuid) is None:
        raise NotFoundException("Machine", bean.machine_uuid)
    _validate_maintenance_payload(bean)
    result = maintenance_repo.create(bean)
    logger.info("Maintenance créée: machine=%s, date=%s", bean.machine_uuid, bean.date)
    return result


def update_maintenance(
    repository: IMachineMaintenanceRepository,
    bean: MachineMaintenanceBean,
) -> MachineMaintenanceBean:
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("MachineMaintenance", bean.uuid)
    # On ne permet pas de déplacer une maintenance vers une autre machine.
    bean.machine_uuid = existing.machine_uuid
    _validate_maintenance_payload(bean)
    return repository.update(bean)


def delete_maintenance(repository: IMachineMaintenanceRepository, uuid: str) -> None:
    if not repository.delete(uuid):
        raise NotFoundException("MachineMaintenance", uuid)
    logger.info("Maintenance supprimée: %s", uuid)
