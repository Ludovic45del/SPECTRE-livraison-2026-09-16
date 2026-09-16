"""
Tests d'intégration API pour les Gas Steps Controllers.

Ces tests vérifient que les endpoints REST fonctionnent correctement
avec les mappers et le service layer (repository mocké).
"""

import json
import uuid
from datetime import date
from unittest.mock import patch

import pytest
from django.test import RequestFactory

from app.api.steps.gas_steps_controller import (
    AirtightnessTestLpStepController,
    DepressurizationStepController,
    GasFillingBpStepController,
    GasFillingHpStepController,
    PermeationStepController,
    RepressurizationStepController,
)

SAMPLE_FSEC_VERSION_UUID = "981b3cfb-2fba-4b30-ad2d-cbdd73f3334a"
SAMPLE_AIRTIGHTNESS_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SAMPLE_GAS_FILLING_BP_UUID = "b2c3d4e5-f607-8901-bcde-f12345678901"
SAMPLE_GAS_FILLING_HP_UUID = "c3d4e5f6-0708-9012-cdef-123456789012"
SAMPLE_PERMEATION_UUID = "d4e5f607-0809-0123-defa-234567890123"
SAMPLE_DEPRESSURIZATION_UUID = "e5f60708-0900-1234-efab-345678901234"
SAMPLE_REPRESSURIZATION_UUID = "f6070809-0a01-2345-fabc-456789012345"

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def request_factory():
    """Django RequestFactory for creating test requests."""
    return RequestFactory()


@pytest.fixture
def sample_fsec_version_id() -> str:
    """UUID version FSEC fixe pour tests."""
    return SAMPLE_FSEC_VERSION_UUID


@pytest.fixture
def sample_airtightness_uuid() -> str:
    return SAMPLE_AIRTIGHTNESS_UUID


@pytest.fixture
def sample_gas_filling_bp_uuid() -> str:
    return SAMPLE_GAS_FILLING_BP_UUID


@pytest.fixture
def sample_gas_filling_hp_uuid() -> str:
    return SAMPLE_GAS_FILLING_HP_UUID


@pytest.fixture
def sample_permeation_uuid() -> str:
    return SAMPLE_PERMEATION_UUID


@pytest.fixture
def sample_depressurization_uuid() -> str:
    return SAMPLE_DEPRESSURIZATION_UUID


@pytest.fixture
def sample_repressurization_uuid() -> str:
    return SAMPLE_REPRESSURIZATION_UUID


