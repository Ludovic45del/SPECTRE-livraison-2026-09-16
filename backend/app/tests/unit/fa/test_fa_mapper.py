"""
Tests unitaires pour les mappers FA.

Ces tests vérifient les conversions :
- Entity → Bean
- Bean → Entity
- API → Bean
- Bean → API
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.fa.models.fa_bean import FaBean
from app.mapper.fa.fa_mapper import (
    fa_mapper_api_to_bean,
    fa_mapper_bean_to_api,
    fa_mapper_bean_to_entity,
    fa_mapper_beans_to_api,
    fa_mapper_entity_to_bean,
)


@pytest.fixture
def sample_fa_bean():
    """Bean FA de test complet."""
    return FaBean(
        uuid="fa-uuid-12345",
        fsec_version_id="fsec-version-uuid-12345",
        status_id=0,
        type_id=1,
        criticality_id=2,
        identifier="FA_2025_CampagneTest_FSEC01",
        # Phase Ouvert
        fsec_step_id=3,
        fsec_step_other=None,
        discoverer="Jean Dupont",
        event_date=date(2025, 3, 15),
        observation="Constat test",
        location_equipment="Banc A",
        quick_analysis="Analyse rapide test",
        immediate_measures="Mesures immédiates test",
        iec_validation_open=True,
        iec_validation_open_date=date(2025, 3, 16),
        iec_validation_open_name="Valideur IEC",
        # Phase En cours
        cause="Cause identifiée test",
        experience_impact="Impact test",
        iec_validation_progress=False,
        iec_validation_progress_name=None,
        # Phase Clos
        closure_validation=None,
        closure_date=None,
        closure_validator_name=None,
    )


@pytest.fixture
def sample_fa_api_data():
    """Données API FA de test."""
    return {
        "uuid": "fa-uuid-api-12345",
        "fsec_version_id": "fsec-version-uuid-api",
        "status_id": 1,
        "type_id": 2,
        "criticality_id": 1,
        "identifier": "FA_2025_API_Test",
        # Phase Ouvert
        "fsec_step_id": 5,
        "fsec_step_other": None,
        "discoverer": "Marie Martin",
        "event_date": "2025-04-10",
        "observation": "Constat API",
        "location_equipment": "Banc B",
        "quick_analysis": "Analyse API",
        "immediate_measures": "Mesures API",
        "iec_validation_open": True,
        "iec_validation_open_date": "2025-04-11",
        "iec_validation_open_name": "Valideur API",
        # Phase En cours
        "cause": "Cause API",
        "experience_impact": "Impact API",
        "iec_validation_progress": True,
        "iec_validation_progress_name": "Valideur Progress",
        # Phase Clos
        "closure_validation": "Clôture validée",
        "closure_date": "2025-04-15",
        "closure_validator_name": "Valideur Clôture",
    }


class TestFaMapperEntityToBean:
    """Tests conversion Entity → Bean."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self):
        """Test conversion complète Entity → Bean."""
        mock_entity = MagicMock()
        mock_entity.uuid = "entity-uuid-12345"
        mock_entity.fsec_version_id_id = "fsec-version-uuid"
        mock_entity.fsec_version_id.name = "FSEC Mapper"
        mock_entity.fsec_version_id.campaign_id = None
        mock_entity.status_id_id = 0
        mock_entity.type_id_id = 1
        mock_entity.criticality_id_id = 2
        mock_entity.identifier = "FA_2025_Test"
        # Phase Ouvert
        mock_entity.fsec_step_id = 3
        mock_entity.fsec_step_other = None
        mock_entity.discoverer = "Test User"
        mock_entity.event_date = date(2025, 1, 15)
        mock_entity.observation = "Observation test"
        mock_entity.location_equipment = "Banc C"
        mock_entity.quick_analysis = "Analyse test"
        mock_entity.immediate_measures = "Mesures test"
        mock_entity.iec_validation_open = True
        mock_entity.iec_validation_open_date = date(2025, 1, 16)
        mock_entity.iec_validation_open_name = "IEC User"
        # Phase En cours
        mock_entity.cause = "Cause test"
        mock_entity.experience_impact = "Impact test"
        mock_entity.iec_validation_progress = False
        mock_entity.iec_validation_progress_name = None
        # Phase Clos
        mock_entity.closure_validation = None
        mock_entity.closure_date = None
        mock_entity.closure_validator_name = None
        # Metadata
        mock_entity.created_at = date(2025, 1, 10)
        mock_entity.last_updated = date(2025, 1, 17)

        result = fa_mapper_entity_to_bean(mock_entity)

        assert isinstance(result, FaBean)
        assert result.uuid == "entity-uuid-12345"
        assert result.fsec_version_id == "fsec-version-uuid"
        assert result.status_id == 0
        assert result.type_id == 1
        assert result.criticality_id == 2
        assert result.identifier == "FA_2025_Test"
        assert result.discoverer == "Test User"
        assert result.event_date == date(2025, 1, 15)
        assert result.iec_validation_open is True

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        """Test conversion avec champs nullables."""
        mock_entity = MagicMock()
        mock_entity.uuid = "entity-uuid-null"
        mock_entity.fsec_version_id_id = "fsec-uuid"
        mock_entity.fsec_version_id.name = "FSEC Mapper"
        mock_entity.fsec_version_id.campaign_id = None
        mock_entity.status_id_id = None
        mock_entity.type_id_id = None
        mock_entity.criticality_id_id = None
        mock_entity.identifier = "FA_Minimal"
        mock_entity.fsec_step_id = None
        mock_entity.fsec_step_other = None
        mock_entity.discoverer = None
        mock_entity.event_date = None
        mock_entity.observation = None
        mock_entity.location_equipment = None
        mock_entity.quick_analysis = None
        mock_entity.immediate_measures = None
        mock_entity.iec_validation_open = False
        mock_entity.iec_validation_open_date = None
        mock_entity.iec_validation_open_name = None
        mock_entity.cause = None
        mock_entity.experience_impact = None
        mock_entity.iec_validation_progress = False
        mock_entity.iec_validation_progress_name = None
        mock_entity.closure_validation = None
        mock_entity.closure_date = None
        mock_entity.closure_validator_name = None
        mock_entity.created_at = None
        mock_entity.last_updated = None

        result = fa_mapper_entity_to_bean(mock_entity)

        assert result.status_id is None
        assert result.type_id is None
        assert result.criticality_id is None
        assert result.event_date is None
        assert result.cause is None

    @pytest.mark.unit
    def test_entity_to_bean_with_fsec_step_other(self):
        """Test conversion avec fsec_step_other (Autre)."""
        mock_entity = MagicMock()
        mock_entity.uuid = "entity-uuid-other"
        mock_entity.fsec_version_id_id = "fsec-uuid"
        mock_entity.fsec_version_id.name = "FSEC Mapper"
        mock_entity.fsec_version_id.campaign_id = None
        mock_entity.status_id_id = 0
        mock_entity.type_id_id = None
        mock_entity.criticality_id_id = None
        mock_entity.identifier = "FA_Other"
        mock_entity.fsec_step_id = 7  # 7 = Autre
        mock_entity.fsec_step_other = "Étape personnalisée"
        mock_entity.discoverer = "User"
        mock_entity.event_date = date(2025, 5, 1)
        mock_entity.observation = "Obs"
        mock_entity.location_equipment = None
        mock_entity.quick_analysis = "Analyse"
        mock_entity.immediate_measures = None
        mock_entity.iec_validation_open = False
        mock_entity.iec_validation_open_date = None
        mock_entity.iec_validation_open_name = None
        mock_entity.cause = None
        mock_entity.experience_impact = None
        mock_entity.iec_validation_progress = False
        mock_entity.iec_validation_progress_name = None
        mock_entity.closure_validation = None
        mock_entity.closure_date = None
        mock_entity.closure_validator_name = None
        mock_entity.created_at = None
        mock_entity.last_updated = None

        result = fa_mapper_entity_to_bean(mock_entity)

        assert result.fsec_step_id == 7
        assert result.fsec_step_other == "Étape personnalisée"


