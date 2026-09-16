"""Tests d'intégration pour le repository Embase."""

import uuid
from datetime import date

import pytest

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.repository.embase.repositories.embase_repository import EmbaseRepository
from app.repository.embase.repositories.etalonnage_repository import (
    EtalonnageRepository,
)


@pytest.fixture
def embase_repository():
    """Instance du repository Embase."""
    return EmbaseRepository()


@pytest.fixture
def etalonnage_repository():
    """Instance du repository Etalonnage."""
    return EtalonnageRepository()


@pytest.fixture
def sample_embase_data():
    """Données d'embase pour tests."""
    return {
        "identifier": f"G{uuid.uuid4().hex[:4]}",
        "type": "jet_de_gaz",
        "nombre_voies": 1,
        "soufflet_v1": "Soufflet A",
        "capteur_v1": "Capteur X",
        "test_etancheite_he": "OK",
        "operationnelle_aimant": True,
        "localisation_actuelle": "Labo 1",
    }


# ============================================================================
# CREATE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryCreate:
    """Tests création d'embase."""

    def test_create_embase_success(self, embase_repository, sample_embase_data):
        """Test création réussie d'une embase."""
        bean = EmbaseBean(**sample_embase_data)

        result = embase_repository.create(bean)

        assert result.uuid is not None
        assert result.identifier == sample_embase_data["identifier"]
        assert result.type == "jet_de_gaz"
        assert result.operationnelle_aimant is True

    def test_create_embase_generates_uuid(self, embase_repository, sample_embase_data):
        """Test que l'UUID est généré automatiquement."""
        bean = EmbaseBean(**sample_embase_data)

        result = embase_repository.create(bean)

        assert result.uuid
        assert len(result.uuid) == 36  # UUID format

    def test_create_embase_with_minimal_fields(self, embase_repository):
        """Test création avec champs minimaux."""
        bean = EmbaseBean(
            identifier=f"G{uuid.uuid4().hex[:4]}",
            type="bp",
        )

        result = embase_repository.create(bean)

        assert result.identifier == bean.identifier
        assert result.type == "bp"
        assert result.nombre_voies == 1


# ============================================================================
# READ
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryRead:
    """Tests lecture d'embase."""

    def test_get_by_uuid_success(self, embase_repository, sample_embase_data):
        """Test récupération par UUID."""
        created = embase_repository.create(EmbaseBean(**sample_embase_data))

        result = embase_repository.get_by_uuid(created.uuid)

        assert result is not None
        assert result.uuid == created.uuid
        assert result.identifier == sample_embase_data["identifier"]

    def test_get_by_uuid_not_found(self, embase_repository):
        """Test UUID inexistant retourne None."""
        result = embase_repository.get_by_uuid(str(uuid.uuid4()))
        assert result is None

    def test_get_by_uuid_annotates_last_etalonnage_date(
        self, embase_repository, etalonnage_repository, sample_embase_data
    ):
        """Test que get_by_uuid annote last_etalonnage_date."""
        embase = embase_repository.create(EmbaseBean(**sample_embase_data))

        # Créer un étalonnage
        etal_bean = EtalonnageBean(
            embase_uuid=embase.uuid,
            voie=1,
            date=date(2025, 3, 1),
            operateur="Test",
        )
        etalonnage_repository.create(etal_bean)

        result = embase_repository.get_by_uuid(embase.uuid)

        assert result.last_etalonnage_date == date(2025, 3, 1)
        assert result.last_etalonnage_date_v1 == date(2025, 3, 1)
        assert result.last_etalonnage_date_v2 is None

    def test_get_all_returns_list(self, embase_repository):
        """Test récupération de la liste."""
        embase_repository.create(
            EmbaseBean(identifier=f"G{uuid.uuid4().hex[:4]}", type="jet_de_gaz")
        )
        embase_repository.create(
            EmbaseBean(identifier=f"G{uuid.uuid4().hex[:4]}", type="hp")
        )

        result = embase_repository.get_all()

        assert len(result) >= 2

    def test_get_by_identifier_success(self, embase_repository, sample_embase_data):
        """Test récupération par identifiant."""
        embase_repository.create(EmbaseBean(**sample_embase_data))

        result = embase_repository.get_by_identifier(sample_embase_data["identifier"])

        assert result is not None
        assert result.identifier == sample_embase_data["identifier"]

    def test_get_by_identifier_not_found(self, embase_repository):
        """Test identifiant inexistant retourne None."""
        result = embase_repository.get_by_identifier("GZZZZ")
        assert result is None

    def test_get_by_identifier_annotates_last_etalonnage_date(
        self, embase_repository, etalonnage_repository, sample_embase_data
    ):
        """Test que get_by_identifier annote last_etalonnage_date (M1 fix)."""
        embase = embase_repository.create(EmbaseBean(**sample_embase_data))

        etal_bean = EtalonnageBean(
            embase_uuid=embase.uuid,
            voie=1,
            date=date(2025, 6, 15),
            operateur="Test",
        )
        etalonnage_repository.create(etal_bean)

        result = embase_repository.get_by_identifier(sample_embase_data["identifier"])

        assert result.last_etalonnage_date == date(2025, 6, 15)
        assert result.last_etalonnage_date_v1 == date(2025, 6, 15)