def _make_post(factory, url, data):
    """Create POST request with .data attribute for DRF compatibility."""
    request = factory.post(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


def _make_put(factory, url, data):
    """Create PUT request with .data attribute for DRF compatibility."""
    request = factory.put(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


# ============================================================================
# AIRTIGHTNESS TEST LP STEP CONTROLLER TESTS
# ============================================================================


class TestAirtightnessTestLpStepControllerAPI:
    """Tests d'intégration pour AirtightnessTestLpStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_airtightness_uuid,
    ):
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )

        mock_bean = AirtightnessTestLpStepBean(
            uuid=sample_airtightness_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.001",
            gas_type="Helium",
            experiment_pressure=1.5,
            airtightness_test_duration=120.0,
            operator="Jean Dupont",
            date_of_fulfilment=date(2025, 3, 5),
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(
            f"/api/airtightness-test-lp/fsec/{sample_fsec_version_id}"
        )
        controller = AirtightnessTestLpStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["uuid"] == sample_airtightness_uuid
        assert data[0]["gas_type"] == "Helium"

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_step_by_uuid")
    def test_retrieve_returns_single_step(
        self,
        mock_get_step,
        request_factory,
        sample_fsec_version_id,
        sample_airtightness_uuid,
    ):
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )

        mock_bean = AirtightnessTestLpStepBean(
            uuid=sample_airtightness_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.002",
            gas_type="Nitrogen",
            experiment_pressure=2.0,
            airtightness_test_duration=90.0,
            operator="Marie Martin",
            date_of_fulfilment=date(2025, 4, 10),
        )
        mock_get_step.return_value = mock_bean

        request = request_factory.get(
            f"/api/airtightness-test-lp/{sample_airtightness_uuid}"
        )
        controller = AirtightnessTestLpStepController()
        response = controller.retrieve(request, uuid=sample_airtightness_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["uuid"] == sample_airtightness_uuid
        assert data["gas_type"] == "Nitrogen"
        assert data["experiment_pressure"] == 2.0

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_step_by_uuid")
    def test_retrieve_not_found_raises_exception(self, mock_get_step, request_factory):
        from app.domain.exceptions import NotFoundException

        mock_get_step.side_effect = NotFoundException(
            "AirtightnessTestLpStep", "fake-uuid"
        )

        request = request_factory.get("/api/airtightness-test-lp/fake-uuid")
        controller = AirtightnessTestLpStepController()

        with pytest.raises(NotFoundException):
            controller.retrieve(request, uuid="fake-uuid")

    @pytest.mark.integration
    @patch(
        "app.api.steps.gas_steps_controller.BaseGasStepController._validate_fsec_exists"
    )
    @patch("app.api.steps.gas_steps_controller.create_step")
    def test_create_returns_201(
        self,
        mock_create_step,
        mock_validate_fsec,
        request_factory,
        sample_fsec_version_id,
        sample_airtightness_uuid,
    ):
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )

        mock_validate_fsec.return_value = None
        mock_bean = AirtightnessTestLpStepBean(
            uuid=sample_airtightness_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.003",
            gas_type="Argon",
            experiment_pressure=3.0,
            airtightness_test_duration=150.0,
            operator="Pierre Duval",
            date_of_fulfilment=date(2025, 5, 20),
        )
        mock_create_step.return_value = mock_bean

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "leak_rate_dtri": "0.003",
            "gas_type": "Argon",
            "experiment_pressure": 3.0,
            "airtightness_test_duration": 150.0,
            "operator": "Pierre Duval",
            "date_of_fulfilment": "2025-05-20",
        }
        request = _make_post(
            request_factory, "/api/airtightness-test-lp/", request_data
        )

        controller = AirtightnessTestLpStepController()
        response = controller.create(request)

        assert response.status_code == 201
        data = json.loads(response.content)
        assert data["gas_type"] == "Argon"
        mock_create_step.assert_called_once()

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.update_step")
    def test_update_returns_200(
        self,
        mock_update_step,
        request_factory,
        sample_fsec_version_id,
        sample_airtightness_uuid,
    ):
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )

        mock_bean = AirtightnessTestLpStepBean(
            uuid=sample_airtightness_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.001",
            gas_type="Helium-Modified",
            experiment_pressure=1.8,
            airtightness_test_duration=130.0,
            operator="Jean Dupont (modifié)",
            date_of_fulfilment=date(2025, 3, 10),
        )
        mock_update_step.return_value = mock_bean

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "leak_rate_dtri": "0.001",
            "gas_type": "Helium-Modified",
            "experiment_pressure": 1.8,
            "airtightness_test_duration": 130.0,
            "operator": "Jean Dupont (modifié)",
            "date_of_fulfilment": "2025-03-10",
        }
        request = _make_put(
            request_factory,
            f"/api/airtightness-test-lp/{sample_airtightness_uuid}",
            request_data,
        )

        controller = AirtightnessTestLpStepController()
        response = controller.update(request, uuid=sample_airtightness_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["gas_type"] == "Helium-Modified"
        mock_update_step.assert_called_once()

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.delete_step")
    def test_destroy_returns_204(
        self, mock_delete_step, request_factory, sample_airtightness_uuid
    ):
        mock_delete_step.return_value = True

        request = request_factory.delete(
            f"/api/airtightness-test-lp/{sample_airtightness_uuid}"
        )
        controller = AirtightnessTestLpStepController()
        response = controller.destroy(request, uuid=sample_airtightness_uuid)

        assert response.status_code == 204
        mock_delete_step.assert_called_once()


# ============================================================================
# GAS FILLING BP STEP CONTROLLER TESTS
# ============================================================================


class TestGasFillingBpStepControllerAPI:
    """Tests d'intégration pour GasFillingBpStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_gas_filling_bp_uuid,
    ):
        from app.domain.steps.models.gas_filling_bp_step_bean import (
            GasFillingBpStepBean,
        )

        mock_bean = GasFillingBpStepBean(
            uuid=sample_gas_filling_bp_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.0005",
            gas_type="Nitrogen",
            experiment_pressure=2.0,
            leak_test_duration=60.0,
            operator="Marie Martin",
            date_of_fulfilment=date(2025, 3, 15),
            gas_base=1,
            gas_container=2,
            observations="Remplissage nominal",
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(
            f"/api/gas-filling-bp/fsec/{sample_fsec_version_id}"
        )
        controller = GasFillingBpStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["uuid"] == sample_gas_filling_bp_uuid

    @pytest.mark.integration
    @patch(
        "app.api.steps.gas_steps_controller.BaseGasStepController._validate_fsec_exists"
    )
    @patch("app.api.steps.gas_steps_controller.create_step")
    def test_create_gas_filling_bp_returns_201(
        self,
        mock_create_step,
        mock_validate_fsec,
        request_factory,
        sample_fsec_version_id,
        sample_gas_filling_bp_uuid,
    ):
        from app.domain.steps.models.gas_filling_bp_step_bean import (
            GasFillingBpStepBean,
        )

        mock_bean = GasFillingBpStepBean(
            uuid=sample_gas_filling_bp_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.0008",
            gas_type="Argon",
            experiment_pressure=2.5,
            leak_test_duration=75.0,
            operator="Pierre Test",
            date_of_fulfilment=date(2025, 4, 1),
            gas_base=2,
            gas_container=3,
            observations="Test OK",
        )
        mock_validate_fsec.return_value = None
        mock_create_step.return_value = mock_bean

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "leak_rate_dtri": "0.0008",
            "gas_type": "Argon",
            "experiment_pressure": 2.5,
            "leak_test_duration": 75.0,
            "operator": "Pierre Test",
            "date_of_fulfilment": "2025-04-01",
            "gas_base": 2,
            "gas_container": 3,
            "observations": "Test OK",
        }
        request = _make_post(request_factory, "/api/gas-filling-bp/", request_data)

        controller = GasFillingBpStepController()
        response = controller.create(request)

        assert response.status_code == 201


# ============================================================================
# GAS FILLING HP STEP CONTROLLER TESTS
# ============================================================================


class TestGasFillingHpStepControllerAPI:
    """Tests d'intégration pour GasFillingHpStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_gas_filling_hp_uuid,
    ):
        from app.domain.steps.models.gas_filling_hp_step_bean import (
            GasFillingHpStepBean,
        )

        mock_bean = GasFillingHpStepBean(
            uuid=sample_gas_filling_hp_uuid,
            fsec_version_id=sample_fsec_version_id,
            leak_rate_dtri="0.0003",
            gas_type="Helium HP",
            experiment_pressure=10.0,
            operator="HP Operator",
            date_of_fulfilment=date(2025, 5, 1),
            gas_base=3,
            gas_container=5,
            observations="HP Filling OK",
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(
            f"/api/gas-filling-hp/fsec/{sample_fsec_version_id}"
        )
        controller = GasFillingHpStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)


# ============================================================================
# PERMEATION STEP CONTROLLER TESTS
# ============================================================================


class TestPermeationStepControllerAPI:
    """Tests d'intégration pour PermeationStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_permeation_uuid,
    ):
        from app.domain.steps.models.permeation_step_bean import PermeationStepBean

        mock_bean = PermeationStepBean(
            uuid=sample_permeation_uuid,
            fsec_version_id=sample_fsec_version_id,
            gas_type="Helium",
            target_pressure=5.0,
            operator="Permeation Op",
            sensor_pressure=4.8,
            computed_shot_pressure=4.5,
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(f"/api/permeation/fsec/{sample_fsec_version_id}")
        controller = PermeationStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)