class TestFaMapperBeanToApi:
    """Tests conversion Bean → API."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self, sample_fa_bean):
        """Test conversion complète Bean → API dict."""
        result = fa_mapper_bean_to_api(sample_fa_bean)

        assert isinstance(result, dict)
        assert result["uuid"] == sample_fa_bean.uuid
        assert result["fsec_version_id"] == sample_fa_bean.fsec_version_id
        assert result["status_id"] == sample_fa_bean.status_id
        assert result["type_id"] == sample_fa_bean.type_id
        assert result["criticality_id"] == sample_fa_bean.criticality_id
        assert result["identifier"] == sample_fa_bean.identifier
        assert result["discoverer"] == sample_fa_bean.discoverer
        assert result["observation"] == sample_fa_bean.observation
        assert result["iec_validation_open"] == sample_fa_bean.iec_validation_open

    @pytest.mark.unit
    def test_bean_to_api_date_format(self, sample_fa_bean):
        """Test que les dates sont formatées en ISO."""
        result = fa_mapper_bean_to_api(sample_fa_bean)

        # event_date doit être en format ISO
        assert result["event_date"] == sample_fa_bean.event_date.isoformat()
        assert (
            result["iec_validation_open_date"]
            == sample_fa_bean.iec_validation_open_date.isoformat()
        )

    @pytest.mark.unit
    def test_bean_to_api_null_dates(self):
        """Test conversion avec dates nulles."""
        bean = FaBean(
            uuid="test-uuid",
            fsec_version_id="fsec-uuid",
            status_id=0,
            identifier="FA_Test",
            event_date=None,
            iec_validation_open_date=None,
            closure_date=None,
        )

        result = fa_mapper_bean_to_api(bean)

        assert result["event_date"] is None
        assert result["iec_validation_open_date"] is None
        assert result["closure_date"] is None

    @pytest.mark.unit
    def test_beans_to_api_list(self, sample_fa_bean):
        """Test conversion d'une liste de beans."""
        beans = [sample_fa_bean, sample_fa_bean]

        result = fa_mapper_beans_to_api(beans)

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(item, dict) for item in result)


