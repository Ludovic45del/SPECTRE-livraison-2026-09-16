"""
Tests unitaires pour les mappers FSEC.

Ces tests vérifient les conversions :
- Entity → Bean
- Bean → Entity
- API → Bean
- Bean → API
"""

from datetime import date, datetime
from unittest.mock import MagicMock

import pytest

from app.domain.fsec.models.fsec_bean import FsecBean
from app.mapper.fsec.fsec_mapper import (
    fsec_mapper_api_to_bean,
    fsec_mapper_bean_to_api,
    fsec_mapper_bean_to_entity,
    fsec_mapper_entity_to_bean,
)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def sample_fsec_bean():
    """Bean FSEC de test complet."""
    return FsecBean(
        version_uuid="v-uuid-123",
        fsec_uuid="f-uuid-456",
        campaign_id="c-uuid-789",
        status_id=1,
        category_id=2,
        rack_id=3,
        name="FSEC Test Mapper",
        comments="Commentaires test",
        is_active=True,
        delivery_date=date(2025, 3, 1),
        shooting_date=date(2025, 4, 15),
        preshooting_pressure=10.5,
        experience_srxx="SRXX-001",
        localisation="Zone A",
        depressurization_failed=False,
    )


@pytest.fixture
def mock_fsec_entity():
    """Mock FsecEntity pour tests."""
    mock = MagicMock()
    mock.version_uuid = "v-uuid-123"
    mock.fsec_uuid = "f-uuid-456"
    mock.campaign_id_id = "c-uuid-789"
    mock.status_id_id = 1
    mock.category_id_id = 2
    mock.rack_id_id = 3
    mock.name = "FSEC Test Mapper"
    mock.comments = "Commentaires test"
    mock.is_active = True
    mock.last_updated = datetime(2025, 1, 15, 10, 0, 0)
    mock.created_at = datetime(2025, 1, 1, 8, 0, 0)
    mock.delivery_date = date(2025, 3, 1)
    mock.shooting_date = date(2025, 4, 15)
    mock.preshooting_pressure = 10.5
    mock.experience_srxx = "SRXX-001"
    mock.localisation = "Zone A"
    mock.depressurization_failed = False
    # Contexte campagne nécessaire au calcul du slug (campaign_id pré-chargé).
    mock.campaign_id.year = 2025
    mock.campaign_id.semester = "S1"
    mock.campaign_id.name = "Campagne Test Mapper"
    mock.campaign_id.installation_id_id = 0
    mock.campaign_id.installation_id.label = "LMJ"
    return mock


# ============================================================================
# ENTITY TO BEAN TESTS
# ============================================================================


class TestFsecMapperEntityToBean:
    """Tests conversion Entity → Bean."""

    @pytest.mark.unit
    def test_entity_to_bean_all_fields(self, mock_fsec_entity):
        """Test conversion complète Entity → Bean."""
        result = fsec_mapper_entity_to_bean(mock_fsec_entity)

        assert isinstance(result, FsecBean)
        assert result.version_uuid == str(mock_fsec_entity.version_uuid)
        assert result.fsec_uuid == str(mock_fsec_entity.fsec_uuid)
        assert result.campaign_id == str(mock_fsec_entity.campaign_id_id)
        assert result.status_id == 1
        assert result.category_id == 2
        assert result.rack_id == 3
        assert result.name == "FSEC Test Mapper"
        assert result.comments == "Commentaires test"
        assert result.is_active is True
        assert result.delivery_date == date(2025, 3, 1)
        assert result.preshooting_pressure == 10.5
        # Slugs calculés depuis le contexte campagne préchargé.
        assert result.campaign_slug == "2025-s1-lmj-campagne-test-mapper"
        assert result.slug == "2025-s1-lmj-campagne-test-mapper-fsec-test-mapper"
        # Nom complet d'affichage : {année}-{installation}_{campagne}_{nom}.
        assert result.display_name == "2025-LMJ_Campagne Test Mapper_FSEC Test Mapper"

    @pytest.mark.unit
    def test_entity_to_bean_display_name_orphan_fsec(self, mock_fsec_entity):
        """Une FSEC sans campagne garde son nom court comme nom complet."""
        mock_fsec_entity.campaign_id_id = None
        result = fsec_mapper_entity_to_bean(mock_fsec_entity)
        assert result.display_name == "FSEC Test Mapper"
        assert result.campaign_slug is None

    @pytest.mark.unit
    def test_entity_to_bean_display_name_unknown_installation(self, mock_fsec_entity):
        mock_fsec_entity.campaign_id.installation_id_id = None
        result = fsec_mapper_entity_to_bean(mock_fsec_entity)
        assert result.display_name == "2025-UNK_Campagne Test Mapper_FSEC Test Mapper"

    @pytest.mark.unit
    def test_entity_to_bean_nullable_fields(self):
        """Test conversion avec champs nullables."""
        mock_entity = MagicMock()
        mock_entity.version_uuid = "v-uuid"
        mock_entity.fsec_uuid = "f-uuid"
        mock_entity.campaign_id_id = None
        mock_entity.status_id_id = None
        mock_entity.category_id_id = None
        mock_entity.rack_id_id = None
        mock_entity.name = "FSEC Minimal"
        mock_entity.comments = None
        mock_entity.is_active = True
        mock_entity.last_updated = None
        mock_entity.created_at = None
        mock_entity.delivery_date = None
        mock_entity.shooting_date = None
        mock_entity.preshooting_pressure = None
        mock_entity.experience_srxx = None
        mock_entity.localisation = None
        mock_entity.depressurization_failed = None

        result = fsec_mapper_entity_to_bean(mock_entity)

        assert result.campaign_id is None
        assert result.status_id is None
        assert result.category_id is None
        assert result.delivery_date is None
        assert result.preshooting_pressure is None

    @pytest.mark.unit
    def test_entity_to_bean_uuid_conversion(self, mock_fsec_entity):
        """Test que les UUIDs sont convertis en strings."""
        result = fsec_mapper_entity_to_bean(mock_fsec_entity)

        assert isinstance(result.version_uuid, str)
        assert isinstance(result.fsec_uuid, str)


