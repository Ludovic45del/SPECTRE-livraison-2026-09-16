"""
Tests d'intégration pour le controller Etalonnage.

Vérifie les endpoints API REST : create, list, delete.
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
class TestEtalonnageControllerCreate:
    """Tests POST /api/v1/etalonnages/ (create)."""

    base_url = "/api/v1/etalonnages/"

    def test_create_returns_201(self, api_client, created_embase):
        """POST /api/v1/etalonnages/ avec payload valide retourne 201."""
        payload = {
            "embase_uuid": created_embase.uuid,
            "voie": 1,
            "date": "2025-06-15",
            "operateur": "Jean Dupont",
        }

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["embase_uuid"] == created_embase.uuid
        assert data["voie"] == 1
        assert data["operateur"] == "Jean Dupont"
        assert "uuid" in data

    def test_create_embase_not_found_returns_404(self, api_client):
        """POST /api/v1/etalonnages/ avec embase_uuid invalide retourne 404."""
        fake_uuid = str(uuid.uuid4())
        payload = {
            "embase_uuid": fake_uuid,
            "voie": 1,
            "date": "2025-06-15",
            "operateur": "Jean Dupont",
        }

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageControllerList:
    """Tests GET /api/v1/etalonnages/ (list)."""

    base_url = "/api/v1/etalonnages/"

    def test_list_returns_200(self, api_client, created_embase):
        """GET /api/v1/etalonnages/?embase_uuid=... retourne 200."""
        # Créer un étalonnage d'abord
        payload = {
            "embase_uuid": created_embase.uuid,
            "voie": 1,
            "date": "2025-06-15",
            "operateur": "Jean Dupont",
        }
        api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        response = api_client.get(f"{self.base_url}?embase_uuid={created_embase.uuid}")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["embase_uuid"] == created_embase.uuid

    def test_list_missing_embase_uuid_returns_400(self, api_client):
        """GET /api/v1/etalonnages/ sans embase_uuid retourne 400."""
        response = api_client.get(self.base_url)

        assert response.status_code == 400


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageControllerDelete:
    """Tests DELETE /api/v1/etalonnages/{uuid}/."""

    base_url = "/api/v1/etalonnages/"

    def _create_etalonnage(self, client, embase_uuid):
        """Helper : crée un étalonnage et retourne son UUID."""
        payload = {
            "embase_uuid": embase_uuid,
            "voie": 1,
            "date": "2025-06-15",
            "operateur": "Jean Dupont",
        }
        response = client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        return response.json()["uuid"]

    def test_delete_with_admin_returns_204(
        self, api_client, admin_api_client, created_embase
    ):
        """DELETE /api/v1/etalonnages/{uuid}/ avec admin retourne 204."""
        etalonnage_uuid = self._create_etalonnage(api_client, created_embase.uuid)

        response = admin_api_client.delete(f"{self.base_url}{etalonnage_uuid}/")

        assert response.status_code == 204

    def test_delete_with_operateur_returns_403(self, api_client, created_embase):
        """DELETE /api/v1/etalonnages/{uuid}/ avec operateur retourne 403."""
        etalonnage_uuid = self._create_etalonnage(api_client, created_embase.uuid)

        response = api_client.delete(f"{self.base_url}{etalonnage_uuid}/")

        assert response.status_code == 403

    def test_delete_not_found_returns_404(self, admin_api_client):
        """DELETE /api/v1/etalonnages/{fake_uuid}/ retourne 404."""
        fake_uuid = str(uuid.uuid4())

        response = admin_api_client.delete(f"{self.base_url}{fake_uuid}/")

        assert response.status_code == 404
