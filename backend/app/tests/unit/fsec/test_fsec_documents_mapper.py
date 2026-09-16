"""
Tests unitaires pour les mappers FsecDocuments.

Ces tests verifient les conversions :
- Entity -> Bean
- Bean -> Entity
- API -> Bean
- Bean -> API
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.fsec.models.fsec_documents_bean import FsecDocumentsBean
from app.mapper.fsec.fsec_documents_mapper import (
    fsec_documents_mapper_api_to_bean,
    fsec_documents_mapper_bean_to_api,
    fsec_documents_mapper_bean_to_entity,
    fsec_documents_mapper_entity_to_bean,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def sample_fsec_documents_bean():
    """Bean FsecDocuments de test complet."""
    return FsecDocumentsBean(
        uuid="doc-uuid-123",
        fsec_id="fsec-uuid-456",
        subtype_id=2,
        name="Document Test",
        path="/path/to/document.pdf",
        date=date(2025, 6, 15),
    )


@pytest.fixture
def mock_fsec_documents_entity():
    """Mock FsecDocumentsEntity pour tests."""
    mock = MagicMock()
    mock.uuid = "doc-uuid-123"
    mock.fsec_id_id = "fsec-uuid-456"
    mock.subtype_id_id = 2
    mock.name = "Document Test"
    mock.path = "/path/to/document.pdf"
    mock.date = date(2025, 6, 15)
    return mock


# ============================================================================
# ENTITY TO BEAN TESTS
# ============================================================================


class TestFsecDocumentsMapperEntityToBean:
    """Tests conversion Entity -> Bean."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self, mock_fsec_documents_entity):
        """Test conversion complete Entity -> Bean."""
        result = fsec_documents_mapper_entity_to_bean(mock_fsec_documents_entity)

        assert isinstance(result, FsecDocumentsBean)
        assert result.uuid == str(mock_fsec_documents_entity.uuid)
        assert result.fsec_id == str(mock_fsec_documents_entity.fsec_id_id)
        assert result.subtype_id == mock_fsec_documents_entity.subtype_id_id
        assert result.name == "Document Test"
        assert result.path == "/path/to/document.pdf"
        assert result.date == date(2025, 6, 15)

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        """Test conversion avec champs nullables (subtype_id None, fsec_id vide)."""
        mock_entity = MagicMock()
        mock_entity.uuid = "doc-uuid-minimal"
        mock_entity.fsec_id_id = None
        mock_entity.subtype_id_id = None
        mock_entity.name = "Doc Minimal"
        mock_entity.path = "/minimal.pdf"
        mock_entity.date = None

        result = fsec_documents_mapper_entity_to_bean(mock_entity)

        assert result.uuid == "doc-uuid-minimal"
        assert result.fsec_id == ""
        assert result.subtype_id is None
        assert result.name == "Doc Minimal"
        assert result.path == "/minimal.pdf"
        assert result.date is None


# ============================================================================
# BEAN TO ENTITY TESTS
# ============================================================================


class TestFsecDocumentsMapperBeanToEntity:
    """Tests conversion Bean -> Entity."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self, sample_fsec_documents_bean):
        """Test conversion complete Bean -> Entity."""
        result = fsec_documents_mapper_bean_to_entity(sample_fsec_documents_bean)

        assert result.uuid == sample_fsec_documents_bean.uuid
        assert result.fsec_id_id == sample_fsec_documents_bean.fsec_id
        assert result.subtype_id_id == sample_fsec_documents_bean.subtype_id
        assert result.name == sample_fsec_documents_bean.name
        assert result.path == sample_fsec_documents_bean.path
        assert result.date == sample_fsec_documents_bean.date

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        """Test conversion Bean sans UUID (creation) - uuid vide ne doit pas etre defini."""
        bean = FsecDocumentsBean(
            uuid="",
            fsec_id="fsec-uuid-789",
            subtype_id=1,
            name="Nouveau Document",
            path="/new/document.pdf",
            date=date(2025, 7, 1),
        )

        result = fsec_documents_mapper_bean_to_entity(bean)

        # L'entity ne doit pas avoir d'UUID pre-defini quand bean.uuid est vide
        assert result.name == "Nouveau Document"
        assert result.fsec_id_id == "fsec-uuid-789"
        assert result.subtype_id_id == 1
        assert result.path == "/new/document.pdf"
        assert result.date == date(2025, 7, 1)


# ============================================================================
# API TO BEAN TESTS
# ============================================================================


class TestFsecDocumentsMapperApiToBean:
    """Tests conversion API -> Bean."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        """Test conversion complete API dict -> Bean."""
        api_data = {
            "uuid": "doc-uuid-api",
            "fsec_id": "fsec-uuid-api",
            "subtype_id": 3,
            "name": "Document API",
            "path": "/api/document.pdf",
            "date": date(2025, 8, 20),
        }

        result = fsec_documents_mapper_api_to_bean(api_data)

        assert isinstance(result, FsecDocumentsBean)
        assert result.uuid == "doc-uuid-api"
        assert result.fsec_id == "fsec-uuid-api"
        assert result.subtype_id == 3
        assert result.name == "Document API"
        assert result.path == "/api/document.pdf"
        assert result.date == date(2025, 8, 20)

    @pytest.mark.unit
    def test_api_to_bean_missing_optional(self):
        """Test conversion avec champs optionnels manquants."""
        api_data = {
            "name": "Minimal Doc",
        }

        result = fsec_documents_mapper_api_to_bean(api_data)

        assert result.uuid == ""
        assert result.fsec_id == ""
        assert result.subtype_id is None
        assert result.name == "Minimal Doc"
        assert result.path == ""
        assert result.date is None


# ============================================================================
# BEAN TO API TESTS
# ============================================================================


class TestFsecDocumentsMapperBeanToApi:
    """Tests conversion Bean -> API."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self, sample_fsec_documents_bean):
        """Test conversion complete Bean -> API dict."""
        result = fsec_documents_mapper_bean_to_api(sample_fsec_documents_bean)

        assert isinstance(result, dict)
        assert result["uuid"] == sample_fsec_documents_bean.uuid
        assert result["fsec_id"] == sample_fsec_documents_bean.fsec_id
        assert result["subtype_id"] == sample_fsec_documents_bean.subtype_id
        assert result["name"] == sample_fsec_documents_bean.name
        assert result["path"] == sample_fsec_documents_bean.path

    @pytest.mark.unit
    def test_bean_to_api_date_format(self, sample_fsec_documents_bean):
        """Test que la date est formatee en ISO."""
        result = fsec_documents_mapper_bean_to_api(sample_fsec_documents_bean)

        assert result["date"] == "2025-06-15"

    @pytest.mark.unit
    def test_bean_to_api_null_date(self):
        """Test conversion avec date nulle."""
        bean = FsecDocumentsBean(
            uuid="doc-uuid",
            fsec_id="fsec-uuid",
            subtype_id=1,
            name="Doc Sans Date",
            path="/doc.pdf",
            date=None,
        )

        result = fsec_documents_mapper_bean_to_api(bean)

        assert result["date"] is None