class TestFaMapperApiToBean:
    """Tests conversion API → Bean."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self, sample_fa_api_data):
        """Test conversion complète API dict → Bean."""
        result = fa_mapper_api_to_bean(sample_fa_api_data)

        assert isinstance(result, FaBean)
        assert result.uuid == sample_fa_api_data["uuid"]
        assert result.fsec_version_id == sample_fa_api_data["fsec_version_id"]
        assert result.status_id == sample_fa_api_data["status_id"]
        assert result.type_id == sample_fa_api_data["type_id"]
        assert result.criticality_id == sample_fa_api_data["criticality_id"]
        assert result.identifier == sample_fa_api_data["identifier"]
        assert result.discoverer == sample_fa_api_data["discoverer"]
        assert result.cause == sample_fa_api_data["cause"]
        assert result.closure_validation == sample_fa_api_data["closure_validation"]

    @pytest.mark.unit
    def test_api_to_bean_date_parsing(self, sample_fa_api_data):
        """Test que les dates string sont parsées en objets date."""
        result = fa_mapper_api_to_bean(sample_fa_api_data)

        assert isinstance(result.event_date, date)
        assert result.event_date == date(2025, 4, 10)
        assert isinstance(result.iec_validation_open_date, date)
        assert result.iec_validation_open_date == date(2025, 4, 11)
        assert isinstance(result.closure_date, date)
        assert result.closure_date == date(2025, 4, 15)

    @pytest.mark.unit
    def test_api_to_bean_missing_optional_fields(self):
        """Test conversion avec champs optionnels manquants."""
        minimal_data = {
            "fsec_version_id": "fsec-uuid-minimal",
        }

        result = fa_mapper_api_to_bean(minimal_data)

        assert result.uuid == ""
        assert result.fsec_version_id == "fsec-uuid-minimal"
        assert result.status_id is None
        assert result.type_id is None
        assert result.event_date is None
        assert result.iec_validation_open is False
        assert result.iec_validation_progress is False

    @pytest.mark.unit
    def test_api_to_bean_with_none_values(self):
        """Test conversion avec valeurs explicitement None."""
        data = {
            "uuid": "test-uuid",
            "fsec_version_id": "fsec-uuid",
            "status_id": None,
            "type_id": None,
            "event_date": None,
            "closure_date": None,
        }

        result = fa_mapper_api_to_bean(data)

        assert result.status_id is None
        assert result.type_id is None
        assert result.event_date is None
        assert result.closure_date is None

    @pytest.mark.unit
    def test_api_to_bean_missing_text_fields_are_none(self):
        """Régression: discoverer/observation/quick_analysis absents -> None.

        Sinon un PUT partiel (PhaseEnCoursSection ne renvoie pas la phase Ouvert)
        écraserait silencieusement constat & analyse rapide via _merge_fa_beans
        qui distingue None ("non fourni") de "" (effacement explicite).
        """
        partial_payload = {
            "uuid": "test-uuid",
            "fsec_version_id": "fsec-uuid",
            "cause": "Nouvelle cause",
        }

        result = fa_mapper_api_to_bean(partial_payload)

        assert result.discoverer is None
        assert result.observation is None
        assert result.quick_analysis is None


class TestFaMapperBeanToEntity:
    """Tests conversion Bean → Entity."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self, sample_fa_bean):
        """Test conversion Bean → Entity."""
        result = fa_mapper_bean_to_entity(sample_fa_bean)

        assert result.uuid == sample_fa_bean.uuid
        assert result.fsec_version_id_id == sample_fa_bean.fsec_version_id
        assert result.status_id_id == sample_fa_bean.status_id
        assert result.type_id_id == sample_fa_bean.type_id
        assert result.criticality_id_id == sample_fa_bean.criticality_id
        assert result.identifier == sample_fa_bean.identifier
        assert result.discoverer == sample_fa_bean.discoverer
        assert result.event_date == sample_fa_bean.event_date
        assert result.observation == sample_fa_bean.observation
        assert result.iec_validation_open == sample_fa_bean.iec_validation_open

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        """Test conversion Bean sans UUID (création)."""
        bean = FaBean(
            uuid="",
            fsec_version_id="fsec-uuid",
            status_id=0,
            identifier="FA_New",
            discoverer="Creator",
            event_date=date(2025, 6, 1),
            observation="New observation",
            quick_analysis="New analysis",
        )

        result = fa_mapper_bean_to_entity(bean)

        # UUID ne doit pas être défini pour une nouvelle entité
        assert result.fsec_version_id_id == "fsec-uuid"
        assert result.status_id_id == 0
        assert result.identifier == "FA_New"