# ============================================================================
# DEPRESSURIZATION STEP CONTROLLER TESTS
# ============================================================================


class TestDepressurizationStepControllerAPI:
    """Tests d'intégration pour DepressurizationStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_depressurization_uuid,
    ):
        from app.domain.steps.models.depressurization_step_bean import (
            DepressurizationStepBean,
        )

        mock_bean = DepressurizationStepBean(
            uuid=sample_depressurization_uuid,
            fsec_version_id=sample_fsec_version_id,
            operator="Depressurization Op",
            date_of_fulfilment=date(2025, 7, 1),
            pressure_gauge=5.0,
            enclosure_pressure_measured=4.5,
            observations="Depressurization OK",
            depressurization_time_before_firing=30.0,
            computed_pressure_before_firing=4.2,
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(
            f"/api/depressurization/fsec/{sample_fsec_version_id}"
        )
        controller = DepressurizationStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.delete_step")
    def test_delete_not_found_raises_exception(self, mock_delete_step, request_factory):
        from app.domain.exceptions import NotFoundException

        mock_delete_step.side_effect = NotFoundException(
            "DepressurizationStep", "fake-uuid"
        )

        request = request_factory.delete("/api/depressurization/fake-uuid")
        controller = DepressurizationStepController()

        with pytest.raises(NotFoundException):
            controller.destroy(request, uuid="fake-uuid")


# ============================================================================
# REPRESSURIZATION STEP CONTROLLER TESTS
# ============================================================================


class TestRepressurizationStepControllerAPI:
    """Tests d'intégration pour RepressurizationStepController."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_returns_list(
        self,
        mock_get_steps,
        request_factory,
        sample_fsec_version_id,
        sample_repressurization_uuid,
    ):
        from app.domain.steps.models.repressurization_step_bean import (
            RepressurizationStepBean,
        )

        mock_bean = RepressurizationStepBean(
            uuid=sample_repressurization_uuid,
            fsec_version_id=sample_fsec_version_id,
            operator="Repressurization Op",
            gas_type="Helium",
            sensor_pressure=6.0,
            computed_pressure=5.8,
        )
        mock_get_steps.return_value = [mock_bean]

        request = request_factory.get(
            f"/api/repressurization/fsec/{sample_fsec_version_id}"
        )
        controller = RepressurizationStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)

    @pytest.mark.integration
    @patch(
        "app.api.steps.gas_steps_controller.BaseGasStepController._validate_fsec_exists"
    )
    @patch("app.api.steps.gas_steps_controller.create_step")
    def test_create_repressurization_returns_201(
        self,
        mock_create_step,
        mock_validate_fsec,
        request_factory,
        sample_fsec_version_id,
        sample_repressurization_uuid,
    ):
        from app.domain.steps.models.repressurization_step_bean import (
            RepressurizationStepBean,
        )

        mock_bean = RepressurizationStepBean(
            uuid=sample_repressurization_uuid,
            fsec_version_id=sample_fsec_version_id,
            operator="New Operator",
            gas_type="Nitrogen",
            sensor_pressure=7.0,
            computed_pressure=6.5,
        )
        mock_validate_fsec.return_value = None
        mock_create_step.return_value = mock_bean

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "operator": "New Operator",
            "gas_type": "Nitrogen",
            "sensor_pressure": 7.0,
            "computed_pressure": 6.5,
        }
        request = _make_post(request_factory, "/api/repressurization/", request_data)

        controller = RepressurizationStepController()
        response = controller.create(request)

        assert response.status_code == 201