# ============================================================================
# BEAN TO ENTITY TESTS
# ============================================================================


class TestFsecMapperBeanToEntity:
    """Tests conversion Bean → Entity."""

    @pytest.mark.unit
    def test_bean_to_entity_all_fields(self, sample_fsec_bean):
        """Test conversion complète Bean → Entity."""
        result = fsec_mapper_bean_to_entity(sample_fsec_bean)

        assert result.version_uuid == sample_fsec_bean.version_uuid
        assert result.fsec_uuid == sample_fsec_bean.fsec_uuid
        assert result.campaign_id_id == sample_fsec_bean.campaign_id
        assert result.status_id_id == sample_fsec_bean.status_id
        assert result.category_id_id == sample_fsec_bean.category_id
        assert result.name == sample_fsec_bean.name
        assert result.is_active is True

    @pytest.mark.unit
    def test_bean_to_entity_without_uuid(self):
        """Test conversion Bean sans UUID (création)."""
        bean = FsecBean(
            version_uuid="",
            fsec_uuid="",
            campaign_id="c-uuid",
            status_id=0,
            category_id=0,
            rack_id=0,
            name="Nouveau FSEC",
            is_active=True,
        )

        result = fsec_mapper_bean_to_entity(bean)

        # L'entity ne doit pas avoir d'UUID pré-défini
        assert result.name == "Nouveau FSEC"

    @pytest.mark.unit
    def test_bean_to_entity_is_active_default(self):
        """Test que is_active est True par défaut si None."""
        bean = FsecBean(
            version_uuid="v-uuid",
            fsec_uuid="f-uuid",
            name="Test",
            is_active=None,
        )

        result = fsec_mapper_bean_to_entity(bean)

        assert result.is_active is True


# ============================================================================
# API TO BEAN TESTS
# ============================================================================


