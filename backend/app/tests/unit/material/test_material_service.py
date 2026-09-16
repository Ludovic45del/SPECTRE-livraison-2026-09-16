"""
Tests unitaires pour le service Matériel.

Logique métier pure (validation salles/machines/liens/maintenance), isolée des
repositories via des mocks autospec sur les interfaces. Aucune dépendance BD.
"""

from datetime import date
from unittest.mock import create_autospec

import pytest

from app.domain.exceptions import InvalidDataException, NotFoundException
from app.domain.material.interface.machine_maintenance_repository import (
    IMachineMaintenanceRepository,
)
from app.domain.material.interface.machine_repository import IMachineRepository
from app.domain.material.interface.machine_room_repository import IMachineRoomRepository
from app.domain.material.models.machine_bean import MachineBean
from app.domain.material.models.machine_link_bean import MachineLinkBean
from app.domain.material.models.machine_maintenance_bean import MachineMaintenanceBean
from app.domain.material.models.machine_room_bean import MachineRoomBean
from app.domain.material.services import material_service as svc


@pytest.fixture
def machine_repo():
    return create_autospec(IMachineRepository, instance=True)


@pytest.fixture
def room_repo():
    return create_autospec(IMachineRoomRepository, instance=True)


@pytest.fixture
def maintenance_repo():
    return create_autospec(IMachineMaintenanceRepository, instance=True)


@pytest.fixture
def valid_room():
    return MachineRoomBean(id=1, code="B1", label="Banc 1", color="#fff", sort_order=0)


@pytest.fixture
def valid_machine():
    return MachineBean(uuid="m-1", name="Tour CN", room_id=1, status="in_service")


@pytest.fixture
def valid_maintenance():
    return MachineMaintenanceBean(
        uuid="mt-1",
        machine_uuid="m-1",
        date=date(2026, 1, 10),
        type="preventive",
    )


# ---------------------------------------------------------------------------
# Salles & lectures simples (délégation pure)
# ---------------------------------------------------------------------------


class TestMaterialReads:
    @pytest.mark.unit
    def test_get_all_rooms_delegates(self, room_repo, valid_room):
        room_repo.get_all.return_value = [valid_room]

        result = svc.get_all_rooms(room_repo)

        assert result == [valid_room]
        room_repo.get_all.assert_called_once_with()

    @pytest.mark.unit
    def test_get_all_machines_passes_room_filter(self, machine_repo, valid_machine):
        machine_repo.get_all.return_value = [valid_machine]

        result = svc.get_all_machines(machine_repo, room_id=3)

        assert result == [valid_machine]
        machine_repo.get_all.assert_called_once_with(room_id=3)

    @pytest.mark.unit
    def test_get_machine_by_uuid_success(self, machine_repo, valid_machine):
        machine_repo.get_by_uuid.return_value = valid_machine

        assert svc.get_machine_by_uuid(machine_repo, "m-1") is valid_machine

    @pytest.mark.unit
    def test_get_machine_by_uuid_missing_raises(self, machine_repo):
        machine_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            svc.get_machine_by_uuid(machine_repo, "nope")

    @pytest.mark.unit
    def test_get_maintenances_for_machine_delegates(
        self, maintenance_repo, valid_maintenance
    ):
        maintenance_repo.get_by_machine.return_value = [valid_maintenance]

        result = svc.get_maintenances_for_machine(maintenance_repo, "m-1")

        assert result == [valid_maintenance]
        maintenance_repo.get_by_machine.assert_called_once_with("m-1")


# ---------------------------------------------------------------------------
# Création / mise à jour de machine (validation payload + liens)
# ---------------------------------------------------------------------------