# ============================================================================
# EDGE CASES & ERROR HANDLING TESTS
# ============================================================================


class TestGasStepsAPIEdgeCases:
    """Tests des cas limites et gestion d'erreurs."""

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_empty_list(
        self, mock_get_steps, request_factory, sample_fsec_version_id
    ):
        mock_get_steps.return_value = []

        request = request_factory.get(
            f"/api/airtightness-test-lp/fsec/{sample_fsec_version_id}"
        )
        controller = AirtightnessTestLpStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data == []

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.update_step")
    def test_update_not_found_raises_exception(
        self, mock_update_step, request_factory, sample_fsec_version_id
    ):
        from app.domain.exceptions import NotFoundException

        SAMPLE_NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000001"
        fake_uuid = SAMPLE_NONEXISTENT_UUID
        mock_update_step.side_effect = NotFoundException(
            "AirtightnessTestLpStep", fake_uuid
        )

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "gas_type": "Modified",
        }
        request = _make_put(
            request_factory, f"/api/airtightness-test-lp/{fake_uuid}", request_data
        )

        controller = AirtightnessTestLpStepController()

        with pytest.raises(NotFoundException):
            controller.update(request, uuid=fake_uuid)

    @pytest.mark.integration
    @patch("app.api.steps.gas_steps_controller.get_steps_by_fsec_version_id")
    def test_get_by_fsec_multiple_steps(
        self, mock_get_steps, request_factory, sample_fsec_version_id
    ):
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )

        beans = [
            AirtightnessTestLpStepBean(
                uuid=str(uuid.uuid4()),
                fsec_version_id=sample_fsec_version_id,
                leak_rate_dtri=f"0.00{i}",
                gas_type=f"Gas_{i}",
                experiment_pressure=float(i),
                airtightness_test_duration=float(i * 30),
                operator=f"Operator_{i}",
                date_of_fulfilment=date(2025, 3, i + 1),
            )
            for i in range(1, 4)
        ]
        mock_get_steps.return_value = beans

        request = request_factory.get(
            f"/api/airtightness-test-lp/fsec/{sample_fsec_version_id}"
        )
        controller = AirtightnessTestLpStepController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data) == 3
        assert data[0]["gas_type"] == "Gas_1"
        assert data[1]["gas_type"] == "Gas_2"
        assert data[2]["gas_type"] == "Gas_3"