class TestFsecMapperApiToBean:
    """Tests conversion API → Bean."""

    @pytest.mark.unit
    def test_api_to_bean_all_fields(self):
        """Test conversion complète API dict → Bean."""
        api_data = {
            "version_uuid": "v-uuid-api",
            "fsec_uuid": "f-uuid-api",
            "campaign_id": "c-uuid-api",
            "status_id": 2,
            "category_id": 1,
            "rack_id": 4,
            "name": "FSEC API",
            "comments": "Commentaire API",
            "is_active": True,
            "delivery_date": "2025-05-01",
            "shooting_date": "2025-06-15",
            "preshooting_pressure": 15.0,
            "experience_srxx": "SRXX-002",
            "localisation": "Zone B",
            "depressurization_failed": True,
        }

        result = fsec_mapper_api_to_bean(api_data)

        assert isinstance(result, FsecBean)
        assert result.version_uuid == "v-uuid-api"
        assert result.fsec_uuid == "f-uuid-api"
        assert result.campaign_id == "c-uuid-api"
        assert result.status_id == 2
        assert result.name == "FSEC API"
        assert result.preshooting_pressure == 15.0
        assert result.depressurization_failed is True

    @pytest.mark.unit
    def test_api_to_bean_missing_optional_fields(self):
        """Test conversion avec champs optionnels manquants."""
        api_data = {
            "version_uuid": "v-uuid",
            "fsec_uuid": "f-uuid",
            "name": "Minimal FSEC",
        }

        result = fsec_mapper_api_to_bean(api_data)

        assert result.name == "Minimal FSEC"
        assert result.is_active is True  # Default
        assert result.campaign_id is None
        assert result.delivery_date is None

    @pytest.mark.unit
    def test_api_to_bean_date_parsing(self):
        """Test parsing des dates depuis l'API."""
        api_data = {
            "version_uuid": "v-uuid",
            "fsec_uuid": "f-uuid",
            "name": "Test Dates",
            "delivery_date": "2025-03-15",
            "shooting_date": "2025-04-20",
        }

        result = fsec_mapper_api_to_bean(api_data)

        assert result.delivery_date == date(2025, 3, 15)
        assert result.shooting_date == date(2025, 4, 20)

    @pytest.mark.unit
    def test_api_to_bean_empty_data(self):
        """Test conversion avec données vides."""
        api_data = {}

        result = fsec_mapper_api_to_bean(api_data)

        assert result.version_uuid == ""
        assert result.fsec_uuid == ""
        assert result.name == ""
        assert result.is_active is True


# ============================================================================
# BEAN TO API TESTS
# ============================================================================


class TestFsecMapperBeanToApi:
    """Tests conversion Bean → API."""

    @pytest.mark.unit
    def test_bean_to_api_all_fields(self, sample_fsec_bean):
        """Test conversion complète Bean → API dict."""
        result = fsec_mapper_bean_to_api(sample_fsec_bean)

        assert isinstance(result, dict)
        assert result["version_uuid"] == sample_fsec_bean.version_uuid
        assert result["fsec_uuid"] == sample_fsec_bean.fsec_uuid
        assert result["campaign_id"] == sample_fsec_bean.campaign_id
        assert result["status_id"] == sample_fsec_bean.status_id
        assert result["name"] == sample_fsec_bean.name
        assert result["is_active"] is True
        # Sans nom complet renseigné, l'API retombe sur le nom court.
        assert result["display_name"] == sample_fsec_bean.name

    @pytest.mark.unit
    def test_bean_to_api_exposes_display_name(self, sample_fsec_bean):
        sample_fsec_bean.display_name = "2025-LMJ_Campagne_FSEC"
        result = fsec_mapper_bean_to_api(sample_fsec_bean)
        assert result["display_name"] == "2025-LMJ_Campagne_FSEC"

    @pytest.mark.unit
    def test_bean_to_api_date_format(self, sample_fsec_bean):
        """Test que les dates sont formatées en ISO."""
        result = fsec_mapper_bean_to_api(sample_fsec_bean)

        assert result["delivery_date"] == "2025-03-01"
        assert result["shooting_date"] == "2025-04-15"

    @pytest.mark.unit
    def test_bean_to_api_nullable_dates(self):
        """Test conversion avec dates nulles."""
        bean = FsecBean(
            version_uuid="v-uuid",
            fsec_uuid="f-uuid",
            name="Test Null Dates",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            last_updated=None,
            created_at=None,
        )

        result = fsec_mapper_bean_to_api(bean)

        assert result["delivery_date"] is None
        assert result["shooting_date"] is None
        assert result["last_updated"] is None
        assert result["created_at"] is None

    @pytest.mark.unit
    def test_bean_to_api_datetime_format(self):
        """Test formatage datetime (last_updated, created_at)."""
        bean = FsecBean(
            version_uuid="v-uuid",
            fsec_uuid="f-uuid",
            name="Test Datetime",
            is_active=True,
            last_updated=datetime(2025, 1, 15, 10, 30, 0),
            created_at=datetime(2025, 1, 1, 8, 0, 0),
        )

        result = fsec_mapper_bean_to_api(bean)

        assert "2025-01-15" in result["last_updated"]
        assert "2025-01-01" in result["created_at"]


