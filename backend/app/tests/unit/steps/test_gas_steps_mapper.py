"""
Tests unitaires pour les mappers des Gas Steps.

Couvre tous les 6 types de gas steps:
- AirtightnessTestLpStep
- GasFillingBpStep
- GasFillingHpStep
- PermeationStep
- DepressurizationStep
- RepressurizationStep
"""

from datetime import date, datetime
from unittest.mock import MagicMock

import pytest

from app.domain.steps.models.airtightness_test_lp_step_bean import (
    AirtightnessTestLpStepBean,
)
from app.domain.steps.models.depressurization_step_bean import DepressurizationStepBean
from app.domain.steps.models.gas_filling_bp_step_bean import GasFillingBpStepBean
from app.domain.steps.models.gas_filling_hp_step_bean import GasFillingHpStepBean
from app.domain.steps.models.permeation_step_bean import PermeationStepBean
from app.domain.steps.models.repressurization_step_bean import RepressurizationStepBean
from app.mapper.steps.airtightness_test_lp_step_mapper import (
    airtightness_test_lp_step_mapper_api_to_bean,
    airtightness_test_lp_step_mapper_bean_to_api,
    airtightness_test_lp_step_mapper_entity_to_bean,
)
from app.mapper.steps.depressurization_step_mapper import (
    depressurization_step_mapper_api_to_bean,
    depressurization_step_mapper_bean_to_api,
)
from app.mapper.steps.gas_filling_bp_step_mapper import (
    gas_filling_bp_step_mapper_api_to_bean,
    gas_filling_bp_step_mapper_bean_to_api,
)
from app.mapper.steps.gas_filling_hp_step_mapper import (
    gas_filling_hp_step_mapper_api_to_bean,
    gas_filling_hp_step_mapper_bean_to_api,
)
from app.mapper.steps.permeation_step_mapper import (
    permeation_step_mapper_api_to_bean,
    permeation_step_mapper_bean_to_api,
)
from app.mapper.steps.repressurization_step_mapper import (
    repressurization_step_mapper_api_to_bean,
    repressurization_step_mapper_bean_to_api,
)

# ============================================================================
# AIRTIGHTNESS TEST LP STEP TESTS
# ============================================================================


