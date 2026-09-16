"""Tests d'intégration pour les controllers Matériel.

Couvre les 3 endpoints (rooms, machines, maintenances) sur le golden path
et les cas d'erreur clés (validation, not found).
"""

import json
import uuid

import pytest

from app.repository.material.models import (
    MachineEntity,
    MachineLinkEntity,
    MachineMaintenanceEntity,
    MachineRoomEntity,
)

BASE = "/api/v1/material"


# ---------------------------------------------------------------------------
# Référentiel salles (migration seed B1/B2/A13)
# ---------------------------------------------------------------------------


@pytest.fixture
def rooms(db):
    """Les 3 salles sont seedées par la migration 0062. On les récupère."""
    rooms = {r.code: r for r in MachineRoomEntity.objects.all()}
    assert {"B1", "B2", "A13"}.issubset(rooms.keys())
    return rooms


@pytest.mark.django_db
def test_list_rooms_returns_seeded_rooms(api_client, rooms):
    response = api_client.get(f"{BASE}/rooms/")
    assert response.status_code == 200
    codes = {item["code"] for item in response.json()}
    assert codes == {"B1", "B2", "A13"}


# ---------------------------------------------------------------------------
# Machines — CRUD avec sous-collection liens
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_machine_create_with_links(api_client, rooms):
    payload = {
        "name": "Banc de mesure A",
        "room_id": rooms["B1"].id,
        "reference": "REF-001",
        "manufacturer": "Keysight",
        "model": "34465A",
        "status": "in_service",
        "description": "Banc principal salle B1",
        "links": [
            {
                "label": "Procédure d'utilisation",
                "url": "https://intra/procedures/banc-a",
                "position": 0,
            },
            {
                "label": "Manuel constructeur",
                "url": "https://keysight.com/manual.pdf",
                "position": 1,
            },
        ],
    }
    resp = api_client.post(
        f"{BASE}/machines/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()
    assert data["name"] == "Banc de mesure A"
    assert data["room_id"] == rooms["B1"].id
    assert len(data["links"]) == 2
    assert {link["label"] for link in data["links"]} == {
        "Procédure d'utilisation",
        "Manuel constructeur",
    }


@pytest.mark.django_db
def test_machine_list_filtered_by_room(api_client, rooms):
    MachineEntity.objects.create(name="M-B1", room=rooms["B1"])
    MachineEntity.objects.create(name="M-A13", room=rooms["A13"])

    resp = api_client.get(f"{BASE}/machines/?room_id={rooms['B1'].id}")
    assert resp.status_code == 200
    names = {item["name"] for item in resp.json()}
    assert "M-B1" in names
    assert "M-A13" not in names


@pytest.mark.django_db
def test_machine_update_replaces_links(api_client, rooms):
    machine = MachineEntity.objects.create(name="Banc B", room=rooms["B2"])
    MachineLinkEntity.objects.create(
        machine=machine, label="Vieux lien", url="http://old"
    )

    payload = {
        "name": "Banc B (renommé)",
        "room_id": rooms["B2"].id,
        "links": [{"label": "Nouveau lien", "url": "http://new"}],
    }
    resp = api_client.put(
        f"{BASE}/machines/{machine.uuid}/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert data["name"] == "Banc B (renommé)"
    assert [link["label"] for link in data["links"]] == ["Nouveau lien"]


@pytest.mark.django_db
def test_machine_create_invalid_room_returns_400(api_client):
    payload = {"name": "Orpheline", "room_id": 99999}
    resp = api_client.post(
        f"{BASE}/machines/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_machine_delete(api_client, rooms):
    machine = MachineEntity.objects.create(name="ToDelete", room=rooms["B1"])
    resp = api_client.delete(f"{BASE}/machines/{machine.uuid}/")
    assert resp.status_code == 204
    assert not MachineEntity.objects.filter(uuid=machine.uuid).exists()


# ---------------------------------------------------------------------------
# Maintenance — CRUD + validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_maintenance_crud_and_list(api_client, rooms):
    machine = MachineEntity.objects.create(name="M-maint", room=rooms["B1"])

    # Create
    resp = api_client.post(
        f"{BASE}/maintenances/",
        data=json.dumps(
            {
                "machine_uuid": str(machine.uuid),
                "date": "2026-05-01",
                "type": "preventive",
                "performed_by_name": "Dupond",
                "description": "Révision annuelle",
                "next_maintenance_date": "2027-05-01",
            }
        ),
        content_type="application/json",
    )
    assert resp.status_code == 201, resp.content
    maint_uuid = resp.json()["uuid"]

    # List filtré par machine
    resp = api_client.get(f"{BASE}/maintenances/?machine_uuid={machine.uuid}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Récap machine : next_maintenance_date doit être hydraté
    resp = api_client.get(f"{BASE}/machines/{machine.uuid}/")
    assert resp.status_code == 200
    assert resp.json()["next_maintenance_date"] == "2027-05-01"
    assert resp.json()["last_maintenance_date"] == "2026-05-01"

    # Delete
    resp = api_client.delete(f"{BASE}/maintenances/{maint_uuid}/")
    assert resp.status_code == 204
    assert not MachineMaintenanceEntity.objects.filter(uuid=maint_uuid).exists()


@pytest.mark.django_db
def test_maintenance_next_date_before_date_returns_400(api_client, rooms):
    machine = MachineEntity.objects.create(name="M-maint-bad", room=rooms["B1"])
    resp = api_client.post(
        f"{BASE}/maintenances/",
        data=json.dumps(
            {
                "machine_uuid": str(machine.uuid),
                "date": "2026-05-01",
                "next_maintenance_date": "2026-01-01",
            }
        ),
        content_type="application/json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_maintenance_list_requires_machine_uuid(api_client):
    resp = api_client.get(f"{BASE}/maintenances/")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_maintenance_unknown_machine_returns_404(api_client):
    resp = api_client.post(
        f"{BASE}/maintenances/",
        data=json.dumps(
            {
                "machine_uuid": str(uuid.uuid4()),
                "date": "2026-05-01",
            }
        ),
        content_type="application/json",
    )
    assert resp.status_code == 404