class TestCreateMachine:
    @pytest.mark.unit
    def test_create_machine_success(
        self, machine_repo, room_repo, valid_machine, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        machine_repo.create.return_value = valid_machine
        links = [MachineLinkBean(label="Doc", url="http://x")]

        result = svc.create_machine(machine_repo, room_repo, valid_machine, links)

        assert result is valid_machine
        machine_repo.create.assert_called_once_with(valid_machine, links)

    @pytest.mark.unit
    def test_create_machine_blank_name_raises(
        self, machine_repo, room_repo, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        bean = MachineBean(name="   ", room_id=1, status="in_service")

        with pytest.raises(InvalidDataException):
            svc.create_machine(machine_repo, room_repo, bean, [])

        machine_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_machine_invalid_status_raises(
        self, machine_repo, room_repo, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        bean = MachineBean(name="Tour", room_id=1, status="bogus")

        with pytest.raises(InvalidDataException):
            svc.create_machine(machine_repo, room_repo, bean, [])

    @pytest.mark.unit
    def test_create_machine_unknown_room_raises(self, machine_repo, room_repo):
        room_repo.get_by_id.return_value = None
        bean = MachineBean(name="Tour", room_id=999, status="in_service")

        with pytest.raises(InvalidDataException):
            svc.create_machine(machine_repo, room_repo, bean, [])

    @pytest.mark.unit
    def test_create_machine_blank_link_label_raises(
        self, machine_repo, room_repo, valid_machine, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        links = [MachineLinkBean(label="  ", url="http://x")]

        with pytest.raises(InvalidDataException):
            svc.create_machine(machine_repo, room_repo, valid_machine, links)

    @pytest.mark.unit
    def test_create_machine_blank_link_url_raises(
        self, machine_repo, room_repo, valid_machine, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        links = [MachineLinkBean(label="Doc", url="   ")]

        with pytest.raises(InvalidDataException):
            svc.create_machine(machine_repo, room_repo, valid_machine, links)


class TestUpdateMachine:
    @pytest.mark.unit
    def test_update_machine_success(
        self, machine_repo, room_repo, valid_machine, valid_room
    ):
        room_repo.get_by_id.return_value = valid_room
        machine_repo.get_by_uuid.return_value = valid_machine
        machine_repo.update.return_value = valid_machine

        result = svc.update_machine(machine_repo, room_repo, valid_machine, [])

        assert result is valid_machine
        machine_repo.update.assert_called_once_with(valid_machine, [])

    @pytest.mark.unit
    def test_update_machine_without_uuid_raises(self, machine_repo, room_repo):
        bean = MachineBean(uuid="", name="Tour", room_id=1, status="in_service")

        with pytest.raises(InvalidDataException):
            svc.update_machine(machine_repo, room_repo, bean, [])

        machine_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_update_machine_missing_raises_not_found(
        self, machine_repo, room_repo, valid_machine
    ):
        machine_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            svc.update_machine(machine_repo, room_repo, valid_machine, [])


class TestDeleteMachine:
    @pytest.mark.unit
    def test_delete_machine_success(self, machine_repo):
        machine_repo.delete.return_value = True

        svc.delete_machine(machine_repo, "m-1")

        machine_repo.delete.assert_called_once_with("m-1")

    @pytest.mark.unit
    def test_delete_machine_missing_raises(self, machine_repo):
        machine_repo.delete.return_value = False

        with pytest.raises(NotFoundException):
            svc.delete_machine(machine_repo, "nope")


# ---------------------------------------------------------------------------
# Maintenance (validation date / type / échéance)
# ---------------------------------------------------------------------------


class TestCreateMaintenance:
    @pytest.mark.unit
    def test_create_maintenance_success(
        self, maintenance_repo, machine_repo, valid_machine, valid_maintenance
    ):
        machine_repo.get_by_uuid.return_value = valid_machine
        maintenance_repo.create.return_value = valid_maintenance

        result = svc.create_maintenance(
            maintenance_repo, machine_repo, valid_maintenance
        )

        assert result is valid_maintenance
        maintenance_repo.create.assert_called_once_with(valid_maintenance)

    @pytest.mark.unit
    def test_create_maintenance_unknown_machine_raises(
        self, maintenance_repo, machine_repo, valid_maintenance
    ):
        machine_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            svc.create_maintenance(maintenance_repo, machine_repo, valid_maintenance)

        maintenance_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_maintenance_missing_date_raises(
        self, maintenance_repo, machine_repo, valid_machine
    ):
        machine_repo.get_by_uuid.return_value = valid_machine
        bean = MachineMaintenanceBean(machine_uuid="m-1", date=None, type="preventive")

        with pytest.raises(InvalidDataException):
            svc.create_maintenance(maintenance_repo, machine_repo, bean)

    @pytest.mark.unit
    def test_create_maintenance_invalid_type_raises(
        self, maintenance_repo, machine_repo, valid_machine
    ):
        machine_repo.get_by_uuid.return_value = valid_machine
        bean = MachineMaintenanceBean(
            machine_uuid="m-1", date=date(2026, 1, 1), type="bogus"
        )

        with pytest.raises(InvalidDataException):
            svc.create_maintenance(maintenance_repo, machine_repo, bean)

    @pytest.mark.unit
    def test_create_maintenance_next_before_date_raises(
        self, maintenance_repo, machine_repo, valid_machine
    ):
        machine_repo.get_by_uuid.return_value = valid_machine
        bean = MachineMaintenanceBean(
            machine_uuid="m-1",
            date=date(2026, 6, 1),
            type="curative",
            next_maintenance_date=date(2026, 1, 1),
        )

        with pytest.raises(InvalidDataException):
            svc.create_maintenance(maintenance_repo, machine_repo, bean)


class TestUpdateMaintenance:
    @pytest.mark.unit
    def test_update_maintenance_success_forces_machine_uuid(
        self, maintenance_repo, valid_maintenance
    ):
        existing = MachineMaintenanceBean(
            uuid="mt-1", machine_uuid="original", date=date(2026, 1, 1)
        )
        maintenance_repo.get_by_uuid.return_value = existing
        # On tente de "déplacer" la maintenance vers une autre machine : doit être ignoré.
        incoming = MachineMaintenanceBean(
            uuid="mt-1",
            machine_uuid="hijack",
            date=date(2026, 2, 1),
            type="preventive",
        )
        maintenance_repo.update.return_value = incoming

        svc.update_maintenance(maintenance_repo, incoming)

        # La machine d'origine est conservée (pas de déplacement).
        assert incoming.machine_uuid == "original"
        maintenance_repo.update.assert_called_once_with(incoming)

    @pytest.mark.unit
    def test_update_maintenance_missing_raises(self, maintenance_repo):
        maintenance_repo.get_by_uuid.return_value = None
        bean = MachineMaintenanceBean(uuid="nope", date=date(2026, 1, 1))

        with pytest.raises(NotFoundException):
            svc.update_maintenance(maintenance_repo, bean)

        maintenance_repo.update.assert_not_called()


class TestDeleteMaintenance:
    @pytest.mark.unit
    def test_delete_maintenance_success(self, maintenance_repo):
        maintenance_repo.delete.return_value = True

        svc.delete_maintenance(maintenance_repo, "mt-1")

        maintenance_repo.delete.assert_called_once_with("mt-1")

    @pytest.mark.unit
    def test_delete_maintenance_missing_raises(self, maintenance_repo):
        maintenance_repo.delete.return_value = False

        with pytest.raises(NotFoundException):
            svc.delete_maintenance(maintenance_repo, "nope")