class TestAirtightnessTestLpStepMapper:
    """Tests pour AirtightnessTestLpStep mapper."""

    @pytest.fixture
    def sample_airtightness_bean(self):
        return AirtightnessTestLpStepBean(
            uuid="air-uuid-123",
            fsec_version_id="fsec-uuid",
            leak_rate_dtri="0.001",
            gas_type="Helium",
            experiment_pressure=1.5,
            airtightness_test_duration=120.0,
            operator="Jean Dupont",
            date_of_fulfilment=date(2025, 3, 5),
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour Airtightness."""
        api_data = {
            "uuid": "air-uuid",
            "fsec_version_id": "fsec-uuid",
            "leak_rate_dtri": "0.002",
            "gas_type": "Helium",
            "experiment_pressure": 2.0,
            "airtightness_test_duration": 180.0,
            "operator": "Operator Test",
            "date_of_fulfilment": "2025-04-01",
        }

        result = airtightness_test_lp_step_mapper_api_to_bean(api_data)

        assert isinstance(result, AirtightnessTestLpStepBean)
        assert result.leak_rate_dtri == "0.002"
        assert result.gas_type == "Helium"
        assert result.experiment_pressure == 2.0
        assert result.operator == "Operator Test"

    @pytest.mark.unit
    def test_bean_to_api(self, sample_airtightness_bean):
        """Test conversion Bean → API pour Airtightness."""
        result = airtightness_test_lp_step_mapper_bean_to_api(sample_airtightness_bean)

        assert isinstance(result, dict)
        assert result["uuid"] == "air-uuid-123"
        assert result["leak_rate_dtri"] == "0.001"
        assert result["gas_type"] == "Helium"
        assert result["experiment_pressure"] == 1.5
        assert result["operator"] == "Jean Dupont"

    @pytest.mark.unit
    def test_entity_to_bean(self):
        """Test conversion Entity → Bean pour Airtightness."""
        mock_entity = MagicMock()
        mock_entity.uuid = "entity-uuid"
        mock_entity.fsec_version_id_id = "fsec-uuid"
        mock_entity.leak_rate_dtri = "0.003"
        mock_entity.gas_type = "Azote"
        mock_entity.experiment_pressure = 3.0
        mock_entity.airtightness_test_duration = 90.0
        mock_entity.operator = "Entity Operator"
        mock_entity.date_of_fulfilment = date(2025, 5, 1)
        mock_entity.created_at = None
        mock_entity.last_updated = None

        result = airtightness_test_lp_step_mapper_entity_to_bean(mock_entity)

        assert result.leak_rate_dtri == "0.003"
        assert result.gas_type == "Azote"

    @pytest.mark.unit
    def test_roundtrip(self, sample_airtightness_bean):
        """Test aller-retour Bean → API → Bean."""
        api_data = airtightness_test_lp_step_mapper_bean_to_api(
            sample_airtightness_bean
        )
        restored = airtightness_test_lp_step_mapper_api_to_bean(api_data)

        assert restored.uuid == sample_airtightness_bean.uuid
        assert restored.leak_rate_dtri == sample_airtightness_bean.leak_rate_dtri
        assert restored.gas_type == sample_airtightness_bean.gas_type


# ============================================================================
# GAS FILLING BP STEP TESTS
# ============================================================================


class TestGasFillingBpStepMapper:
    """Tests pour GasFillingBpStep mapper."""

    @pytest.fixture
    def sample_gas_bp_bean(self):
        return GasFillingBpStepBean(
            uuid="bp-uuid-123",
            fsec_version_id="fsec-uuid",
            leak_rate_dtri="0.002",
            gas_type="Azote",
            experiment_pressure=2.0,
            leak_test_duration=60.0,
            operator="Operator BP",
            date_of_fulfilment=date(2025, 3, 10),
            gas_base=1,
            gas_container=2,
            observations="Test observations BP",
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour GasFillingBp."""
        api_data = {
            "uuid": "bp-uuid",
            "fsec_version_id": "fsec-uuid",
            "leak_rate_dtri": "0.003",
            "gas_type": "Argon",
            "experiment_pressure": 3.0,
            "leak_test_duration": 90.0,
            "operator": "Operator API",
            "gas_base": 2,
            "gas_container": 3,
            "observations": "API observations",
        }

        result = gas_filling_bp_step_mapper_api_to_bean(api_data)

        assert isinstance(result, GasFillingBpStepBean)
        assert result.gas_type == "Argon"
        assert result.gas_base == 2
        assert result.gas_container == 3

    @pytest.mark.unit
    def test_bean_to_api(self, sample_gas_bp_bean):
        """Test conversion Bean → API pour GasFillingBp."""
        result = gas_filling_bp_step_mapper_bean_to_api(sample_gas_bp_bean)

        assert result["uuid"] == "bp-uuid-123"
        assert result["gas_type"] == "Azote"
        assert result["gas_base"] == 1
        assert result["observations"] == "Test observations BP"

    @pytest.mark.unit
    def test_roundtrip(self, sample_gas_bp_bean):
        """Test aller-retour Bean → API → Bean."""
        api_data = gas_filling_bp_step_mapper_bean_to_api(sample_gas_bp_bean)
        restored = gas_filling_bp_step_mapper_api_to_bean(api_data)

        assert restored.gas_type == sample_gas_bp_bean.gas_type
        assert restored.gas_base == sample_gas_bp_bean.gas_base


# ============================================================================
# GAS FILLING HP STEP TESTS
# ============================================================================


class TestGasFillingHpStepMapper:
    """Tests pour GasFillingHpStep mapper."""

    @pytest.fixture
    def sample_gas_hp_bean(self):
        return GasFillingHpStepBean(
            uuid="hp-uuid-123",
            fsec_version_id="fsec-uuid",
            leak_rate_dtri="0.003",
            gas_type="Helium",
            experiment_pressure=10.0,
            operator="Operator HP",
            date_of_fulfilment=date(2025, 3, 15),
            gas_base=1,
            gas_container=3,
            observations="Test HP observations",
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour GasFillingHp."""
        api_data = {
            "uuid": "hp-uuid",
            "fsec_version_id": "fsec-uuid",
            "leak_rate_dtri": "0.004",
            "gas_type": "Helium",
            "experiment_pressure": 15.0,
            "operator": "HP Operator",
            "gas_base": 3,
            "gas_container": 5,
        }

        result = gas_filling_hp_step_mapper_api_to_bean(api_data)

        assert isinstance(result, GasFillingHpStepBean)
        assert result.experiment_pressure == 15.0

    @pytest.mark.unit
    def test_bean_to_api(self, sample_gas_hp_bean):
        """Test conversion Bean → API pour GasFillingHp."""
        result = gas_filling_hp_step_mapper_bean_to_api(sample_gas_hp_bean)

        assert result["experiment_pressure"] == 10.0
        assert result["gas_container"] == 3


# ============================================================================
# PERMEATION STEP TESTS
# ============================================================================


class TestPermeationStepMapper:
    """Tests pour PermeationStep mapper."""

    @pytest.fixture
    def sample_permeation_bean(self):
        return PermeationStepBean(
            uuid="perm-uuid-123",
            fsec_version_id="fsec-uuid",
            gas_type="Helium",
            target_pressure=5.0,
            operator="Permeation Operator",
            start_date=datetime(2025, 3, 20, 10, 0),
            estimated_end_date=datetime(2025, 3, 25, 10, 0),
            sensor_pressure=4.8,
            computed_shot_pressure=4.5,
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour Permeation."""
        api_data = {
            "uuid": "perm-uuid",
            "fsec_version_id": "fsec-uuid",
            "gas_type": "Helium",
            "target_pressure": 8.0,
            "operator": "API Operator",
            "sensor_pressure": 7.5,
        }

        result = permeation_step_mapper_api_to_bean(api_data)

        assert isinstance(result, PermeationStepBean)
        assert result.target_pressure == 8.0

    @pytest.mark.unit
    def test_bean_to_api(self, sample_permeation_bean):
        """Test conversion Bean → API pour Permeation."""
        result = permeation_step_mapper_bean_to_api(sample_permeation_bean)

        assert result["target_pressure"] == 5.0


# ============================================================================
# DEPRESSURIZATION STEP TESTS
# ============================================================================


class TestDepressurizationStepMapper:
    """Tests pour DepressurizationStep mapper."""

    @pytest.fixture
    def sample_depressurization_bean(self):
        return DepressurizationStepBean(
            uuid="depress-uuid-123",
            fsec_version_id="fsec-uuid",
            operator="Depress Operator",
            date_of_fulfilment=date(2025, 3, 25),
            pressure_gauge=10.0,
            enclosure_pressure_measured=1.0,
            depressurization_time_before_firing=30.0,
            observations="Depressurization complete",
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour Depressurization."""
        api_data = {
            "uuid": "depress-uuid",
            "fsec_version_id": "fsec-uuid",
            "operator": "API Operator",
            "pressure_gauge": 15.0,
            "enclosure_pressure_measured": 0.5,
            "depressurization_time_before_firing": 45.0,
            "observations": "API observations",
        }

        result = depressurization_step_mapper_api_to_bean(api_data)

        assert isinstance(result, DepressurizationStepBean)
        assert result.pressure_gauge == 15.0
        assert result.enclosure_pressure_measured == 0.5

    @pytest.mark.unit
    def test_bean_to_api(self, sample_depressurization_bean):
        """Test conversion Bean → API pour Depressurization."""
        result = depressurization_step_mapper_bean_to_api(sample_depressurization_bean)

        assert result["pressure_gauge"] == 10.0
        assert result["enclosure_pressure_measured"] == 1.0
        assert result["depressurization_time_before_firing"] == 30.0


# ============================================================================
# REPRESSURIZATION STEP TESTS
# ============================================================================


class TestRepressurizationStepMapper:
    """Tests pour RepressurizationStep mapper."""

    @pytest.fixture
    def sample_repressurization_bean(self):
        return RepressurizationStepBean(
            uuid="repress-uuid-123",
            fsec_version_id="fsec-uuid",
            operator="Repress Operator",
            gas_type="Helium",
            start_date=datetime(2025, 3, 30, 10, 0),
            estimated_end_date=datetime(2025, 4, 5, 10, 0),
            sensor_pressure=1.0,
            computed_pressure=10.0,
        )

    @pytest.mark.unit
    def test_api_to_bean(self):
        """Test conversion API → Bean pour Repressurization."""
        api_data = {
            "uuid": "repress-uuid",
            "fsec_version_id": "fsec-uuid",
            "operator": "API Operator",
            "gas_type": "Azote",
            "sensor_pressure": 0.5,
            "computed_pressure": 12.0,
        }

        result = repressurization_step_mapper_api_to_bean(api_data)

        assert isinstance(result, RepressurizationStepBean)
        assert result.sensor_pressure == 0.5
        assert result.computed_pressure == 12.0

    @pytest.mark.unit
    def test_bean_to_api(self, sample_repressurization_bean):
        """Test conversion Bean → API pour Repressurization."""
        result = repressurization_step_mapper_bean_to_api(sample_repressurization_bean)

        assert result["sensor_pressure"] == 1.0
        assert result["computed_pressure"] == 10.0

    @pytest.mark.unit
    def test_roundtrip(self, sample_repressurization_bean):
        """Test aller-retour Bean → API → Bean."""
        api_data = repressurization_step_mapper_bean_to_api(
            sample_repressurization_bean
        )
        restored = repressurization_step_mapper_api_to_bean(api_data)

        assert restored.sensor_pressure == sample_repressurization_bean.sensor_pressure
        assert (
            restored.computed_pressure == sample_repressurization_bean.computed_pressure
        )
