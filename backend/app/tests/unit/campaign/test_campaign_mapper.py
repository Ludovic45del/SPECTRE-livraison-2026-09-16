"""
Tests unitaires pour les mappers Campaign.

Ces tests vérifient les 4 directions de conversion pour chaque mapper :
- Entity → Bean
- Bean → Entity
- API → Bean
- Bean → API
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.mapper.campaign.campaign_documents_mapper import (
    campaign_documents_mapper_api_to_bean,
    campaign_documents_mapper_bean_to_api,
    campaign_documents_mapper_bean_to_entity,
    campaign_documents_mapper_entity_to_bean,
)
from app.mapper.campaign.campaign_mapper import (
    campaign_mapper_api_to_bean,
    campaign_mapper_bean_to_api,
    campaign_mapper_bean_to_entity,
    campaign_mapper_entity_to_bean,
)
from app.mapper.campaign.campaign_teams_mapper import (
    campaign_teams_mapper_api_to_bean,
    campaign_teams_mapper_bean_to_api,
    campaign_teams_mapper_bean_to_entity,
    campaign_teams_mapper_entity_to_bean,
)

SAMPLE_UUID = "981b3cfb-2fba-4a30-ad2d-cbdd73f3334a"
SAMPLE_UUID_2 = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
CAMPAIGN_UUID = "11111111-1111-1111-1111-111111111111"


# ─────────────────────────────────────────────────────────────────────────────
# Campaign Mapper
# ─────────────────────────────────────────────────────────────────────────────


class TestCampaignMapperEntityToBean:
    """Tests conversion Entity → Bean."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.type_id_id = 0
        mock_entity.status_id_id = 1
        mock_entity.installation_id_id = 2
        mock_entity.name = "Campagne Test"
        mock_entity.year = 2025
        mock_entity.semester = "S1"
        mock_entity.last_updated = None
        mock_entity.created_at = None
        mock_entity.start_date = date(2025, 1, 15)
        mock_entity.end_date = date(2025, 6, 30)
        mock_entity.dtri_number = 12345
        mock_entity.description = "Description test"

        result = campaign_mapper_entity_to_bean(mock_entity)

        assert isinstance(result, CampaignBean)
        assert result.uuid == SAMPLE_UUID
        assert result.type_id == 0
        assert result.status_id == 1
        assert result.installation_id == 2
        assert result.name == "Campagne Test"
        assert result.year == 2025
        assert result.semester == "S1"
        assert result.start_date == date(2025, 1, 15)
        assert result.end_date == date(2025, 6, 30)
        assert result.dtri_number == 12345
        assert result.description == "Description test"

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.type_id_id = None
        mock_entity.status_id_id = None
        mock_entity.installation_id_id = None
        mock_entity.name = "Test"
        mock_entity.year = 2025
        mock_entity.semester = "S1"
        mock_entity.last_updated = None
        mock_entity.created_at = None
        mock_entity.start_date = None
        mock_entity.end_date = None
        mock_entity.dtri_number = None
        mock_entity.description = None

        result = campaign_mapper_entity_to_bean(mock_entity)

        assert result.type_id is None
        assert result.status_id is None
        assert result.installation_id is None
        assert result.start_date is None
        assert result.end_date is None
        assert result.dtri_number is None
        assert result.description is None


