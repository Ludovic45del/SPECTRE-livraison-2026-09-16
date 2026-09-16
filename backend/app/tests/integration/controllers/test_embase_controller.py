"""
Tests d'intégration pour le controller Embase.

Vérifie les endpoints API REST : list, retrieve, create, update, patch, delete.
"""

import json
import uuid

import pytest

from app.domain.embase.models.embase_bean import EmbaseBean
from app.repository.embase.repositories.embase_repository import EmbaseRepository


@pytest.fixture
def created_embase(db):
    """Crée une embase de test en base."""
    repo = EmbaseRepository()
    bean = EmbaseBean(
        identifier=f"G-INT-{uuid.uuid4().hex[:4]}",
        type="jet_de_gaz",
        nombre_voies=2,
    )
    return repo.create(bean)


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseControllerList:
    """Tests GET /api/v1/embases/ (list)."""

    base_url = "/api/v1/embases/"

    def test_list_returns_200(self, api_client, created_embase):
        """GET /api/v1/embases/ retourne 200 avec une liste."""
        response = api_client.get(self.base_url)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Vérifier la structure d'un élément
        assert "uuid" in data[0]
        assert "identifier" in data[0]
        assert "type" in data[0]

    def test_list_paginated_returns_200(self, api_client, created_embase):
        """GET /api/v1/embases/?page=1 retourne 200 avec résultat paginé."""
        response = api_client.get(f"{self.base_url}?page=1")

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "count" in data
        assert data["count"] >= 1


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseControllerRetrieve:
    """Tests GET /api/v1/embases/{uuid}/ (retrieve)."""

    base_url = "/api/v1/embases/"

    def test_retrieve_returns_200(self, api_client, created_embase):
        """GET /api/v1/embases/{uuid}/ retourne 200 avec l'embase."""
        response = api_client.get(f"{self.base_url}{created_embase.uuid}/")

        assert response.status_code == 200
        data = response.json()
        assert data["uuid"] == created_embase.uuid
        assert data["identifier"] == created_embase.identifier
        assert data["type"] == "jet_de_gaz"
        assert data["nombre_voies"] == 2

    def test_retrieve_not_found_returns_404(self, api_client):
        """GET /api/v1/embases/{fake_uuid}/ retourne 404."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.get(f"{self.base_url}{fake_uuid}/")

        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseControllerCreate:
    """Tests POST /api/v1/embases/ (create)."""

    base_url = "/api/v1/embases/"

    def test_create_returns_201(self, api_client):
        """POST /api/v1/embases/ avec payload valide retourne 201."""
        payload = {
            "identifier": "G-TEST-01",
            "type": "jet_de_gaz",
            "nombre_voies": 1,
        }

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["identifier"] == "G-TEST-01"
        assert data["type"] == "jet_de_gaz"
        assert data["nombre_voies"] == 1
        assert "uuid" in data

    def test_create_duplicate_identifier_returns_409(self, api_client, created_embase):
        """POST /api/v1/embases/ avec identifier existant retourne 409."""
        payload = {
            "identifier": created_embase.identifier,
            "type": "jet_de_gaz",
            "nombre_voies": 1,
        }

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 409

    def test_create_invalid_type_returns_400(self, api_client):
        """POST /api/v1/embases/ avec type invalide retourne 400."""
        payload = {
            "identifier": "G-BAD-01",
            "type": "type_invalide",
            "nombre_voies": 1,
        }

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 400


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseControllerUpdate:
    """Tests PUT et PATCH /api/v1/embases/{uuid}/."""

    base_url = "/api/v1/embases/"

    def test_update_returns_200(self, api_client, created_embase):
        """PUT /api/v1/embases/{uuid}/ retourne 200."""
        payload = {
            "identifier": created_embase.identifier,
            "type": "hp",
            "nombre_voies": 1,
            "soufflet_v1": "Soufflet modifié",
        }

        response = api_client.put(
            f"{self.base_url}{created_embase.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "hp"
        assert data["soufflet_v1"] == "Soufflet modifié"

    def test_patch_returns_200(self, api_client, created_embase):
        """PATCH /api/v1/embases/{uuid}/ retourne 200."""
        payload = {
            "localisation_actuelle": "Salle B2",
            "operationnelle_aimant": True,
        }

        response = api_client.patch(
            f"{self.base_url}{created_embase.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["localisation_actuelle"] == "Salle B2"
        assert data["operationnelle_aimant"] is True

    def test_patch_not_found_returns_404(self, api_client):
        """PATCH /api/v1/embases/{fake_uuid}/ retourne 404."""
        fake_uuid = str(uuid.uuid4())
        payload = {"localisation_actuelle": "Salle X"}

        response = api_client.patch(
            f"{self.base_url}{fake_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseControllerDelete:
    """Tests DELETE /api/v1/embases/{uuid}/."""

    base_url = "/api/v1/embases/"

    def test_delete_with_admin_returns_204(self, admin_api_client, created_embase):
        """DELETE /api/v1/embases/{uuid}/ avec admin retourne 204."""
        response = admin_api_client.delete(f"{self.base_url}{created_embase.uuid}/")

        assert response.status_code == 204

        # Vérifier que l'embase est bien supprimée
        get_response = admin_api_client.get(f"{self.base_url}{created_embase.uuid}/")
        assert get_response.status_code == 404

    def test_delete_with_operateur_returns_403(self, api_client, created_embase):
        """DELETE /api/v1/embases/{uuid}/ avec operateur retourne 403."""
        response = api_client.delete(f"{self.base_url}{created_embase.uuid}/")

        assert response.status_code == 403

    def test_delete_not_found_returns_404(self, admin_api_client):
        """DELETE /api/v1/embases/{fake_uuid}/ retourne 404."""
        fake_uuid = str(uuid.uuid4())

        response = admin_api_client.delete(f"{self.base_url}{fake_uuid}/")

        assert response.status_code == 404