class TestFaMapperRoundtrip:
    """Tests de conversion aller-retour."""

    @pytest.mark.unit
    def test_bean_to_api_to_bean_roundtrip(self, sample_fa_bean):
        """Test que Bean → API → Bean préserve les données."""
        api_data = fa_mapper_bean_to_api(sample_fa_bean)
        restored_bean = fa_mapper_api_to_bean(api_data)

        assert restored_bean.uuid == sample_fa_bean.uuid
        assert restored_bean.fsec_version_id == sample_fa_bean.fsec_version_id
        assert restored_bean.status_id == sample_fa_bean.status_id
        assert restored_bean.type_id == sample_fa_bean.type_id
        assert restored_bean.criticality_id == sample_fa_bean.criticality_id
        assert restored_bean.identifier == sample_fa_bean.identifier
        assert restored_bean.discoverer == sample_fa_bean.discoverer
        assert restored_bean.event_date == sample_fa_bean.event_date
        assert restored_bean.observation == sample_fa_bean.observation
        assert restored_bean.iec_validation_open == sample_fa_bean.iec_validation_open

    @pytest.mark.unit
    def test_api_to_bean_to_api_roundtrip(self, sample_fa_api_data):
        """Test que API → Bean → API préserve les données."""
        bean = fa_mapper_api_to_bean(sample_fa_api_data)
        restored_api = fa_mapper_bean_to_api(bean)

        assert restored_api["uuid"] == sample_fa_api_data["uuid"]
        assert restored_api["fsec_version_id"] == sample_fa_api_data["fsec_version_id"]
        assert restored_api["status_id"] == sample_fa_api_data["status_id"]
        assert restored_api["identifier"] == sample_fa_api_data["identifier"]
        assert restored_api["discoverer"] == sample_fa_api_data["discoverer"]
        # Dates sont formatées en ISO
        assert restored_api["event_date"] == sample_fa_api_data["event_date"]
