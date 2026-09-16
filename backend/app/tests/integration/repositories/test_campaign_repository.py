"""
Tests d'intégration pour le repository Campaign.

Ces tests utilisent la base de données Django pour vérifier
les opérations CRUD réelles.
"""

import uuid
from datetime import date

import pytest

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.repository.campaign.repositories.campaign_repository import CampaignRepository


@pytest.fixture
def campaign_repository():
    """Instance du repository Campaign."""
    return CampaignRepository()


@pytest.fixture
def sample_campaign_data():
    """Données de campagne pour tests."""
    return {
        "type_id": 0,
        "status_id": 0,
        "installation_id": 0,
        "name": f"Campagne Test {uuid.uuid4().hex[:8]}",
        "year": 2025,
        "semester": "S1",
        "start_date": date(2025, 1, 15),
        "end_date": date(2025, 6, 30),
        "dtri_number": 12345,
        "description": "Campagne de test intégration",
    }


# ============================================================================
# CREATE TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryCreate:
    """Tests création de campagne."""

    def test_create_campaign_success(self, campaign_repository, sample_campaign_data):
        """Test création réussie d'une campagne."""
        bean = CampaignBean(**sample_campaign_data)

        result = campaign_repository.create(bean)

        assert result.uuid is not None
        assert result.name == sample_campaign_data["name"]
        assert result.year == 2025
        assert result.semester == "S1"

    def test_create_campaign_generates_uuid(
        self, campaign_repository, sample_campaign_data
    ):
        """Test que l'UUID est généré automatiquement."""
        bean = CampaignBean(**sample_campaign_data)

        result = campaign_repository.create(bean)

        assert result.uuid is not None
        assert len(result.uuid) == 36  # Format UUID

    def test_create_campaign_with_null_optional_fields(self, campaign_repository):
        """Test création avec champs optionnels nuls."""
        bean = CampaignBean(
            type_id=0,
            status_id=0,
            installation_id=0,
            name=f"Campagne Minimal {uuid.uuid4().hex[:8]}",
            year=2025,
            semester="S2",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )

        result = campaign_repository.create(bean)

        assert result.uuid is not None
        assert result.start_date is None
        assert result.end_date is None
        assert result.dtri_number is None


# ============================================================================
# READ TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryRead:
    """Tests lecture de campagne."""

    def test_get_by_uuid_success(self, campaign_repository, sample_campaign_data):
        """Test récupération par UUID."""
        bean = CampaignBean(**sample_campaign_data)
        created = campaign_repository.create(bean)

        result = campaign_repository.get_by_uuid(created.uuid)

        assert result is not None
        assert result.uuid == created.uuid
        assert result.name == sample_campaign_data["name"]

    def test_get_by_uuid_not_found(self, campaign_repository):
        """Test récupération UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        result = campaign_repository.get_by_uuid(fake_uuid)

        assert result is None

    def test_get_all_returns_list(self, campaign_repository, sample_campaign_data):
        """Test récupération de toutes les campagnes."""
        # Créer quelques campagnes
        for i in range(3):
            data = sample_campaign_data.copy()
            data["name"] = f"Campagne All Test {i} {uuid.uuid4().hex[:8]}"
            bean = CampaignBean(**data)
            campaign_repository.create(bean)

        result = campaign_repository.get_all()

        assert isinstance(result, list)
        assert len(result) >= 3


# ============================================================================
# UPDATE TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryUpdate:
    """Tests mise à jour de campagne."""

    def test_update_campaign_success(self, campaign_repository, sample_campaign_data):
        """Test mise à jour réussie."""
        bean = CampaignBean(**sample_campaign_data)
        created = campaign_repository.create(bean)

        # Modifier le bean
        created.name = "Campagne Modifiée"
        created.description = "Description modifiée"

        result = campaign_repository.update(created)

        assert result.name == "Campagne Modifiée"
        assert result.description == "Description modifiée"

    def test_update_preserves_uuid(self, campaign_repository, sample_campaign_data):
        """Test que l'UUID est préservé après update."""
        bean = CampaignBean(**sample_campaign_data)
        created = campaign_repository.create(bean)
        original_uuid = created.uuid

        created.name = "Nom modifié"
        result = campaign_repository.update(created)

        assert result.uuid == original_uuid


