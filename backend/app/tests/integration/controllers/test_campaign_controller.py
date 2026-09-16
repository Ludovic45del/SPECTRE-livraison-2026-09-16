"""
Tests d'intégration pour le controller Campaign.

Ces tests vérifient les endpoints API avec des requêtes HTTP réelles.
"""

import json
import uuid

import pytest


@pytest.fixture
def sample_campaign_payload():
    """Payload de création de campagne."""
    return {
        "type_id": 0,
        "status_id": 0,
        "installation_id": 0,
        "name": f"Campagne API Test {uuid.uuid4().hex[:8]}",
        "year": 2025,
        "semester": "S1",
        "start_date": "2025-01-15",
        "end_date": "2025-06-30",
        "dtri_number": 12345,
        "description": "Test via API",
    }


# ============================================================================
# LIST ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerList:
    """Tests endpoint GET /api/v1/campaigns/"""

    def test_list_campaigns_success(self, api_client):
        """Test récupération liste des campagnes."""
        response = api_client.get("/api/v1/campaigns/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_campaigns_returns_json(self, api_client):
        """Test que la réponse est en JSON."""
        response = api_client.get("/api/v1/campaigns/")

        assert response["Content-Type"] == "application/json"


# ============================================================================
# CREATE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerCreate:
    """Tests endpoint POST /api/v1/campaigns/"""

    def test_create_campaign_success(self, api_client, sample_campaign_payload):
        """Test création réussie d'une campagne."""
        response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_campaign_payload["name"]
        assert "uuid" in data

    def test_create_campaign_validation_error(self, api_client):
        """Test erreur de validation (champs requis manquants)."""
        invalid_payload = {"name": ""}  # Données incomplètes

        response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(invalid_payload),
            content_type="application/json",
        )

        # Devrait retourner une erreur 400 ou 500 selon l'implémentation
        assert response.status_code in [400, 500]

    def test_create_campaign_duplicate_conflict(
        self, api_client, sample_campaign_payload
    ):
        """Test erreur de conflit pour doublon."""
        # Créer une première campagne
        api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )

        # Tenter de créer un doublon
        response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )

        # Devrait retourner une erreur de conflit
        assert response.status_code in [409, 500]


