"""Tests d'intégration pour le repository Etalonnage."""

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
def created_embase(embase_repository):
    """Embase créée en base pour les tests d'étalonnage."""
    bean = EmbaseBean(
        identifier=f"G{uuid.uuid4().hex[:4]}",
        type="jet_de_gaz",
        nombre_voies=2,
        soufflet_v1="Soufflet A",
        capteur_v1="Capteur X",
    )
    return embase_repository.create(bean)


# ============================================================================
# CREATE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryCreate:
    """Tests création d'étalonnage."""

    def test_create_etalonnage_success(self, etalonnage_repository, created_embase):
        """Test création réussie d'un étalonnage."""
        bean = EtalonnageBean(
            embase_uuid=created_embase.uuid,
            voie=1,
            date=date(2025, 3, 1),
            operateur="Jean Dupont",
        )

        result = etalonnage_repository.create(bean)

        assert result.uuid is not None
        assert result.uuid != ""
        assert result.embase_uuid == created_embase.uuid
        assert result.voie == 1
        assert result.date == date(2025, 3, 1)
        assert result.operateur == "Jean Dupont"


# ============================================================================
# GET BY UUID
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryGetByUuid:
    """Tests récupération par UUID."""

    def test_get_by_uuid_found(self, etalonnage_repository, created_embase):
        """Test récupération d'un étalonnage existant."""
        created = etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 4, 1),
                operateur="Test",
            )
        )

        result = etalonnage_repository.get_by_uuid(created.uuid)

        assert result is not None
        assert result.uuid == created.uuid
        assert result.embase_uuid == created_embase.uuid
        assert result.voie == 1

    def test_get_by_uuid_not_found(self, etalonnage_repository):
        """Test UUID inexistant retourne None."""
        result = etalonnage_repository.get_by_uuid(str(uuid.uuid4()))
        assert result is None


# ============================================================================
# GET BY EMBASE UUID
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryGetByEmbaseUuid:
    """Tests récupération par embase UUID."""

    def test_get_by_embase_uuid_returns_list(
        self, etalonnage_repository, created_embase
    ):
        """Test récupération de la liste d'étalonnages d'une embase."""
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 1, 15),
                operateur="Op1",
            )
        )
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=2,
                date=date(2025, 2, 20),
                operateur="Op2",
            )
        )

        result = etalonnage_repository.get_by_embase_uuid(created_embase.uuid)

        assert len(result) == 2

    def test_get_by_embase_uuid_empty(self, etalonnage_repository, created_embase):
        """Test retourne liste vide si aucun étalonnage."""
        result = etalonnage_repository.get_by_embase_uuid(created_embase.uuid)
        assert result == []

    def test_get_by_embase_uuid_filters_by_voie(
        self, etalonnage_repository, created_embase
    ):
        """Test filtrage par voie."""
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 1, 15),
                operateur="Op1",
            )
        )
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=2,
                date=date(2025, 2, 20),
                operateur="Op2",
            )
        )

        result = etalonnage_repository.get_by_embase_uuid(created_embase.uuid, voie=1)

        assert len(result) == 1
        assert result[0].voie == 1


# ============================================================================
# GET LATEST BY EMBASE VOIE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryGetLatest:
    """Tests récupération du dernier étalonnage par embase/voie."""

    def test_get_latest_by_embase_voie_returns_latest(
        self, etalonnage_repository, created_embase
    ):
        """Test que le dernier étalonnage (date la plus récente) est retourné."""
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 1, 1),
                operateur="Op1",
            )
        )
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 6, 15),
                operateur="Op2",
            )
        )

        result = etalonnage_repository.get_latest_by_embase_voie(
            created_embase.uuid, voie=1
        )

        assert result is not None
        assert result.date == date(2025, 6, 15)
        assert result.operateur == "Op2"

    def test_get_latest_by_embase_voie_none_when_empty(
        self, etalonnage_repository, created_embase
    ):
        """Test retourne None si aucun étalonnage pour cette voie."""
        result = etalonnage_repository.get_latest_by_embase_voie(
            created_embase.uuid, voie=1
        )
        assert result is None


# ============================================================================
# EXISTS BY EMBASE VOIE DATE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryExistsByEmbaseVoieDate:
    """Tests vérification d'existence par embase/voie/date."""

    def test_exists_by_embase_voie_date_true(
        self, etalonnage_repository, created_embase
    ):
        """Test détection d'un étalonnage existant."""
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 5, 10),
                operateur="Test",
            )
        )

        result = etalonnage_repository.exists_by_embase_voie_date(
            created_embase.uuid, voie=1, date=date(2025, 5, 10)
        )

        assert result is True

    def test_exists_by_embase_voie_date_false(
        self, etalonnage_repository, created_embase
    ):
        """Test retourne False si combinaison inexistante."""
        result = etalonnage_repository.exists_by_embase_voie_date(
            created_embase.uuid, voie=1, date=date(2025, 12, 25)
        )

        assert result is False

    def test_exists_by_embase_voie_date_different_voie(
        self, etalonnage_repository, created_embase
    ):
        """Test retourne False si même embase/date mais voie différente."""
        etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 5, 10),
                operateur="Test",
            )
        )

        result = etalonnage_repository.exists_by_embase_voie_date(
            created_embase.uuid, voie=2, date=date(2025, 5, 10)
        )

        assert result is False


# ============================================================================
# DELETE
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestEtalonnageRepositoryDelete:
    """Tests suppression d'étalonnage."""

    def test_delete_success(self, etalonnage_repository, created_embase):
        """Test suppression réussie."""
        created = etalonnage_repository.create(
            EtalonnageBean(
                embase_uuid=created_embase.uuid,
                voie=1,
                date=date(2025, 7, 1),
                operateur="Test",
            )
        )

        result = etalonnage_repository.delete(created.uuid)

        assert result is True
        # Vérifier disparition
        assert etalonnage_repository.get_by_uuid(created.uuid) is None

    def test_delete_not_found(self, etalonnage_repository):
        """Test UUID inexistant retourne False."""
        result = etalonnage_repository.delete(str(uuid.uuid4()))
        assert result is False
