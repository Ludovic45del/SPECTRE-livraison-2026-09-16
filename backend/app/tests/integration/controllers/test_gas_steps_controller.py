"""
Tests d'intégration pour les controllers Gas Steps.

Ces tests vérifient les endpoints API REST pour tous les types de gas steps:
- AirtightnessTestLpStep
- GasFillingBpStep
- GasFillingHpStep
- PermeationStep
- DepressurizationStep
- RepressurizationStep
- AllGasSteps (endpoint agrégé)
"""

import json
import uuid

import pytest

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity


@pytest.fixture
def create_test_fsec(db):
    """Crée une campagne et un FSEC de test pour les gas steps."""
    # Créer une campagne
    campaign = CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Campaign Test {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )

    # Créer un FSEC (single-table with version_uuid PK)
    fsec_version = FsecEntity.objects.create(
        campaign_id=campaign,
        name=f"FSEC Test {uuid.uuid4().hex[:8]}",
        status_id_id=0,
        category_id_id=4,  # Catégorie avec gas steps
    )

    return str(fsec_version.version_uuid)


# ============================================================================
# AIRTIGHTNESS TEST LP STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestAirtightnessTestLpStepController:
    """Tests endpoint /api/v1/airtightness-test-lp-steps/"""

    base_url = "/api/v1/airtightness-test-lp-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "leak_rate_dtri": "0.001",
            "gas_type": "Helium",
            "experiment_pressure": 1.5,
            "airtightness_test_duration": 120.0,
            "operator": "Test Operator",
            "date_of_fulfilment": "2025-03-05",
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["leak_rate_dtri"] == "0.001"
        assert data["gas_type"] == "Helium"
        assert "uuid" in data

    def test_create_step_fsec_not_found(self, api_client):
        """Test erreur 404 si FSEC inexistant."""
        fake_uuid = str(uuid.uuid4())
        payload = self.get_sample_payload(fake_uuid)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 404

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step par UUID."""
        # Créer un step
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        # Récupérer le step
        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200
        data = response.json()
        assert data["uuid"] == step_uuid
        assert data["gas_type"] == "Helium"

    def test_retrieve_step_not_found(self, api_client):
        """Test 404 pour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.get(f"{self.base_url}{fake_uuid}/")

        assert response.status_code == 404

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        # Créer un step
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        # Mettre à jour
        payload["gas_type"] = "Azote"
        payload["experiment_pressure"] = 2.0

        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["gas_type"] == "Azote"
        assert data["experiment_pressure"] == 2.0

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        # Créer un step
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        # Supprimer
        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204

        # Vérifier suppression
        get_response = api_client.get(f"{self.base_url}{step_uuid}/")
        assert get_response.status_code == 404

    def test_get_by_fsec_success(self, api_client, create_test_fsec):
        """Test récupération de tous les steps pour un FSEC."""
        # Créer plusieurs steps
        for _ in range(3):
            payload = self.get_sample_payload(create_test_fsec)
            api_client.post(
                self.base_url,
                data=json.dumps(payload),
                content_type="application/json",
            )

        # Récupérer par FSEC
        response = api_client.get(f"{self.base_url}fsec/{create_test_fsec}/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3


# ============================================================================
# GAS FILLING BP STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestGasFillingBpStepController:
    """Tests endpoint /api/v1/gas-filling-bp-steps/"""

    base_url = "/api/v1/gas-filling-bp-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "leak_rate_dtri": "0.002",
            "gas_type": "Azote",
            "experiment_pressure": 2.0,
            "leak_test_duration": 60.0,
            "operator": "Test Operator BP",
            "date_of_fulfilment": "2025-03-10",
            "gas_base": 1,
            "gas_container": 2,
            "observations": "Test observations",
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["gas_type"] == "Azote"
        assert data["gas_base"] == 1
        assert data["gas_container"] == 2

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200
        assert response.json()["uuid"] == step_uuid

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        payload["observations"] = "Updated observations"
        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["observations"] == "Updated observations"

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204


# ============================================================================
# GAS FILLING HP STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestGasFillingHpStepController:
    """Tests endpoint /api/v1/gas-filling-hp-steps/"""

    base_url = "/api/v1/gas-filling-hp-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "leak_rate_dtri": "0.003",
            "gas_type": "Helium",
            "experiment_pressure": 10.0,
            "operator": "Test Operator HP",
            "date_of_fulfilment": "2025-03-15",
            "gas_base": 1,
            "gas_container": 3,
            "observations": "HP test observations",
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["experiment_pressure"] == 10.0

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        payload["experiment_pressure"] = 15.0
        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["experiment_pressure"] == 15.0

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204


# ============================================================================
# PERMEATION STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestPermeationStepController:
    """Tests endpoint /api/v1/permeation-steps/"""

    base_url = "/api/v1/permeation-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "gas_type": "Helium",
            "target_pressure": 5.0,
            "operator": "Permeation Operator",
            "sensor_pressure": 4.8,
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["target_pressure"] == 5.0

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        payload["target_pressure"] = 8.0
        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["target_pressure"] == 8.0

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204


# ============================================================================
# DEPRESSURIZATION STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestDepressurizationStepController:
    """Tests endpoint /api/v1/depressurization-steps/"""

    base_url = "/api/v1/depressurization-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "pressure_gauge": 10.0,
            "enclosure_pressure_measured": 1.0,
            "depressurization_time_before_firing": 30.0,
            "operator": "Depressurization Operator",
            "date_of_fulfilment": "2025-03-25",
            "observations": "Depressurization complete",
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["pressure_gauge"] == 10.0
        assert data["enclosure_pressure_measured"] == 1.0

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        payload["observations"] = "Updated observations"
        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["observations"] == "Updated observations"

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204


# ============================================================================
# REPRESSURIZATION STEP TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestRepressurizationStepController:
    """Tests endpoint /api/v1/repressurization-steps/"""

    base_url = "/api/v1/repressurization-steps/"

    def get_sample_payload(self, fsec_version_id):
        """Payload pour création de step."""
        return {
            "fsec_version_id": fsec_version_id,
            "operator": "Repressurization Operator",
            "gas_type": "Helium",
            "sensor_pressure": 1.0,
            "computed_pressure": 10.0,
        }

    def test_create_step_success(self, api_client, create_test_fsec):
        """Test création réussie d'un step."""
        payload = self.get_sample_payload(create_test_fsec)

        response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["sensor_pressure"] == 1.0
        assert data["computed_pressure"] == 10.0

    def test_retrieve_step_success(self, api_client, create_test_fsec):
        """Test récupération d'un step."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.get(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 200

    def test_update_step_success(self, api_client, create_test_fsec):
        """Test mise à jour réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        payload["computed_pressure"] = 12.0
        response = api_client.put(
            f"{self.base_url}{step_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["computed_pressure"] == 12.0

    def test_delete_step_success(self, api_client, create_test_fsec):
        """Test suppression réussie."""
        payload = self.get_sample_payload(create_test_fsec)
        create_response = api_client.post(
            self.base_url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        step_uuid = create_response.json()["uuid"]

        response = api_client.delete(f"{self.base_url}{step_uuid}/")

        assert response.status_code == 204


# ============================================================================
# ALL GAS STEPS CONTROLLER TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestAllGasStepsController:
    """Tests endpoint /api/v1/all-gas-steps/"""

    base_url = "/api/v1/all-gas-steps/"

    def test_get_all_gas_steps_empty(self, api_client, create_test_fsec):
        """Test récupération avec aucun gas step."""
        response = api_client.get(f"{self.base_url}{create_test_fsec}/")

        assert response.status_code == 200
        data = response.json()

        # Vérifier la structure
        assert "airtightnessTestLp" in data
        assert "gasFillingBp" in data
        assert "gasFillingHp" in data
        assert "permeation" in data
        assert "depressurization" in data
        assert "repressurization" in data

        # Toutes les listes vides
        assert data["airtightnessTestLp"] == []
        assert data["gasFillingBp"] == []

    def test_get_all_gas_steps_with_data(self, api_client, create_test_fsec):
        """Test récupération avec gas steps existants."""
        # Créer quelques gas steps
        airtightness_payload = {
            "fsec_version_id": create_test_fsec,
            "leak_rate_dtri": "0.001",
            "gas_type": "Helium",
            "experiment_pressure": 1.5,
            "airtightness_test_duration": 120.0,
            "operator": "Test Operator",
        }
        api_client.post(
            "/api/v1/airtightness-test-lp-steps/",
            data=json.dumps(airtightness_payload),
            content_type="application/json",
        )

        gas_bp_payload = {
            "fsec_version_id": create_test_fsec,
            "leak_rate_dtri": "0.002",
            "gas_type": "Azote",
            "experiment_pressure": 2.0,
            "leak_test_duration": 60.0,
            "operator": "Test Operator BP",
            "gas_base": 1,
            "gas_container": 2,
        }
        api_client.post(
            "/api/v1/gas-filling-bp-steps/",
            data=json.dumps(gas_bp_payload),
            content_type="application/json",
        )

        # Récupérer tous les gas steps
        response = api_client.get(f"{self.base_url}{create_test_fsec}/")

        assert response.status_code == 200
        data = response.json()

        assert len(data["airtightnessTestLp"]) == 1
        assert len(data["gasFillingBp"]) == 1
        assert data["airtightnessTestLp"][0]["gas_type"] == "Helium"
        assert data["gasFillingBp"][0]["gas_type"] == "Azote"

    def test_get_all_gas_steps_returns_json(self, api_client, create_test_fsec):
        """Test que la réponse est en JSON."""
        response = api_client.get(f"{self.base_url}{create_test_fsec}/")

        assert response["Content-Type"] == "application/json"


# ============================================================================
# COMMON ERROR CASES
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestGasStepsErrorCases:
    """Tests des cas d'erreur communs aux gas steps."""

    @pytest.mark.parametrize(
        "endpoint",
        [
            "/api/v1/airtightness-test-lp-steps/",
            "/api/v1/gas-filling-bp-steps/",
            "/api/v1/gas-filling-hp-steps/",
            "/api/v1/permeation-steps/",
            "/api/v1/depressurization-steps/",
            "/api/v1/repressurization-steps/",
        ],
    )
    def test_retrieve_not_found(self, api_client, endpoint):
        """Test 404 pour tous les types de steps."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.get(f"{endpoint}{fake_uuid}/")

        assert response.status_code == 404

    @pytest.mark.parametrize(
        "endpoint",
        [
            "/api/v1/airtightness-test-lp-steps/",
            "/api/v1/gas-filling-bp-steps/",
            "/api/v1/gas-filling-hp-steps/",
            "/api/v1/permeation-steps/",
            "/api/v1/depressurization-steps/",
            "/api/v1/repressurization-steps/",
        ],
    )
    def test_delete_not_found(self, api_client, endpoint):
        """Test 404 pour suppression UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        response = api_client.delete(f"{endpoint}{fake_uuid}/")

        assert response.status_code == 404

    @pytest.mark.parametrize(
        "endpoint",
        [
            "/api/v1/airtightness-test-lp-steps/",
            "/api/v1/gas-filling-bp-steps/",
            "/api/v1/gas-filling-hp-steps/",
            "/api/v1/permeation-steps/",
            "/api/v1/depressurization-steps/",
            "/api/v1/repressurization-steps/",
        ],
    )
    def test_update_not_found(self, api_client, endpoint, create_test_fsec):
        """Test 404 pour mise à jour UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        payload = {
            "fsec_version_id": create_test_fsec,
        }

        response = api_client.put(
            f"{endpoint}{fake_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 404