# ============================================================================
# RETRIEVE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerRetrieve:
    """Tests endpoint GET /api/v1/campaigns/{uuid}/"""

    def test_retrieve_campaign_success(self, api_client, sample_campaign_payload):
        """Test récupération d'une campagne par UUID."""
        # Créer une campagne
        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        # Récupérer la campagne
        response = api_client.get(f"/api/v1/campaigns/{campaign_uuid}/")

        assert response.status_code == 200
        data = response.json()
        assert data["uuid"] == campaign_uuid
        assert data["name"] == sample_campaign_payload["name"]

    def test_retrieve_campaign_not_found(self, api_client):
        """Test 404 pour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.get(f"/api/v1/campaigns/{fake_uuid}/")

        assert response.status_code in [404, 500]


# ============================================================================
# UPDATE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerUpdate:
    """Tests endpoint PUT /api/v1/campaigns/{uuid}/"""

    def test_update_campaign_success(self, api_client, sample_campaign_payload):
        """Test mise à jour réussie."""
        # Créer une campagne
        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        # Mettre à jour
        updated_payload = sample_campaign_payload.copy()
        updated_payload["name"] = "Campagne Modifiée"
        updated_payload["description"] = "Description modifiée"

        response = api_client.put(
            f"/api/v1/campaigns/{campaign_uuid}/",
            data=json.dumps(updated_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Campagne Modifiée"

    def test_update_campaign_not_found(self, api_client, sample_campaign_payload):
        """Test 404 pour mise à jour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.put(
            f"/api/v1/campaigns/{fake_uuid}/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )

        assert response.status_code in [404, 500]


# ============================================================================
# PATCH ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerPatch:
    """Tests endpoint PATCH /api/v1/campaigns/{uuid}/"""

    def test_patch_campaign_success(self, api_client, sample_campaign_payload):
        """Test mise à jour partielle réussie."""
        # Créer une campagne
        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        # Patch uniquement le nom
        patch_payload = {"name": "Nom Patché"}

        response = api_client.patch(
            f"/api/v1/campaigns/{campaign_uuid}/",
            data=json.dumps(patch_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Nom Patché"
        # Les autres champs doivent être préservés
        assert data["year"] == sample_campaign_payload["year"]

    def test_patch_campaign_status_only(self, api_client, sample_campaign_payload):
        """Test modification du statut uniquement."""
        # Créer une campagne
        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        # Patch uniquement le statut
        patch_payload = {"status_id": 1}

        response = api_client.patch(
            f"/api/v1/campaigns/{campaign_uuid}/",
            data=json.dumps(patch_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status_id"] == 1

    def _seed_campaign_with_fa(self, api_client, sample_campaign_payload):
        """Crée campagne → FSEC rattaché → FA, et renvoie (uuid, payload, fa, fsec)."""
        from datetime import date as _date

        from app.domain.fa.services.fa_service import generate_fa_identifier
        from app.repository.fa.models.fa_entity import FaEntity
        from app.repository.fsec.models.fsec_entity import FsecEntity

        campaign_uuid = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        ).json()["uuid"]

        fsec_payload = {
            "name": f"FSEC {uuid.uuid4().hex[:8]}",
            "campaign_id": campaign_uuid,
            "status_id": 0,
            "category_id": 0,
            "rack_id": None,
            "comments": "",
        }
        version_uuid = api_client.post(
            "/api/v1/fsecs/",
            data=json.dumps(fsec_payload),
            content_type="application/json",
        ).json()["version_uuid"]
        fsec_entity = FsecEntity.objects.get(version_uuid=version_uuid)

        initial = generate_fa_identifier(
            sample_campaign_payload["name"],
            fsec_payload["name"],
            sample_campaign_payload["year"],
            1,
        )
        fa = FaEntity.objects.create(
            fsec_version_id=fsec_entity,
            status_id_id=0,
            identifier=initial,
            discoverer="Testeur",
            event_date=_date(2025, 3, 1),
            observation="obs",
            quick_analysis="qa",
        )
        return campaign_uuid, fsec_payload, fa, initial

    def test_patch_campaign_rename_regenerates_fa_identifiers(
        self, api_client, sample_campaign_payload
    ):
        """Renommer une campagne (PATCH) réaligne l'identifiant des FA de ses FSEC."""
        from app.domain.fa.services.fa_service import generate_fa_identifier

        campaign_uuid, fsec_payload, fa, initial = self._seed_campaign_with_fa(
            api_client, sample_campaign_payload
        )

        new_name = "Campagne Renommée 2026"
        new_year = 2026
        response = api_client.patch(
            f"/api/v1/campaigns/{campaign_uuid}/",
            data=json.dumps({"name": new_name, "year": new_year}),
            content_type="application/json",
        )
        assert response.status_code == 200

        fa.refresh_from_db()
        expected = generate_fa_identifier(new_name, fsec_payload["name"], new_year, 1)
        assert fa.identifier == expected
        assert fa.identifier != initial

    def test_patch_campaign_non_identifying_field_keeps_fa_identifier(
        self, api_client, sample_campaign_payload
    ):
        """Un PATCH sans changement de nom/année ne touche pas l'identifiant FA."""
        campaign_uuid, _, fa, initial = self._seed_campaign_with_fa(
            api_client, sample_campaign_payload
        )

        # PATCH du statut uniquement : aucun impact attendu sur l'identifiant FA.
        response = api_client.patch(
            f"/api/v1/campaigns/{campaign_uuid}/",
            data=json.dumps({"status_id": 1}),
            content_type="application/json",
        )
        assert response.status_code == 200

        fa.refresh_from_db()
        assert fa.identifier == initial


# ============================================================================
# DELETE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignControllerDelete:
    """Tests endpoint DELETE /api/v1/campaigns/{uuid}/"""

    def test_delete_campaign_success(
        self, api_client, admin_api_client, sample_campaign_payload
    ):
        """Test suppression réussie (requiert rôle admin)."""
        # Créer une campagne
        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        # Supprimer avec un client admin
        response = admin_api_client.delete(f"/api/v1/campaigns/{campaign_uuid}/")

        assert response.status_code == 204

        # Vérifier que la campagne n'existe plus
        get_response = api_client.get(f"/api/v1/campaigns/{campaign_uuid}/")
        assert get_response.status_code in [404, 500]

    def test_delete_campaign_not_found(self, admin_api_client):
        """Test 404 pour suppression UUID inexistant (requiert rôle admin)."""
        fake_uuid = str(uuid.uuid4())

        response = admin_api_client.delete(f"/api/v1/campaigns/{fake_uuid}/")

        assert response.status_code in [404, 500]

    def test_delete_campaign_with_team_member(
        self, api_client, admin_api_client, sample_campaign_payload
    ):
        """Régression : une campagne avec équipe (FK PROTECT) doit se supprimer.

        Avant le fix, le delete() Django levait ProtectedError -> 500 dès qu'un
        membre d'équipe existait (cas courant RCE/IEC). Les enfants PROTECT sont
        désormais supprimés en cascade par le service.
        """
        from app.repository.campaign.models.campaign_roles_entity import (
            CampaignRolesEntity,
        )
        from app.repository.campaign.models.campaign_teams_entity import (
            CampaignTeamsEntity,
        )

        create_response = api_client.post(
            "/api/v1/campaigns/",
            data=json.dumps(sample_campaign_payload),
            content_type="application/json",
        )
        campaign_uuid = create_response.json()["uuid"]

        role = CampaignRolesEntity.objects.first()
        if role is None:
            role = CampaignRolesEntity.objects.create(label="ROLE_TEST")
        CampaignTeamsEntity.objects.create(
            campaign_uuid_id=campaign_uuid, role_id_id=role.id, name="Externe"
        )

        response = admin_api_client.delete(f"/api/v1/campaigns/{campaign_uuid}/")

        assert response.status_code == 204
        assert not CampaignTeamsEntity.objects.filter(
            campaign_uuid_id=campaign_uuid
        ).exists()
