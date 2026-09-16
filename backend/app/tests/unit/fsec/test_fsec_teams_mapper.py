"""
Tests unitaires pour les mappers FsecTeams.

Ces tests verifient les conversions :
- Entity -> Bean
- Bean -> Entity
- API -> Bean
- Bean -> API
"""

from unittest.mock import MagicMock

import pytest

from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean
from app.mapper.fsec.fsec_teams_mapper import (
    fsec_teams_mapper_api_to_bean,
    fsec_teams_mapper_bean_to_api,
    fsec_teams_mapper_bean_to_entity,
    fsec_teams_mapper_entity_to_bean,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def sample_fsec_teams_bean():
    """Bean FsecTeams de test complet."""
    return FsecTeamsBean(
        uuid="team-uuid-123",
        fsec_id="fsec-uuid-456",
        role_id=3,
        name="Jean Dupont",
    )


@pytest.fixture
def mock_fsec_teams_entity():
    """Mock FsecTeamsEntity pour tests."""
    mock = MagicMock()
    mock.uuid = "team-uuid-123"
    mock.fsec_id_id = "fsec-uuid-456"
    mock.role_id_id = 3
    mock.name = "Jean Dupont"
    return mock


# ============================================================================
# ENTITY TO BEAN TESTS
# ============================================================================


class TestFsecTeamsMapperEntityToBean:
    """Tests conversion Entity -> Bean."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self, mock_fsec_teams_entity):
        """Test conversion complete Entity -> Bean."""
        result = fsec_teams_mapper_entity_to_bean(mock_fsec_teams_entity)

        assert isinstance(result, FsecTeamsBean)
        assert result.uuid == str(mock_fsec_teams_entity.uuid)
        assert result.fsec_id == str(mock_fsec_teams_entity.fsec_id_id)
        assert result.role_id == mock_fsec_teams_entity.role_id_id
        assert result.name == "Jean Dupont"

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        """Test conversion avec champs nullables (role_id None, fsec_id vide)."""
        mock_entity = MagicMock()
        mock_entity.uuid = "team-uuid-minimal"
        mock_entity.fsec_id_id = None
        mock_entity.role_id_id = None
        mock_entity.name = "Membre Minimal"

        result = fsec_teams_mapper_entity_to_bean(mock_entity)

        assert result.uuid == "team-uuid-minimal"
        assert result.fsec_id == ""
        assert result.role_id is None
        assert result.name == "Membre Minimal"


# ============================================================================
# BEAN TO ENTITY TESTS
# ============================================================================


class TestFsecTeamsMapperBeanToEntity:
    """Tests conversion Bean -> Entity."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self, sample_fsec_teams_bean):
        """Test conversion complete Bean -> Entity."""
        result = fsec_teams_mapper_bean_to_entity(sample_fsec_teams_bean)

        assert result.uuid == sample_fsec_teams_bean.uuid
        assert result.fsec_id_id == sample_fsec_teams_bean.fsec_id
        assert result.role_id_id == sample_fsec_teams_bean.role_id
        assert result.name == sample_fsec_teams_bean.name

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        """Test conversion Bean sans UUID (creation) - uuid vide ne doit pas etre defini."""
        bean = FsecTeamsBean(
            uuid="",
            fsec_id="fsec-uuid-789",
            role_id=1,
            name="Nouveau Membre",
        )

        result = fsec_teams_mapper_bean_to_entity(bean)

        # L'entity ne doit pas avoir d'UUID pre-defini quand bean.uuid est vide
        assert result.name == "Nouveau Membre"
        assert result.fsec_id_id == "fsec-uuid-789"
        assert result.role_id_id == 1


# ============================================================================
# API TO BEAN TESTS
# ============================================================================


class TestFsecTeamsMapperApiToBean:
    """Tests conversion API -> Bean."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        """Test conversion complete API dict -> Bean."""
        api_data = {
            "uuid": "team-uuid-api",
            "fsec_id": "fsec-uuid-api",
            "role_id": 5,
            "name": "Marie Martin",
        }

        result = fsec_teams_mapper_api_to_bean(api_data)

        assert isinstance(result, FsecTeamsBean)
        assert result.uuid == "team-uuid-api"
        assert result.fsec_id == "fsec-uuid-api"
        assert result.role_id == 5
        assert result.name == "Marie Martin"

    @pytest.mark.unit
    def test_api_to_bean_missing_optional(self):
        """Test conversion avec champs optionnels manquants."""
        api_data = {
            "name": "Minimal Membre",
        }

        result = fsec_teams_mapper_api_to_bean(api_data)

        assert result.uuid == ""
        assert result.fsec_id == ""
        assert result.role_id is None
        assert result.name == "Minimal Membre"


# ============================================================================
# BEAN TO API TESTS
# ============================================================================


class TestFsecTeamsMapperBeanToApi:
    """Tests conversion Bean -> API."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self, sample_fsec_teams_bean):
        """Test conversion complete Bean -> API dict."""
        result = fsec_teams_mapper_bean_to_api(sample_fsec_teams_bean)

        assert isinstance(result, dict)
        assert result["uuid"] == sample_fsec_teams_bean.uuid
        assert result["fsec_id"] == sample_fsec_teams_bean.fsec_id
        assert result["role_id"] == sample_fsec_teams_bean.role_id
        assert result["name"] == sample_fsec_teams_bean.name