# ============================================================================
# ROUNDTRIP TESTS
# ============================================================================


class TestFsecMapperRoundtrip:
    """Tests de conversion aller-retour."""

    @pytest.mark.unit
    def test_bean_to_api_to_bean_roundtrip(self, sample_fsec_bean):
        """Test que Bean → API → Bean préserve les données."""
        api_data = fsec_mapper_bean_to_api(sample_fsec_bean)
        restored_bean = fsec_mapper_api_to_bean(api_data)

        assert restored_bean.version_uuid == sample_fsec_bean.version_uuid
        assert restored_bean.fsec_uuid == sample_fsec_bean.fsec_uuid
        assert restored_bean.campaign_id == sample_fsec_bean.campaign_id
        assert restored_bean.name == sample_fsec_bean.name
        assert restored_bean.status_id == sample_fsec_bean.status_id
        assert restored_bean.is_active == sample_fsec_bean.is_active
        assert (
            restored_bean.preshooting_pressure == sample_fsec_bean.preshooting_pressure
        )

    @pytest.mark.unit
    def test_entity_to_bean_to_entity_preserves_fks(self, mock_fsec_entity):
        """Test que les FKs sont préservées lors des conversions."""
        bean = fsec_mapper_entity_to_bean(mock_fsec_entity)
        entity = fsec_mapper_bean_to_entity(bean)

        assert entity.campaign_id_id == str(mock_fsec_entity.campaign_id_id)
        assert entity.status_id_id == mock_fsec_entity.status_id_id
        assert entity.category_id_id == mock_fsec_entity.category_id_id


# ============================================================================
# REQUESTED VIEWS (R08) TESTS
# ============================================================================


class TestFsecMapperRequestedViews:
    """Vues demandées (R08) : le champ traverse entity ↔ bean ↔ api, sauf api→bean."""

    @pytest.mark.unit
    def test_entity_to_bean_maps_requested_views(self, mock_fsec_entity):
        mock_fsec_entity.requested_views = "Vue de face\nVue de dessus"

        result = fsec_mapper_entity_to_bean(mock_fsec_entity)

        assert result.requested_views == "Vue de face\nVue de dessus"

    @pytest.mark.unit
    def test_entity_to_bean_requested_views_none(self, mock_fsec_entity):
        mock_fsec_entity.requested_views = None

        result = fsec_mapper_entity_to_bean(mock_fsec_entity)

        assert result.requested_views is None

    @pytest.mark.unit
    def test_bean_to_entity_maps_requested_views(self, sample_fsec_bean):
        sample_fsec_bean.requested_views = "Zoom sur le scellement"

        result = fsec_mapper_bean_to_entity(sample_fsec_bean)

        assert result.requested_views == "Zoom sur le scellement"

    @pytest.mark.unit
    def test_bean_to_api_exposes_requested_views(self, sample_fsec_bean):
        sample_fsec_bean.requested_views = "Vue 3/4 arrière"

        result = fsec_mapper_bean_to_api(sample_fsec_bean)

        assert result["requested_views"] == "Vue 3/4 arrière"

    @pytest.mark.unit
    def test_bean_to_api_requested_views_default_none(self, sample_fsec_bean):
        result = fsec_mapper_bean_to_api(sample_fsec_bean)

        assert "requested_views" in result
        assert result["requested_views"] is None

    @pytest.mark.unit
    def test_api_to_bean_ignores_requested_views(self):
        """Le PUT global (api→bean) ne doit JAMAIS porter le champ : il passe
        uniquement par l'action PATCH dédiée (sinon un PUT partiel l'effacerait).
        """
        api_data = {
            "version_uuid": "v-uuid",
            "fsec_uuid": "f-uuid",
            "name": "FSEC",
            "requested_views": "Tentative via PUT",
        }

        result = fsec_mapper_api_to_bean(api_data)

        assert result.requested_views is None

    @pytest.mark.unit
    def test_entity_bean_api_roundtrip_requested_views(self, mock_fsec_entity):
        mock_fsec_entity.requested_views = "Vue de face, vue de dessus, zoom joint"

        bean = fsec_mapper_entity_to_bean(mock_fsec_entity)
        api = fsec_mapper_bean_to_api(bean)
        entity = fsec_mapper_bean_to_entity(bean)

        assert api["requested_views"] == "Vue de face, vue de dessus, zoom joint"
        assert entity.requested_views == "Vue de face, vue de dessus, zoom joint"
