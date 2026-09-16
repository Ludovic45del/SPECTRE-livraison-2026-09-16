"""Tests d'intégration du controller LabContact (/api/v1/lab-contacts/).

Couvre le golden path CRUD (liste triée, création, lecture, mise à jour
complète PUT et partielle PATCH, suppression) et les cas d'erreur clés
(validation 400, not found 404 — uuid inconnu ou malformé —, accès non
authentifié).
"""

import json
import uuid

import pytest
from django.test import Client

from app.repository.labcontact.models import LabContactEntity

BASE = "/api/v1/lab-contacts"


def _post(client, payload):
    return client.post(
        f"{BASE}/", data=json.dumps(payload), content_type="application/json"
    )


def _put(client, contact_uuid, payload):
    return client.put(
        f"{BASE}/{contact_uuid}/",
        data=json.dumps(payload),
        content_type="application/json",
    )


def _patch(client, contact_uuid, payload):
    return client.patch(
        f"{BASE}/{contact_uuid}/",
        data=json.dumps(payload),
        content_type="application/json",
    )


# ---------------------------------------------------------------------------
# Liste
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
def test_list_empty_by_default(api_client):
    """Aucun seed : la liste part vide (les contacts sont saisis par l'équipe)."""
    resp = api_client.get(f"{BASE}/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.integration
@pytest.mark.django_db
def test_list_sorted_by_name(api_client):
    LabContactEntity.objects.create(name="Labo 426", phone="426")
    LabContactEntity.objects.create(name="Accueil", phone="9")
    LabContactEntity.objects.create(name="Labo 215", phone="215")

    resp = api_client.get(f"{BASE}/")
    assert resp.status_code == 200
    assert [item["name"] for item in resp.json()] == ["Accueil", "Labo 215", "Labo 426"]


@pytest.mark.integration
@pytest.mark.django_db
def test_list_sorted_case_insensitive(api_client):
    """Le tri serveur ignore la casse (un tri binaire placerait « accueil » après « Zone »)."""
    LabContactEntity.objects.create(name="Zone technique", phone="1")
    LabContactEntity.objects.create(name="accueil", phone="9")
    LabContactEntity.objects.create(name="Labo 215", phone="215")

    resp = api_client.get(f"{BASE}/")
    assert resp.status_code == 200
    assert [item["name"] for item in resp.json()] == [
        "accueil",
        "Labo 215",
        "Zone technique",
    ]


@pytest.mark.integration
@pytest.mark.django_db
def test_list_requires_authentication():
    anonymous = Client()
    resp = anonymous.get(f"{BASE}/")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
def test_crud_golden_path(api_client):
    # Create
    resp = _post(
        api_client, {"name": "Labo 426", "phone": "426", "comment": "Salle blanche"}
    )
    assert resp.status_code == 201, resp.content
    created = resp.json()
    assert created["name"] == "Labo 426"
    assert created["phone"] == "426"
    assert created["comment"] == "Salle blanche"
    assert created["created_at"] is not None
    contact_uuid = created["uuid"]
    assert LabContactEntity.objects.filter(uuid=contact_uuid).exists()

    # Retrieve
    resp = api_client.get(f"{BASE}/{contact_uuid}/")
    assert resp.status_code == 200
    assert resp.json()["uuid"] == contact_uuid

    # Update (PUT complet) — le téléphone devient vide, le commentaire est remplacé
    resp = _put(
        api_client,
        contact_uuid,
        {"name": "Labo 426 (bis)", "phone": "", "comment": "Nouvelle note"},
    )
    assert resp.status_code == 200, resp.content
    updated = resp.json()
    assert updated["uuid"] == contact_uuid
    assert updated["name"] == "Labo 426 (bis)"
    assert updated["phone"] == ""
    assert updated["comment"] == "Nouvelle note"
    entity = LabContactEntity.objects.get(uuid=contact_uuid)
    assert entity.name == "Labo 426 (bis)"

    # Delete
    resp = api_client.delete(f"{BASE}/{contact_uuid}/")
    assert resp.status_code == 204
    assert not LabContactEntity.objects.filter(uuid=contact_uuid).exists()


@pytest.mark.integration
@pytest.mark.django_db
def test_create_with_name_only(api_client):
    """phone et comment sont optionnels : un nom seul suffit."""
    resp = _post(api_client, {"name": "Gardiennage"})
    assert resp.status_code == 201, resp.content
    data = resp.json()
    assert data["phone"] == ""
    assert data["comment"] == ""


@pytest.mark.integration
@pytest.mark.django_db
def test_create_strips_whitespace(api_client):
    resp = _post(api_client, {"name": "  Labo 215  ", "phone": " 215 "})
    assert resp.status_code == 201, resp.content
    assert resp.json()["name"] == "Labo 215"
    assert resp.json()["phone"] == "215"


@pytest.mark.integration
@pytest.mark.django_db
def test_update_ignores_uuid_in_body(api_client):
    """L'uuid de l'URL fait foi : un uuid divergent dans le corps ne déplace pas la mise à jour."""
    entity = LabContactEntity.objects.create(name="Original", phone="1")
    other = LabContactEntity.objects.create(name="Autre", phone="2")

    resp = _put(
        api_client,
        entity.uuid,
        {"uuid": str(other.uuid), "name": "Renommé", "phone": "1"},
    )
    assert resp.status_code == 200, resp.content
    assert resp.json()["uuid"] == str(entity.uuid)
    assert LabContactEntity.objects.get(uuid=entity.uuid).name == "Renommé"
    assert LabContactEntity.objects.get(uuid=other.uuid).name == "Autre"


# ---------------------------------------------------------------------------
# PATCH (mise à jour partielle)
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_updates_only_provided_fields(api_client):
    """PATCH ne touche que les champs fournis : nom et commentaire conservés."""
    entity = LabContactEntity.objects.create(
        name="Labo 426", phone="426", comment="Salle blanche"
    )

    resp = _patch(api_client, entity.uuid, {"phone": " 4260 "})
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert data["uuid"] == str(entity.uuid)
    assert data["name"] == "Labo 426"
    assert data["phone"] == "4260"
    assert data["comment"] == "Salle blanche"

    entity.refresh_from_db()
    assert entity.name == "Labo 426"
    assert entity.phone == "4260"
    assert entity.comment == "Salle blanche"


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_can_clear_optional_fields(api_client):
    entity = LabContactEntity.objects.create(
        name="Labo 426", phone="426", comment="Salle blanche"
    )

    resp = _patch(api_client, entity.uuid, {"phone": "", "comment": ""})
    assert resp.status_code == 200, resp.content
    entity.refresh_from_db()
    assert entity.phone == ""
    assert entity.comment == ""
    assert entity.name == "Labo 426"


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_ignores_uuid_in_body(api_client):
    """Comme pour le PUT : l'uuid de l'URL fait foi, celui du corps est ignoré."""
    entity = LabContactEntity.objects.create(name="Original", phone="1")
    other = LabContactEntity.objects.create(name="Autre", phone="2")

    resp = _patch(api_client, entity.uuid, {"uuid": str(other.uuid), "name": "Renommé"})
    assert resp.status_code == 200, resp.content
    assert resp.json()["uuid"] == str(entity.uuid)
    assert LabContactEntity.objects.get(uuid=entity.uuid).name == "Renommé"
    assert LabContactEntity.objects.get(uuid=other.uuid).name == "Autre"


@pytest.mark.integration
@pytest.mark.django_db
@pytest.mark.parametrize("name", ["", "   "])
def test_patch_blank_name_returns_400(api_client, name):
    entity = LabContactEntity.objects.create(name="Labo 426", phone="426")

    resp = _patch(api_client, entity.uuid, {"name": name})
    assert resp.status_code == 400
    assert LabContactEntity.objects.get(uuid=entity.uuid).name == "Labo 426"


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_phone_too_long_returns_400(api_client):
    entity = LabContactEntity.objects.create(name="Labo 426", phone="426")

    resp = _patch(api_client, entity.uuid, {"phone": "9" * 31})
    assert resp.status_code == 400
    assert LabContactEntity.objects.get(uuid=entity.uuid).phone == "426"


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_unknown_returns_404(api_client):
    resp = _patch(api_client, uuid.uuid4(), {"name": "Fantôme"})
    assert resp.status_code == 404
    assert resp.json()["type"] == "NotFoundException"


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_requires_authentication():
    entity = LabContactEntity.objects.create(name="Labo 426", phone="426")
    resp = _patch(Client(), entity.uuid, {"name": "Pirate"})
    assert resp.status_code in (401, 403)
    assert LabContactEntity.objects.get(uuid=entity.uuid).name == "Labo 426"


# ---------------------------------------------------------------------------
# Erreurs
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
@pytest.mark.parametrize(
    "payload", [{}, {"name": ""}, {"name": "   "}, {"phone": "426"}]
)
def test_create_without_name_returns_400(api_client, payload):
    resp = _post(api_client, payload)
    assert resp.status_code == 400
    assert LabContactEntity.objects.count() == 0


@pytest.mark.integration
@pytest.mark.django_db
def test_create_name_too_long_returns_400(api_client):
    resp = _post(api_client, {"name": "x" * 151})
    assert resp.status_code == 400


@pytest.mark.integration
@pytest.mark.django_db
def test_create_phone_too_long_returns_400(api_client):
    resp = _post(api_client, {"name": "Labo", "phone": "9" * 31})
    assert resp.status_code == 400


@pytest.mark.integration
@pytest.mark.django_db
def test_retrieve_unknown_returns_404(api_client):
    resp = api_client.get(f"{BASE}/{uuid.uuid4()}/")
    assert resp.status_code == 404
    # ErrorHandlerMiddleware n'enrichit le code en « LAB_CONTACT_NOT_FOUND » qu'en
    # DEBUG=True ; sous test (DEBUG forcé à False) le code générique est renvoyé.
    assert resp.json()["code"].endswith("NOT_FOUND")
    assert resp.json()["type"] == "NotFoundException"


@pytest.mark.integration
@pytest.mark.django_db
def test_update_unknown_returns_404(api_client):
    resp = _put(api_client, uuid.uuid4(), {"name": "Fantôme"})
    assert resp.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
def test_delete_unknown_returns_404(api_client):
    resp = api_client.delete(f"{BASE}/{uuid.uuid4()}/")
    assert resp.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
@pytest.mark.parametrize("malformed", ["not-a-uuid", "1234", "zz"])
def test_retrieve_malformed_uuid_returns_404(api_client, malformed):
    """Un segment d'URL non-UUID est traité comme un contact absent (404, jamais 500)."""
    resp = api_client.get(f"{BASE}/{malformed}/")
    assert resp.status_code == 404
    assert resp.json()["type"] == "NotFoundException"


@pytest.mark.integration
@pytest.mark.django_db
def test_delete_malformed_uuid_returns_404(api_client):
    LabContactEntity.objects.create(name="Témoin", phone="1")

    resp = api_client.delete(f"{BASE}/not-a-uuid/")
    assert resp.status_code == 404
    assert resp.json()["type"] == "NotFoundException"
    # Aucune ligne supprimée par effet de bord.
    assert LabContactEntity.objects.count() == 1


@pytest.mark.integration
@pytest.mark.django_db
def test_patch_malformed_uuid_returns_404(api_client):
    resp = _patch(api_client, "not-a-uuid", {"name": "Fantôme"})
    assert resp.status_code == 404
    assert resp.json()["type"] == "NotFoundException"