class TestCampaignMapperBeanToEntity:
    """Tests conversion Bean → Entity."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self, sample_campaign_bean):
        result = campaign_mapper_bean_to_entity(sample_campaign_bean)

        assert result.uuid == sample_campaign_bean.uuid
        assert result.type_id_id == sample_campaign_bean.type_id
        assert result.status_id_id == sample_campaign_bean.status_id
        assert result.installation_id_id == sample_campaign_bean.installation_id
        assert result.name == sample_campaign_bean.name
        assert result.year == sample_campaign_bean.year
        assert result.semester == sample_campaign_bean.semester
        assert result.start_date == sample_campaign_bean.start_date
        assert result.end_date == sample_campaign_bean.end_date
        assert result.dtri_number == sample_campaign_bean.dtri_number
        assert result.description == sample_campaign_bean.description

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        bean = CampaignBean(
            uuid="",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Nouvelle",
            year=2025,
            semester="S1",
        )

        result = campaign_mapper_bean_to_entity(bean)

        assert result.name == "Nouvelle"
        assert result.type_id_id == 0


class TestCampaignMapperBeanToApi:
    """Tests conversion Bean → API."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self, sample_campaign_bean):
        result = campaign_mapper_bean_to_api(sample_campaign_bean)

        assert isinstance(result, dict)
        assert result["uuid"] == sample_campaign_bean.uuid
        assert result["type_id"] == sample_campaign_bean.type_id
        assert result["name"] == sample_campaign_bean.name
        assert result["year"] == sample_campaign_bean.year
        assert result["start_date"] == sample_campaign_bean.start_date.isoformat()
        assert result["end_date"] == sample_campaign_bean.end_date.isoformat()

    @pytest.mark.unit
    def test_bean_to_api_null_dates(self):
        bean = CampaignBean(
            uuid=SAMPLE_UUID,
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Test",
            year=2025,
            semester="S1",
        )

        result = campaign_mapper_bean_to_api(bean)

        assert result["start_date"] is None
        assert result["end_date"] is None
        assert result["created_at"] is None
        assert result["last_updated"] is None


class TestCampaignMapperApiToBean:
    """Tests conversion API → Bean."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        api_data = {
            "uuid": SAMPLE_UUID,
            "type_id": 0,
            "status_id": 1,
            "installation_id": 2,
            "name": "Campagne API",
            "year": 2025,
            "semester": "S2",
            "start_date": "2025-07-01",
            "end_date": "2025-12-31",
            "dtri_number": 99999,
            "description": "Description API",
        }

        result = campaign_mapper_api_to_bean(api_data)

        assert isinstance(result, CampaignBean)
        assert result.uuid == SAMPLE_UUID
        assert result.name == "Campagne API"
        assert result.year == 2025
        assert result.start_date == date(2025, 7, 1)
        assert result.end_date == date(2025, 12, 31)

    @pytest.mark.unit
    def test_api_to_bean_missing_optional_fields(self):
        api_data = {
            "uuid": SAMPLE_UUID,
            "type_id": 0,
            "status_id": 0,
            "installation_id": 0,
            "name": "Minimal",
            "year": 2025,
            "semester": "S1",
        }

        result = campaign_mapper_api_to_bean(api_data)

        assert result.name == "Minimal"
        assert result.dtri_number is None
        assert result.description is None

    @pytest.mark.unit
    def test_api_to_bean_null_ids_preserve_none(self):
        api_data = {"uuid": SAMPLE_UUID, "name": "Test", "year": 2025, "semester": "S1"}

        result = campaign_mapper_api_to_bean(api_data)

        assert result.type_id is None
        assert result.status_id is None
        assert result.installation_id is None


class TestCampaignMapperRoundtrip:
    """Tests de conversion aller-retour."""

    @pytest.mark.unit
    def test_bean_to_api_to_bean_roundtrip(self, sample_campaign_bean):
        api_data = campaign_mapper_bean_to_api(sample_campaign_bean)
        restored_bean = campaign_mapper_api_to_bean(api_data)

        assert restored_bean.uuid == sample_campaign_bean.uuid
        assert restored_bean.name == sample_campaign_bean.name
        assert restored_bean.year == sample_campaign_bean.year
        assert restored_bean.semester == sample_campaign_bean.semester
        assert restored_bean.type_id == sample_campaign_bean.type_id


# ─────────────────────────────────────────────────────────────────────────────
# Campaign Documents Mapper
# ─────────────────────────────────────────────────────────────────────────────


class TestCampaignDocumentsMapperEntityToBean:
    """Tests conversion Entity → Bean pour CampaignDocuments."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.campaign_uuid_id = CAMPAIGN_UUID
        mock_entity.subtype_id_id = 3
        mock_entity.file_type_id_id = 5
        mock_entity.name = "rapport.pdf"
        mock_entity.path = "P:\\INB\\2025\\CAMP1\\rapport.pdf"
        mock_entity.date = date(2025, 3, 15)

        result = campaign_documents_mapper_entity_to_bean(mock_entity)

        assert isinstance(result, CampaignDocumentsBean)
        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid == CAMPAIGN_UUID
        assert result.subtype_id == 3
        assert result.file_type_id == 5
        assert result.name == "rapport.pdf"
        assert result.path == "P:\\INB\\2025\\CAMP1\\rapport.pdf"
        assert result.date == date(2025, 3, 15)

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.campaign_uuid_id = None
        mock_entity.subtype_id_id = None
        mock_entity.file_type_id_id = None
        mock_entity.name = "fichier.txt"
        mock_entity.path = ""
        mock_entity.date = None

        result = campaign_documents_mapper_entity_to_bean(mock_entity)

        assert result.campaign_uuid == ""
        assert result.subtype_id is None
        assert result.file_type_id is None
        assert result.date is None