# ============================================================================
# UPDATE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryUpdate:
    """Tests mise à jour d'embase."""

    def test_update_embase_success(self, embase_repository, sample_embase_data):
        """Test modification de champs."""
        created = embase_repository.create(EmbaseBean(**sample_embase_data))

        created.localisation_actuelle = "Labo 2"
        created.operationnelle_aimant = False
        result = embase_repository.update(created)

        assert result.localisation_actuelle == "Labo 2"
        assert result.operationnelle_aimant is False

    def test_update_preserves_uuid(self, embase_repository, sample_embase_data):
        """Test que l'UUID ne change pas après update."""
        created = embase_repository.create(EmbaseBean(**sample_embase_data))
        original_uuid = created.uuid

        created.type = "hp"
        result = embase_repository.update(created)

        assert result.uuid == original_uuid


# ============================================================================
# DELETE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryDelete:
    """Tests suppression d'embase."""

    def test_delete_embase_success(self, embase_repository, sample_embase_data):
        """Test suppression réussie."""
        created = embase_repository.create(EmbaseBean(**sample_embase_data))

        result = embase_repository.delete(created.uuid)
        assert result is True

        # Vérifier disparition
        assert embase_repository.get_by_uuid(created.uuid) is None

    def test_delete_embase_not_found(self, embase_repository):
        """Test UUID inexistant retourne False."""
        result = embase_repository.delete(str(uuid.uuid4()))
        assert result is False


# ============================================================================
# DUPLICATE CHECK
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryDuplicateCheck:
    """Tests vérification de doublons."""

    def test_exists_by_identifier_true(self, embase_repository, sample_embase_data):
        """Test détection d'identifiant existant."""
        embase_repository.create(EmbaseBean(**sample_embase_data))

        result = embase_repository.exists_by_identifier(
            sample_embase_data["identifier"]
        )
        assert result is True

    def test_exists_by_identifier_false(self, embase_repository):
        """Test identifiant inexistant."""
        result = embase_repository.exists_by_identifier("GZZZZ")
        assert result is False

    def test_exists_duplicate_excludes_self(
        self, embase_repository, sample_embase_data
    ):
        """Test que exists_duplicate exclut l'embase elle-même."""
        created = embase_repository.create(EmbaseBean(**sample_embase_data))

        result = embase_repository.exists_duplicate(created.uuid, created.identifier)
        assert result is False

    def test_exists_duplicate_detects_other(self, embase_repository):
        """Test que exists_duplicate détecte un autre enregistrement."""
        e1 = embase_repository.create(
            EmbaseBean(identifier=f"G{uuid.uuid4().hex[:4]}", type="jet_de_gaz")
        )
        e2 = embase_repository.create(
            EmbaseBean(identifier=f"G{uuid.uuid4().hex[:4]}", type="hp")
        )

        # e2 essaie de prendre l'identifiant de e1
        result = embase_repository.exists_duplicate(e2.uuid, e1.identifier)
        assert result is True


# ============================================================================
# GET BY SLUG
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEmbaseRepositoryGetBySlug:
    """Tests résolution d'une embase par son slug d'URL (slugify de l'identifier)."""

    def test_get_by_slug_roundtrip(self, embase_repository, sample_embase_data):
        from app.domain.shared.slug import slugify_text

        created = embase_repository.create(EmbaseBean(**sample_embase_data))
        slug = slugify_text(created.identifier)

        resolved = embase_repository.get_by_slug(slug)

        assert resolved is not None
        assert resolved.uuid == created.uuid

    def test_get_by_slug_unknown_returns_none(self, embase_repository):
        assert embase_repository.get_by_slug("gzzzz-inexistante") is None