# ============================================================================
# DELETE TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryDelete:
    """Tests suppression de campagne."""

    def test_delete_campaign_success(self, campaign_repository, sample_campaign_data):
        """Test suppression réussie."""
        bean = CampaignBean(**sample_campaign_data)
        created = campaign_repository.create(bean)

        result = campaign_repository.delete(created.uuid)

        assert result is True
        # Vérifier que la campagne n'existe plus
        assert campaign_repository.get_by_uuid(created.uuid) is None

    def test_delete_campaign_not_found(self, campaign_repository):
        """Test suppression UUID inexistant."""
        fake_uuid = str(uuid.uuid4())

        result = campaign_repository.delete(fake_uuid)

        assert result is False


# ============================================================================
# DUPLICATE CHECK TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryDuplicateCheck:
    """Tests vérification de doublons."""

    def test_exists_by_name_year_semester_true(
        self, campaign_repository, sample_campaign_data
    ):
        """Test détection de doublon existant."""
        bean = CampaignBean(**sample_campaign_data)
        campaign_repository.create(bean)

        result = campaign_repository.exists_by_name_year_semester(
            sample_campaign_data["name"],
            sample_campaign_data["year"],
            sample_campaign_data["semester"],
        )

        assert result is True

    def test_exists_by_name_year_semester_false(self, campaign_repository):
        """Test pas de doublon."""
        result = campaign_repository.exists_by_name_year_semester(
            "Campagne Inexistante",
            2099,
            "S1",
        )

        assert result is False

    def test_exists_duplicate_excludes_self(
        self, campaign_repository, sample_campaign_data
    ):
        """Test exists_duplicate exclut l'UUID courant."""
        bean = CampaignBean(**sample_campaign_data)
        created = campaign_repository.create(bean)

        # Vérifier que la campagne ne se détecte pas elle-même comme doublon
        result = campaign_repository.exists_duplicate(
            created.uuid,
            created.name,
            created.year,
            created.semester,
        )

        assert result is False


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignRepositoryGetBySlug:
    """Tests résolution d'une campagne par son slug d'URL calculé."""

    def test_get_by_slug_roundtrip(self, campaign_repository, sample_campaign_data):
        from app.domain.shared.slug import build_campaign_slug

        created = campaign_repository.create(CampaignBean(**sample_campaign_data))
        slug = build_campaign_slug(
            created.year, created.semester, created.installation_label, created.name
        )

        resolved = campaign_repository.get_by_slug(slug)

        assert resolved is not None
        assert resolved.uuid == created.uuid

    def test_get_by_slug_unknown_returns_none(self, campaign_repository):
        assert campaign_repository.get_by_slug("2099-s1-lmj-inexistante") is None

    def test_get_by_slug_disambiguates_semester(self, campaign_repository):
        """Deux campagnes même nom/année/installation, semestres différents :
        chaque slug résout vers la bonne campagne grâce au semestre."""
        from app.domain.shared.slug import build_campaign_slug

        name = f"Recurrente {uuid.uuid4().hex[:8]}"
        s1 = campaign_repository.create(
            CampaignBean(
                type_id=0,
                status_id=0,
                installation_id=0,
                name=name,
                year=2026,
                semester="S1",
            )
        )
        s2 = campaign_repository.create(
            CampaignBean(
                type_id=0,
                status_id=0,
                installation_id=0,
                name=name,
                year=2026,
                semester="S2",
            )
        )
        slug_s1 = build_campaign_slug(2026, "S1", s1.installation_label, name)
        slug_s2 = build_campaign_slug(2026, "S2", s2.installation_label, name)

        assert slug_s1 != slug_s2
        assert campaign_repository.get_by_slug(slug_s1).uuid == s1.uuid
        assert campaign_repository.get_by_slug(slug_s2).uuid == s2.uuid
