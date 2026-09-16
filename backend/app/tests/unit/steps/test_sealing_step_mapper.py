"""
Tests unitaires pour le mapper SealingStep.

Vérifie les conversions Entity ↔ Bean ↔ API, en particulier la vérification du
scellement (verification_status OK/NOK + verification_remark, null = non vérifié).
Les liens fichiers (metro_file_link, visrad_link) ont été déplacés vers la
métrologie (cf. test_metrology_step_mapper.py).
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.steps.models.sealing_step_bean import SealingStepBean
from app.mapper.steps.sealing_step_mapper import (
    sealing_step_mapper_api_to_bean,
    sealing_step_mapper_bean_to_api,
    sealing_step_mapper_bean_to_entity,
    sealing_step_mapper_entity_to_bean,
)

VERIFICATION_STATUS = "NOK"
VERIFICATION_REMARK = "Fuite détectée sur l'interface I0"


@pytest.fixture
def sample_sealing_bean():
    """Bean SealingStep de test avec vérification renseignée."""
    return SealingStepBean(
        uuid="sealing-uuid-1",
        metrology_step_id="metro-uuid-1",
        date=date(2025, 3, 1),
        metrologist_name="Dupont",
        interface_io="IO-001",
        comments="Scellement validé",
        verification_status=VERIFICATION_STATUS,
        verification_remark=VERIFICATION_REMARK,
    )


@pytest.fixture
def mock_sealing_entity():
    """Mock SealingStepEntity exposant la vérification."""
    mock = MagicMock()
    mock.uuid = "sealing-uuid-1"
    mock.metrology_step_id_id = "metro-uuid-1"
    mock.date = date(2025, 3, 1)
    mock.metrologist_name = "Dupont"
    mock.metrologist_user_id = None
    mock.rack_id_id = None
    mock.interface_io = "IO-001"
    mock.comments = "Scellement validé"
    mock.verification_status = VERIFICATION_STATUS
    mock.verification_remark = VERIFICATION_REMARK
    return mock


class TestSealingStepMapperEntityToBean:
    @pytest.mark.unit
    def test_entity_to_bean_reads_verification(self, mock_sealing_entity):
        result = sealing_step_mapper_entity_to_bean(mock_sealing_entity)

        assert isinstance(result, SealingStepBean)
        assert result.verification_status == VERIFICATION_STATUS
        assert result.verification_remark == VERIFICATION_REMARK
        assert result.interface_io == "IO-001"

    @pytest.mark.unit
    def test_entity_to_bean_verification_default_none(self):
        """null = non vérifié (aucune valeur par défaut implicite)."""
        mock = MagicMock()
        mock.uuid = "u"
        mock.metrology_step_id_id = "m"
        mock.date = None
        mock.metrologist_name = None
        mock.metrologist_user_id = None
        mock.rack_id_id = None
        mock.interface_io = None
        mock.comments = None
        mock.verification_status = None
        mock.verification_remark = None

        result = sealing_step_mapper_entity_to_bean(mock)

        assert result.verification_status is None
        assert result.verification_remark is None


class TestSealingStepMapperBeanToEntity:
    @pytest.mark.unit
    def test_bean_to_entity_writes_verification(self, sample_sealing_bean):
        result = sealing_step_mapper_bean_to_entity(sample_sealing_bean)

        assert result.verification_status == VERIFICATION_STATUS
        assert result.verification_remark == VERIFICATION_REMARK


class TestSealingStepMapperApiToBean:
    @pytest.mark.unit
    def test_api_to_bean_reads_verification(self):
        api_data = {
            "uuid": "u",
            "metrology_step_id": "m",
            "verification_status": VERIFICATION_STATUS,
            "verification_remark": VERIFICATION_REMARK,
        }

        result = sealing_step_mapper_api_to_bean(api_data)

        assert result.verification_status == VERIFICATION_STATUS
        assert result.verification_remark == VERIFICATION_REMARK

    @pytest.mark.unit
    def test_api_to_bean_missing_verification_default_none(self):
        result = sealing_step_mapper_api_to_bean({"metrology_step_id": "m"})

        assert result.verification_status is None
        assert result.verification_remark is None


class TestSealingStepMapperBeanToApi:
    @pytest.mark.unit
    def test_bean_to_api_exposes_verification(self, sample_sealing_bean):
        result = sealing_step_mapper_bean_to_api(sample_sealing_bean)

        assert result["verification_status"] == VERIFICATION_STATUS
        assert result["verification_remark"] == VERIFICATION_REMARK


class TestSealingStepMapperRoundtrip:
    @pytest.mark.unit
    def test_bean_to_api_to_bean_preserves_verification(self, sample_sealing_bean):
        api_data = sealing_step_mapper_bean_to_api(sample_sealing_bean)
        restored = sealing_step_mapper_api_to_bean(api_data)

        assert restored.verification_status == sample_sealing_bean.verification_status
        assert restored.verification_remark == sample_sealing_bean.verification_remark

    @pytest.mark.unit
    def test_roundtrip_preserves_unverified_state(self):
        """Un scellement non vérifié (None) le reste après aller-retour API."""
        bean = SealingStepBean(uuid="u", metrology_step_id="m")

        restored = sealing_step_mapper_api_to_bean(
            sealing_step_mapper_bean_to_api(bean)
        )

        assert restored.verification_status is None
        assert restored.verification_remark is None