class TestCampaignDocumentsMapperBeanToEntity:
    """Tests conversion Bean → Entity pour CampaignDocuments."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self):
        bean = CampaignDocumentsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            subtype_id=3,
            file_type_id=5,
            name="rapport.pdf",
            path="P:\\INB\\2025\\CAMP1\\rapport.pdf",
            date=date(2025, 3, 15),
        )

        result = campaign_documents_mapper_bean_to_entity(bean)

        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid_id == CAMPAIGN_UUID
        assert result.subtype_id_id == 3
        assert result.file_type_id_id == 5
        assert result.name == "rapport.pdf"
        assert result.path == "P:\\INB\\2025\\CAMP1\\rapport.pdf"
        assert result.date == date(2025, 3, 15)

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        bean = CampaignDocumentsBean(
            uuid="",
            campaign_uuid=CAMPAIGN_UUID,
            name="nouveau.pdf",
            path="P:\\test",
        )

        result = campaign_documents_mapper_bean_to_entity(bean)

        assert result.name == "nouveau.pdf"
        assert result.campaign_uuid_id == CAMPAIGN_UUID


class TestCampaignDocumentsMapperApiToBean:
    """Tests conversion API → Bean pour CampaignDocuments."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        api_data = {
            "uuid": SAMPLE_UUID,
            "campaign_uuid": CAMPAIGN_UUID,
            "subtype_id": 3,
            "file_type_id": 5,
            "name": "rapport.pdf",
            "path": "P:\\INB\\2025\\CAMP1\\rapport.pdf",
            "date": date(2025, 3, 15),
        }

        result = campaign_documents_mapper_api_to_bean(api_data)

        assert isinstance(result, CampaignDocumentsBean)
        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid == CAMPAIGN_UUID
        assert result.name == "rapport.pdf"

    @pytest.mark.unit
    def test_api_to_bean_minimal(self):
        api_data = {"name": "minimal.pdf"}

        result = campaign_documents_mapper_api_to_bean(api_data)

        assert result.name == "minimal.pdf"
        assert result.uuid == ""
        assert result.campaign_uuid == ""
        assert result.subtype_id is None
        assert result.file_type_id is None


class TestCampaignDocumentsMapperBeanToApi:
    """Tests conversion Bean → API pour CampaignDocuments."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self):
        bean = CampaignDocumentsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            subtype_id=3,
            file_type_id=5,
            name="rapport.pdf",
            path="P:\\INB\\2025\\CAMP1\\rapport.pdf",
            date=date(2025, 3, 15),
        )

        result = campaign_documents_mapper_bean_to_api(bean)

        assert isinstance(result, dict)
        assert result["uuid"] == SAMPLE_UUID
        assert result["campaign_uuid"] == CAMPAIGN_UUID
        assert result["name"] == "rapport.pdf"
        assert result["date"] == "2025-03-15"

    @pytest.mark.unit
    def test_bean_to_api_null_date(self):
        bean = CampaignDocumentsBean(uuid=SAMPLE_UUID, name="test.pdf")

        result = campaign_documents_mapper_bean_to_api(bean)

        assert result["date"] is None


class TestCampaignDocumentsMapperRoundtrip:
    """Tests aller-retour pour CampaignDocuments."""

    @pytest.mark.unit
    def test_bean_to_api_to_bean_roundtrip(self):
        bean = CampaignDocumentsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            subtype_id=3,
            file_type_id=5,
            name="rapport.pdf",
            path="P:\\INB\\2025",
        )

        api_data = campaign_documents_mapper_bean_to_api(bean)
        restored = campaign_documents_mapper_api_to_bean(api_data)

        assert restored.uuid == bean.uuid
        assert restored.campaign_uuid == bean.campaign_uuid
        assert restored.name == bean.name
        assert restored.subtype_id == bean.subtype_id
        assert restored.file_type_id == bean.file_type_id


# ─────────────────────────────────────────────────────────────────────────────
# Campaign Teams Mapper
# ─────────────────────────────────────────────────────────────────────────────


class TestCampaignTeamsMapperEntityToBean:
    """Tests conversion Entity → Bean pour CampaignTeams."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.campaign_uuid_id = CAMPAIGN_UUID
        mock_entity.role_id_id = 1
        mock_entity.name = "Jean Dupont"

        result = campaign_teams_mapper_entity_to_bean(mock_entity)

        assert isinstance(result, CampaignTeamsBean)
        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid == CAMPAIGN_UUID
        assert result.role_id == 1
        assert result.name == "Jean Dupont"

    @pytest.mark.unit
    def test_entity_to_bean_nullable_role(self):
        mock_entity = MagicMock()
        mock_entity.uuid = SAMPLE_UUID
        mock_entity.campaign_uuid_id = CAMPAIGN_UUID
        mock_entity.role_id_id = None
        mock_entity.name = "Sans Rôle"

        result = campaign_teams_mapper_entity_to_bean(mock_entity)

        assert result.role_id is None


