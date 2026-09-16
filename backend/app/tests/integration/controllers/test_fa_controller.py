"""
Tests d'intégration pour le controller FA (Fiche d'Anomalie).

Ces tests vérifient les endpoints API REST pour les opérations FA.
"""

import json
import uuid

import pytest

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity


@pytest.fixture
def sample_fsec_version(db):
    """Version FSEC de test pour les FA."""
    campaign = CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Campaign FA Test {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )

    fsec_version = FsecEntity.objects.create(
        campaign_id=campaign,
        name=f"FSEC FA Test {uuid.uuid4().hex[:8]}",
        status_id_id=0,
        category_id_id=0,
    )

    return fsec_version


@pytest.fixture
def sample_fa_payload(sample_fsec_version):
    """Payload de création FA."""
    return {
        "fsec_version_id": str(sample_fsec_version.version_uuid),
        "status_id": 0,  # Ouvert
        # Phase 1
        "fsec_step_id": 2,  # Métrologie
        "event_date": "2025-02-15",
        "discoverer": "Test Discoverer",
        "observation": "Anomalie détectée pendant test",
        "location_equipment": "Salle A - Machine M01",
        "quick_analysis": "Analyse initiale",
        "immediate_measures": "Mesures prises",
    }


# ============================================================================
# LIST ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerList:
    """Tests endpoint GET /api/v1/fas/"""

    def test_list_fas_success(self, api_client):
        """Test récupération liste des FA."""
        response = api_client.get("/api/v1/fas/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_fas_returns_json(self, api_client):
        """Test que la réponse est en JSON."""
        response = api_client.get("/api/v1/fas/")

        assert response["Content-Type"] == "application/json"


# ============================================================================
# CREATE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerCreate:
    """Tests endpoint POST /api/v1/fas/"""

    def test_create_fa_success(self, api_client, sample_fa_payload):
        """Test création réussie d'une FA."""
        response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert "uuid" in data
        assert "identifier" in data
        assert data["status_id"] == 0  # Ouvert
        assert data["discoverer"] == "Test Discoverer"

    def test_create_fa_with_minimal_data(self, api_client, sample_fsec_version):
        """Test création FA avec données minimales."""
        payload = {
            "fsec_version_id": str(sample_fsec_version.version_uuid),
            "status_id": 0,
            "event_date": "2025-02-20",
            "discoverer": "Minimal User",
            "observation": "Observation minimale",
            "quick_analysis": "Analyse minimale",
        }

        response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201

    def test_create_fa_with_custom_fsec_step(self, api_client, sample_fsec_version):
        """Test création FA avec étape FSEC personnalisée (Autre)."""
        payload = {
            "fsec_version_id": str(sample_fsec_version.version_uuid),
            "status_id": 0,
            "fsec_step_id": 7,  # Autre
            "fsec_step_other": "Étape transport",
            "event_date": "2025-02-25",
            "discoverer": "Custom User",
            "observation": "Test custom step",
            "quick_analysis": "Custom analysis",
        }

        response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["fsec_step_id"] == 7
        assert data["fsec_step_other"] == "Étape transport"


# ============================================================================
# RETRIEVE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerRetrieve:
    """Tests endpoint GET /api/v1/fas/{uuid}/"""

    def test_retrieve_fa_success(self, api_client, sample_fa_payload):
        """Test récupération d'une FA par UUID."""
        # Créer une FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Récupérer la FA
        response = api_client.get(f"/api/v1/fas/{fa_uuid}/")

        assert response.status_code == 200
        data = response.json()
        assert data["uuid"] == fa_uuid
        assert "identifier" in data

    def test_retrieve_fa_not_found(self, api_client):
        """Test 404 pour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.get(f"/api/v1/fas/{fake_uuid}/")

        assert response.status_code in [404, 500]


# ============================================================================
# UPDATE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerUpdate:
    """Tests endpoint PUT /api/v1/fas/{uuid}/"""

    def test_update_fa_success(self, api_client, sample_fa_payload):
        """Test mise à jour réussie."""
        # Créer une FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Mettre à jour
        updated_payload = sample_fa_payload.copy()
        updated_payload["observation"] = "Observation mise à jour"

        response = api_client.put(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps(updated_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["observation"] == "Observation mise à jour"

    def test_update_fa_not_found(self, api_client, sample_fa_payload):
        """Test 404 pour mise à jour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.put(
            f"/api/v1/fas/{fake_uuid}/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )

        assert response.status_code in [404, 500]


# ============================================================================
# PATCH ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerPatch:
    """Tests endpoint PATCH /api/v1/fas/{uuid}/"""

    def test_patch_fa_status_id_is_allowed(self, api_client, sample_fa_payload):
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        patch_payload = {"status_id": 1}

        response = api_client.patch(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps(patch_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status_id"] == 1

    def test_patch_fa_phase2_data(self, api_client, sample_fa_payload):
        """Test mise à jour données Phase 2."""
        # Créer une FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Patch données Phase 2
        patch_payload = {
            "status_id": 1,  # En cours
            "cause": "Défaut identifié",
            "type_id": 1,  # Matériel
            "criticality_id": 2,  # Haute
            "experience_impact": "Impact sur expérience",
        }

        response = api_client.patch(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps(patch_payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cause"] == "Défaut identifié"
        assert data["type_id"] == 1
        assert data["criticality_id"] == 2


# ============================================================================
# DELETE ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerDelete:
    """Tests endpoint DELETE /api/v1/fas/{uuid}/"""

    def test_delete_fa_success(self, api_client, admin_api_client, sample_fa_payload):
        """Test suppression réussie (requiert rôle admin)."""
        # Créer une FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Supprimer avec un client admin
        response = admin_api_client.delete(f"/api/v1/fas/{fa_uuid}/")

        assert response.status_code == 204

        # Vérifier que la FA n'existe plus
        get_response = api_client.get(f"/api/v1/fas/{fa_uuid}/")
        assert get_response.status_code in [404, 500]

    def test_delete_fa_not_found(self, admin_api_client):
        """Test 404 pour suppression UUID inexistant (requiert rôle admin)."""
        fake_uuid = str(uuid.uuid4())

        response = admin_api_client.delete(f"/api/v1/fas/{fake_uuid}/")

        assert response.status_code in [404, 500]


# ============================================================================
# BY FSEC ENDPOINT TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaControllerByFsec:
    """Tests endpoint GET /api/v1/fas/fsec/{fsec_version_uuid}/"""

    def test_get_fa_by_fsec_success(self, api_client, sample_fsec_version):
        """Test récupération FA par FSEC."""
        # Créer une FA pour ce FSEC
        payload = {
            "fsec_version_id": str(sample_fsec_version.version_uuid),
            "status_id": 0,
            "event_date": "2025-03-01",
            "discoverer": "Discoverer",
            "observation": "Observation",
            "quick_analysis": "Analysis",
        }
        api_client.post(
            "/api/v1/fas/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        # Récupérer par FSEC
        response = api_client.get(
            f"/api/v1/fas/fsec/{str(sample_fsec_version.version_uuid)}/"
        )

        assert response.status_code == 200
        data = response.json()
        # Une FSEC peut avoir plusieurs FA : l'endpoint renvoie une liste.
        assert isinstance(data, list)
        assert data[0]["fsec_version_id"] == str(sample_fsec_version.version_uuid)

    def test_get_fa_by_fsec_empty_list(self, api_client):
        """Une FSEC sans FA renvoie une liste vide (200), pas un 404."""
        fake_fsec_uuid = str(uuid.uuid4())

        response = api_client.get(f"/api/v1/fas/fsec/{fake_fsec_uuid}/")

        assert response.status_code == 200
        assert response.json() == []


# ============================================================================
# STATUS WORKFLOW TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaStatusWorkflow:
    """Tests du workflow de statuts FA."""

    def test_workflow_ouvert_to_encours_to_clos(self, api_client, sample_fa_payload):
        """Test workflow complet : Ouvert → En cours → Clos via endpoints de workflow."""
        # Créer FA en Ouvert (0)
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]
        assert create_response.json()["status_id"] == 0

        # Passer En cours (1) via validate-open
        validate_response = api_client.post(
            f"/api/v1/fas/{fa_uuid}/validate-open/",
            data=json.dumps(
                {
                    "validator_name": "Valideur IEC",
                    "validation_date": "2025-03-20",
                }
            ),
            content_type="application/json",
        )
        assert validate_response.status_code == 200
        assert validate_response.json()["status_id"] == 1

        # Valider la phase En cours via validate-progress
        progress_response = api_client.post(
            f"/api/v1/fas/{fa_uuid}/validate-progress/",
            data=json.dumps(
                {
                    "validator_name": "Valideur Progress",
                    "validation_date": "2025-04-01",
                }
            ),
            content_type="application/json",
        )
        assert progress_response.status_code == 200

        # Passer Clos (2) via close
        close_response = api_client.post(
            f"/api/v1/fas/{fa_uuid}/close/",
            data=json.dumps(
                {
                    "validator_name": "Chef Labo + IEC",
                    "closure_validation": "FA clôturée",
                    "closure_date": "2025-04-15",
                }
            ),
            content_type="application/json",
        )
        assert close_response.status_code == 200
        assert close_response.json()["status_id"] == 2

    def test_workflow_backward_navigation_allowed_via_patch(
        self, api_client, sample_fa_payload
    ):
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        api_client.post(
            f"/api/v1/fas/{fa_uuid}/validate-open/",
            data=json.dumps(
                {
                    "validator_name": "Valideur IEC",
                    "validation_date": "2025-03-20",
                }
            ),
            content_type="application/json",
        )

        patch_response = api_client.patch(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps({"status_id": 0}),
            content_type="application/json",
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["status_id"] == 0

    def test_workflow_direct_to_clos_not_allowed(self, api_client, sample_fa_payload):
        """Test que le passage direct de Ouvert à Clos est impossible.

        Le workflow requiert : Ouvert → validate-open → En cours → validate-progress → close → Clos.
        Tenter de fermer directement une FA au statut Ouvert doit échouer.
        """
        # Créer FA (statut Ouvert)
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Tenter de fermer directement (FA pas en En cours → ConflictException → 409)
        close_response = api_client.post(
            f"/api/v1/fas/{fa_uuid}/close/",
            data=json.dumps(
                {
                    "validator_name": "Chef Labo",
                    "closure_validation": "Tentative fermeture directe",
                    "closure_date": "2025-04-15",
                }
            ),
            content_type="application/json",
        )
        assert close_response.status_code == 409


# ============================================================================
# TYPE AND CRITICALITY TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestFaTypeAndCriticality:
    """Tests des types 5M et niveaux de criticité."""

    @pytest.mark.parametrize("type_id", [0, 1, 2, 3, 4])
    def test_all_type_5m_values(self, api_client, sample_fa_payload, type_id):
        """Test tous les types 5M."""
        # Créer FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Patch avec type
        patch_response = api_client.patch(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps({"type_id": type_id}),
            content_type="application/json",
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["type_id"] == type_id

    @pytest.mark.parametrize("criticality_id", [0, 1, 2, 3])
    def test_all_criticality_values(
        self, api_client, sample_fa_payload, criticality_id
    ):
        """Test tous les niveaux de criticité."""
        # Créer FA
        create_response = api_client.post(
            "/api/v1/fas/",
            data=json.dumps(sample_fa_payload),
            content_type="application/json",
        )
        fa_uuid = create_response.json()["uuid"]

        # Patch avec criticality
        patch_response = api_client.patch(
            f"/api/v1/fas/{fa_uuid}/",
            data=json.dumps({"criticality_id": criticality_id}),
            content_type="application/json",
        )
        assert patch_response.status_code == 200
        assert patch_response.json()["criticality_id"] == criticality_id