class TestCampaignTeamsMapperBeanToEntity:
    """Tests conversion Bean → Entity pour CampaignTeams."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self):
        bean = CampaignTeamsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            role_id=1,
            name="Jean Dupont",
        )

        result = campaign_teams_mapper_bean_to_entity(bean)

        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid_id == CAMPAIGN_UUID
        assert result.role_id_id == 1
        assert result.name == "Jean Dupont"

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        bean = CampaignTeamsBean(
            uuid="",
            campaign_uuid=CAMPAIGN_UUID,
            role_id=2,
            name="Nouveau Membre",
        )

        result = campaign_teams_mapper_bean_to_entity(bean)

        assert result.name == "Nouveau Membre"
        assert result.campaign_uuid_id == CAMPAIGN_UUID


class TestCampaignTeamsMapperApiToBean:
    """Tests conversion API → Bean pour CampaignTeams."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        api_data = {
            "uuid": SAMPLE_UUID,
            "campaign_uuid": CAMPAIGN_UUID,
            "role_id": 1,
            "name": "Jean Dupont",
        }

        result = campaign_teams_mapper_api_to_bean(api_data)

        assert isinstance(result, CampaignTeamsBean)
        assert result.uuid == SAMPLE_UUID
        assert result.campaign_uuid == CAMPAIGN_UUID
        assert result.role_id == 1
        assert result.name == "Jean Dupont"

    @pytest.mark.unit
    def test_api_to_bean_minimal(self):
        api_data = {"name": "Minimal"}

        result = campaign_teams_mapper_api_to_bean(api_data)

        assert result.name == "Minimal"
        assert result.uuid == ""
        assert result.role_id is None


class TestCampaignTeamsMapperBeanToApi:
    """Tests conversion Bean → API pour CampaignTeams."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self):
        bean = CampaignTeamsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            role_id=1,
            name="Jean Dupont",
        )

        result = campaign_teams_mapper_bean_to_api(bean)

        assert isinstance(result, dict)
        assert result["uuid"] == SAMPLE_UUID
        assert result["campaign_uuid"] == CAMPAIGN_UUID
        assert result["role_id"] == 1
        assert result["name"] == "Jean Dupont"

    @pytest.mark.unit
    def test_bean_to_api_null_role(self):
        bean = CampaignTeamsBean(uuid=SAMPLE_UUID, name="Test")

        result = campaign_teams_mapper_bean_to_api(bean)

        assert result["role_id"] is None


class TestCampaignTeamsMapperRoundtrip:
    """Tests aller-retour pour CampaignTeams."""

    @pytest.mark.unit
    def test_bean_to_api_to_bean_roundtrip(self):
        bean = CampaignTeamsBean(
            uuid=SAMPLE_UUID,
            campaign_uuid=CAMPAIGN_UUID,
            role_id=2,
            name="Marie Martin",
        )

        api_data = campaign_teams_mapper_bean_to_api(bean)
        restored = campaign_teams_mapper_api_to_bean(api_data)

        assert restored.uuid == bean.uuid
        assert restored.campaign_uuid == bean.campaign_uuid
        assert restored.role_id == bean.role_id
        assert restored.name == bean.name
