"""
Tests unitaires pour le service FSEC.

Verifie la logique metier du versioning FSEC.
Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.domain.exceptions import ConflictException, NotFoundException
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.services import fsec_service
from app.domain.fsec.services.fsec_service import (
    count_all_fsecs,
    create_fsec,
    create_new_version,
    delete_fsec,
    get_active_fsec,
    get_all_active_fsecs,
    get_all_fsecs,
    get_fsec_by_version_uuid,
    get_fsec_versions,
    get_fsecs_by_campaign,
    patch_fsec,
    set_fsec_assembly_plan_annotations,
    set_fsec_assembly_plan_image,
    set_fsec_overview_image,
    update_fsec,
)


@pytest.fixture
def sample_fsec():
    """Fixture FSEC pour tests."""
    return FsecBean(
        version_uuid=str(uuid.uuid4()),
        fsec_uuid=str(uuid.uuid4()),
        campaign_id=str(uuid.uuid4()),
        status_id=0,
        category_id=0,
        rack_id=None,
        name="FSEC Test",
        comments="Test unitaire",
        is_active=True,
        delivery_date=None,
        shooting_date=None,
        preshooting_pressure=None,
        experience_srxx=None,
        localisation=None,
        depressurization_failed=None,
    )


@pytest.fixture
def mock_fsec_repository():
    """Mock du repository FSEC."""
    mock = MagicMock()
    mock.exists_by_campaign_and_name.return_value = False
    return mock


# ============================================================================
# Module-level attributes
# ============================================================================


@pytest.mark.unit
class TestModuleLevelAttributes:

    def test_logger_exists(self):
        assert fsec_service.logger is not None
        assert isinstance(fsec_service.logger, logging.Logger)


# ============================================================================
# CREATE TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceCreate:
    """Tests creation FSEC."""

    def test_create_fsec_success(self, sample_fsec, mock_fsec_repository):
        """Test creation reussie."""
        mock_fsec_repository.create.return_value = sample_fsec

        result = create_fsec(mock_fsec_repository, sample_fsec)

        assert result.name == sample_fsec.name
        assert result.is_active is True
        mock_fsec_repository.exists_by_campaign_and_name.assert_called_once_with(
            sample_fsec.campaign_id, sample_fsec.name
        )
        mock_fsec_repository.create.assert_called_once()

    def test_create_fsec_returns_created_bean(self, sample_fsec, mock_fsec_repository):
        """Verifie que c'est bien le resultat de create() qui est retourne."""
        returned_bean = FsecBean(
            version_uuid="returned-uuid",
            fsec_uuid="returned-fsec",
            name="FSEC Returned",
        )
        mock_fsec_repository.create.return_value = returned_bean
        result = create_fsec(mock_fsec_repository, sample_fsec)
        assert result is returned_bean

    def test_create_fsec_duplicate_raises_conflict(self, sample_fsec):
        """Test doublon leve ConflictException."""
        mock_repo = MagicMock()
        mock_repo.exists_by_campaign_and_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_fsec(mock_repo, sample_fsec)

        assert exc_info.value.field == "campaign_id/name"
        assert sample_fsec.campaign_id in exc_info.value.value
        assert sample_fsec.name in exc_info.value.value
        mock_repo.create.assert_not_called()

    def test_create_fsec_without_campaign_duplicate_raises_conflict(self):
        """Test ConflictException quand campaign_id est None et le nom existe deja."""
        mock_repo = MagicMock()
        fsec_bean = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=None,
            name="FSEC Duplicate",
            is_active=True,
        )
        mock_repo.exists_by_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_fsec(mock_repo, fsec_bean)

        assert exc_info.value.field == "name"
        assert exc_info.value.value == "FSEC Duplicate"
        mock_repo.exists_by_campaign_and_name.assert_not_called()
        mock_repo.create.assert_not_called()

    def test_create_fsec_without_campaign_success(self):
        """Test creation d'un FSEC sans campagne associee."""
        mock_repo = MagicMock()
        fsec_bean = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=None,
            name="FSEC Standalone",
            is_active=True,
        )
        mock_repo.exists_by_name.return_value = False
        mock_repo.create.return_value = fsec_bean

        result = create_fsec(mock_repo, fsec_bean)

        assert result.name == "FSEC Standalone"
        mock_repo.exists_by_campaign_and_name.assert_not_called()
        mock_repo.exists_by_name.assert_called_once_with("FSEC Standalone")
        mock_repo.create.assert_called_once()

    def test_create_fsec_without_campaign_empty_string(self):
        """Test que campaign_id='' est traite comme falsy (pas de check campagne)."""
        mock_repo = MagicMock()
        fsec_bean = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id="",
            name="FSEC No Camp",
            is_active=True,
        )
        mock_repo.exists_by_name.return_value = False
        mock_repo.create.return_value = fsec_bean

        result = create_fsec(mock_repo, fsec_bean)

        assert result is fsec_bean
        mock_repo.exists_by_campaign_and_name.assert_not_called()
        mock_repo.exists_by_name.assert_called_once()


# ============================================================================
# GET TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceGet:
    """Tests recuperation FSEC."""

    def test_get_by_version_uuid_success(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec

        result = get_fsec_by_version_uuid(mock_repo, sample_fsec.version_uuid)

        assert result.version_uuid == sample_fsec.version_uuid
        assert result is sample_fsec
        mock_repo.get_by_version_uuid.assert_called_once_with(sample_fsec.version_uuid)

    def test_get_by_version_uuid_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_by_version_uuid(mock_repo, fake_uuid)

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid

    def test_get_all_fsecs_with_defaults(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_all.return_value = [sample_fsec, sample_fsec]

        result = get_all_fsecs(mock_repo)

        assert len(result) == 2
        mock_repo.get_all.assert_called_once_with(limit=None, offset=0)

    def test_get_all_fsecs_with_pagination(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_all.return_value = [sample_fsec]

        result = get_all_fsecs(mock_repo, limit=10, offset=5)

        assert len(result) == 1
        mock_repo.get_all.assert_called_once_with(limit=10, offset=5)

    def test_get_all_fsecs_empty(self):
        mock_repo = MagicMock()
        mock_repo.get_all.return_value = []

        result = get_all_fsecs(mock_repo)

        assert len(result) == 0

    def test_get_all_active_fsecs(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_all_active.return_value = [sample_fsec]

        result = get_all_active_fsecs(mock_repo)

        assert len(result) == 1
        assert result[0].is_active is True
        mock_repo.get_all_active.assert_called_once()

    def test_get_fsecs_by_campaign(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_id.return_value = [sample_fsec]

        result = get_fsecs_by_campaign(mock_repo, sample_fsec.campaign_id)

        assert len(result) == 1
        mock_repo.get_by_campaign_id.assert_called_once_with(sample_fsec.campaign_id)

    def test_get_fsecs_by_campaign_empty(self):
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_id.return_value = []
        fake_campaign_id = str(uuid.uuid4())

        result = get_fsecs_by_campaign(mock_repo, fake_campaign_id)

        assert len(result) == 0


# ============================================================================
# VERSIONING TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceVersioning:
    """Tests du systeme de versioning."""

    def test_get_all_versions(self, sample_fsec):
        mock_repo = MagicMock()
        version2 = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name=sample_fsec.name,
            is_active=False,
        )
        mock_repo.get_by_fsec_uuid.return_value = [sample_fsec, version2]

        result = get_fsec_versions(mock_repo, sample_fsec.fsec_uuid)

        assert len(result) == 2
        mock_repo.get_by_fsec_uuid.assert_called_once_with(sample_fsec.fsec_uuid)

    def test_get_active_version(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_active_by_fsec_uuid.return_value = sample_fsec

        result = get_active_fsec(mock_repo, sample_fsec.fsec_uuid)

        assert result.is_active is True
        assert result is sample_fsec
        mock_repo.get_active_by_fsec_uuid.assert_called_once_with(sample_fsec.fsec_uuid)

    def test_get_active_version_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_active_by_fsec_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_active_fsec(mock_repo, fake_uuid)

        assert exc_info.value.resource == "FSEC (active)"
        assert exc_info.value.identifier == fake_uuid

    def test_create_new_version_calls_atomic(self, sample_fsec):
        fsec_uuid = sample_fsec.fsec_uuid
        new_version = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name=sample_fsec.name,
            is_active=True,
        )

        mock_repo = MagicMock()
        mock_repo.create_version_atomic.return_value = new_version

        result = create_new_version(mock_repo, fsec_uuid, new_version)

        assert result.is_active is True
        assert result.fsec_uuid == fsec_uuid
        assert result is new_version
        mock_repo.create_version_atomic.assert_called_once_with(fsec_uuid, new_version)


# ============================================================================
# UPDATE TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceUpdate:
    """Tests mise a jour FSEC."""

    def test_update_fsec_success_no_name_change(self, sample_fsec):
        """Test update sans changement de nom (pas de check doublon)."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec

        updated_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            status_id=1,
            name=sample_fsec.name,  # meme nom
            is_active=True,
        )
        mock_repo.update.return_value = updated_bean

        result = update_fsec(mock_repo, updated_bean)

        assert result.status_id == 1
        mock_repo.update.assert_called_once_with(updated_bean)
        mock_repo.exists_by_campaign_and_name.assert_not_called()

    def test_update_fsec_name_changed_with_campaign_checks_duplicate(self, sample_fsec):
        """Test que changer le nom avec campagne declenche le check doublon."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.exists_by_campaign_and_name.return_value = False

        updated_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name="Nouveau Nom",
            is_active=True,
        )
        mock_repo.update.return_value = updated_bean

        result = update_fsec(mock_repo, updated_bean)

        assert result.name == "Nouveau Nom"
        mock_repo.exists_by_campaign_and_name.assert_called_once_with(
            sample_fsec.campaign_id, "Nouveau Nom"
        )

    def test_update_fsec_campaign_changed_checks_duplicate(self, sample_fsec):
        """Test que changer la campagne declenche le check doublon."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.exists_by_campaign_and_name.return_value = False
        new_campaign_id = str(uuid.uuid4())

        updated_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=new_campaign_id,
            name=sample_fsec.name,
            is_active=True,
        )
        mock_repo.update.return_value = updated_bean

        result = update_fsec(mock_repo, updated_bean)

        assert result is updated_bean
        mock_repo.exists_by_campaign_and_name.assert_called_once_with(
            new_campaign_id, sample_fsec.name
        )

    def test_update_fsec_name_changed_duplicate_raises_conflict(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.exists_by_campaign_and_name.return_value = True

        updated_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name="Doublon",
            is_active=True,
        )

        with pytest.raises(ConflictException) as exc_info:
            update_fsec(mock_repo, updated_bean)

        assert exc_info.value.field == "campaign_id/name"
        mock_repo.update.assert_not_called()

    def test_update_fsec_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = None
        fake_bean = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            name="Inexistant",
            is_active=True,
        )

        with pytest.raises(NotFoundException) as exc_info:
            update_fsec(mock_repo, fake_bean)

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_bean.version_uuid
        mock_repo.update.assert_not_called()

    def test_update_fsec_name_changed_no_campaign_skips_check(self):
        """Test que name change mais campaign_id=None ne check pas les doublons."""
        mock_repo = MagicMock()
        existing = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=None,
            name="Ancien Nom",
            is_active=True,
        )
        updated_bean = FsecBean(
            version_uuid=existing.version_uuid,
            fsec_uuid=existing.fsec_uuid,
            campaign_id=None,
            name="Nouveau Nom",
            is_active=True,
        )
        mock_repo.get_by_version_uuid.return_value = existing
        mock_repo.update.return_value = updated_bean

        result = update_fsec(mock_repo, updated_bean)

        assert result.name == "Nouveau Nom"
        mock_repo.exists_by_campaign_and_name.assert_not_called()
        mock_repo.update.assert_called_once_with(updated_bean)

    def test_update_fsec_returns_repo_result(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        returned = FsecBean(name="Result")
        mock_repo.update.return_value = returned

        updated_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name=sample_fsec.name,
            is_active=True,
        )

        result = update_fsec(mock_repo, updated_bean)
        assert result is returned


# ============================================================================
# DELETE TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceDelete:
    """Tests suppression FSEC."""

    def test_delete_fsec_success(self, sample_fsec):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_fsec(mock_repo, sample_fsec.version_uuid)

        assert result is True
        mock_repo.delete.assert_called_once_with(sample_fsec.version_uuid)

    def test_delete_fsec_not_found(self):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            delete_fsec(mock_repo, fake_uuid)

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid

    def test_delete_fsec_by_correct_uuid(self):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True
        version_uuid = str(uuid.uuid4())

        delete_fsec(mock_repo, version_uuid)

        mock_repo.delete.assert_called_once_with(version_uuid)


# ============================================================================
# OVERVIEW IMAGE TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceOverviewImage:
    """Tests upload/suppression de la photo de vue d'ensemble."""

    def test_set_overview_image_delegates_to_repo(self, sample_fsec):
        mock_repo = MagicMock()
        updated = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            overview_image="/media/fsec/overview/test.jpg",
        )
        mock_repo.set_overview_image.return_value = updated
        fake_file = MagicMock(name="UploadedFile")

        result = set_fsec_overview_image(mock_repo, sample_fsec.version_uuid, fake_file)

        mock_repo.set_overview_image.assert_called_once_with(
            sample_fsec.version_uuid, fake_file
        )
        assert result is updated
        assert result.overview_image == "/media/fsec/overview/test.jpg"

    def test_set_overview_image_to_none_clears(self, sample_fsec):
        mock_repo = MagicMock()
        cleared = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            overview_image=None,
        )
        mock_repo.set_overview_image.return_value = cleared

        result = set_fsec_overview_image(mock_repo, sample_fsec.version_uuid, None)

        mock_repo.set_overview_image.assert_called_once_with(
            sample_fsec.version_uuid, None
        )
        assert result.overview_image is None

    def test_set_overview_image_404_when_repo_returns_none(self):
        mock_repo = MagicMock()
        mock_repo.set_overview_image.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            set_fsec_overview_image(mock_repo, fake_uuid, MagicMock())

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid


# ============================================================================
# ASSEMBLY PLAN TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceAssemblyPlan:
    """Tests upload/suppression du plan d'assemblage et de son calque."""

    def test_set_assembly_plan_image_delegates_to_repo(self, sample_fsec):
        mock_repo = MagicMock()
        updated = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            assembly_plan_image="/media/fsec/assembly-plan/plan.png",
        )
        mock_repo.set_assembly_plan_image.return_value = updated
        fake_file = MagicMock(name="UploadedFile")

        result = set_fsec_assembly_plan_image(
            mock_repo, sample_fsec.version_uuid, fake_file
        )

        mock_repo.set_assembly_plan_image.assert_called_once_with(
            sample_fsec.version_uuid, fake_file
        )
        assert result is updated
        assert result.assembly_plan_image == "/media/fsec/assembly-plan/plan.png"

    def test_set_assembly_plan_image_to_none_clears(self, sample_fsec):
        mock_repo = MagicMock()
        cleared = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            assembly_plan_image=None,
            assembly_plan_annotations=[],
        )
        mock_repo.set_assembly_plan_image.return_value = cleared

        result = set_fsec_assembly_plan_image(mock_repo, sample_fsec.version_uuid, None)

        mock_repo.set_assembly_plan_image.assert_called_once_with(
            sample_fsec.version_uuid, None
        )
        assert result.assembly_plan_image is None
        assert result.assembly_plan_annotations == []

    def test_set_assembly_plan_image_404_when_repo_returns_none(self):
        mock_repo = MagicMock()
        mock_repo.set_assembly_plan_image.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            set_fsec_assembly_plan_image(mock_repo, fake_uuid, MagicMock())

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid

    def test_set_assembly_plan_annotations_delegates_to_repo(self, sample_fsec):
        mock_repo = MagicMock()
        annotations = [
            {"id": "a1", "type": "arrow", "x1": 0, "y1": 0, "x2": 1, "y2": 1}
        ]
        updated = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            assembly_plan_annotations=annotations,
        )
        mock_repo.set_assembly_plan_annotations.return_value = updated

        result = set_fsec_assembly_plan_annotations(
            mock_repo, sample_fsec.version_uuid, annotations
        )

        mock_repo.set_assembly_plan_annotations.assert_called_once_with(
            sample_fsec.version_uuid, annotations
        )
        assert result.assembly_plan_annotations == annotations

    def test_set_assembly_plan_annotations_404_when_repo_returns_none(self):
        mock_repo = MagicMock()
        mock_repo.set_assembly_plan_annotations.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            set_fsec_assembly_plan_annotations(mock_repo, fake_uuid, [])

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid

    def test_set_assembly_plan_annotations_handles_none_count_in_log(self, sample_fsec):
        """`annotations=None` ne casse pas le log (len sur None protégé)."""
        mock_repo = MagicMock()
        mock_repo.set_assembly_plan_annotations.return_value = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            name=sample_fsec.name,
            assembly_plan_annotations=[],
        )

        result = set_fsec_assembly_plan_annotations(
            mock_repo, sample_fsec.version_uuid, None
        )

        assert result.assembly_plan_annotations == []


# ============================================================================
# PATCH TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServicePatch:
    """Tests mise a jour partielle (PATCH) FSEC."""

    def test_patch_fsec_success(self, sample_fsec, mock_fsec_repository):
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        updated_fsec = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            status_id=2,
            name=sample_fsec.name,
            comments="Commentaire patche",
            is_active=True,
        )
        mock_fsec_repository.update.return_value = updated_fsec

        result = patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {"status_id": 2, "comments": "Commentaire patche"},
        )

        assert result.status_id == 2
        assert result.comments == "Commentaire patche"
        mock_fsec_repository.get_by_version_uuid.assert_called_once_with(
            sample_fsec.version_uuid
        )
        mock_fsec_repository.update.assert_called_once()

    def test_patch_fsec_not_found(self, mock_fsec_repository):
        mock_fsec_repository.get_by_version_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            patch_fsec(mock_fsec_repository, fake_uuid, {"status_id": 1})

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == fake_uuid
        mock_fsec_repository.update.assert_not_called()

    def test_patch_fsec_protected_fields_ignored(
        self, sample_fsec, mock_fsec_repository
    ):
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.update.return_value = sample_fsec

        original_version_uuid = sample_fsec.version_uuid
        original_fsec_uuid = sample_fsec.fsec_uuid
        original_is_active = sample_fsec.is_active

        patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {
                "version_uuid": str(uuid.uuid4()),
                "fsec_uuid": str(uuid.uuid4()),
                "created_at": "2020-01-01",
                "last_updated": "2020-01-01",
                "is_active": False,
                "comments": "Modifie",
            },
        )

        updated_bean = mock_fsec_repository.update.call_args[0][0]
        assert updated_bean.version_uuid == original_version_uuid
        assert updated_bean.fsec_uuid == original_fsec_uuid
        assert updated_bean.is_active == original_is_active
        assert updated_bean.comments == "Modifie"

    def test_patch_each_protected_field_separately(
        self, sample_fsec, mock_fsec_repository
    ):
        """Verifie que chaque champ protege est bien ignore individuellement."""
        protected_fields = {
            "version_uuid": str(uuid.uuid4()),
            "fsec_uuid": str(uuid.uuid4()),
            "created_at": "2020-01-01",
            "last_updated": "2020-01-01",
            "is_active": not sample_fsec.is_active,
        }
        for field_name, new_value in protected_fields.items():
            mock_fsec_repository.get_by_version_uuid.return_value = FsecBean(
                version_uuid=sample_fsec.version_uuid,
                fsec_uuid=sample_fsec.fsec_uuid,
                campaign_id=sample_fsec.campaign_id,
                name=sample_fsec.name,
                is_active=sample_fsec.is_active,
            )
            mock_fsec_repository.update.return_value = sample_fsec

            patch_fsec(
                mock_fsec_repository,
                sample_fsec.version_uuid,
                {field_name: new_value},
            )

            updated_bean = mock_fsec_repository.update.call_args[0][0]
            assert getattr(updated_bean, field_name) != new_value or field_name in (
                "created_at",
                "last_updated",
            )

    def test_patch_non_existent_field_ignored(self, sample_fsec, mock_fsec_repository):
        """Fields that don't exist on the bean are simply skipped."""
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.update.return_value = sample_fsec

        patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {"nonexistent_field": "value"},
        )

        mock_fsec_repository.update.assert_called_once()

    def test_patch_fsec_name_changed_no_campaign(self):
        mock_repo = MagicMock()
        existing = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=None,
            name="Ancien Nom",
            is_active=True,
        )
        mock_repo.get_by_version_uuid.return_value = existing
        mock_repo.update.return_value = existing

        patch_fsec(mock_repo, existing.version_uuid, {"name": "Nouveau Nom"})

        mock_repo.exists_by_campaign_and_name.assert_not_called()
        mock_repo.update.assert_called_once()

    def test_patch_fsec_conflict_after_merge(self, sample_fsec, mock_fsec_repository):
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.exists_by_campaign_and_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_fsec(
                mock_fsec_repository,
                sample_fsec.version_uuid,
                {"name": "Nom Duplique"},
            )

        assert exc_info.value.field == "campaign_id/name"
        mock_fsec_repository.update.assert_not_called()

    def test_patch_campaign_changed_checks_duplicate(
        self, sample_fsec, mock_fsec_repository
    ):
        """Changing campaign_id via patch triggers duplicate check."""
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        new_campaign = str(uuid.uuid4())
        mock_fsec_repository.exists_by_campaign_and_name.return_value = False
        mock_fsec_repository.update.return_value = sample_fsec

        patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {"campaign_id": new_campaign},
        )

        mock_fsec_repository.exists_by_campaign_and_name.assert_called_once()

    def test_patch_sets_attribute_on_existing_bean(
        self, sample_fsec, mock_fsec_repository
    ):
        """Verify that patch mutates the existing bean and passes it to update."""
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.update.return_value = sample_fsec

        patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {"status_id": 5, "comments": "Updated via patch"},
        )

        updated_bean = mock_fsec_repository.update.call_args[0][0]
        assert updated_bean.status_id == 5
        assert updated_bean.comments == "Updated via patch"
        assert updated_bean is sample_fsec  # mutated in-place


# ============================================================================
# REQUESTED VIEWS (R08) TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceRequestedViews:
    """Vues demandées (R08) : PATCH dédié écrit le champ, PUT global le préserve."""

    def test_patch_fsec_writes_requested_views(self, sample_fsec, mock_fsec_repository):
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.update.return_value = sample_fsec

        patch_fsec(
            mock_fsec_repository,
            sample_fsec.version_uuid,
            {"requested_views": "Vue de face\nZoom sur le joint"},
        )

        updated_bean = mock_fsec_repository.update.call_args[0][0]
        assert updated_bean.requested_views == "Vue de face\nZoom sur le joint"
        # Aucun autre champ n'est touché par le PATCH ciblé.
        assert updated_bean.name == sample_fsec.name
        assert updated_bean.status_id == sample_fsec.status_id

    def test_patch_fsec_clears_requested_views_with_none(
        self, sample_fsec, mock_fsec_repository
    ):
        sample_fsec.requested_views = "Ancienne consigne"
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.update.return_value = sample_fsec

        patch_fsec(
            mock_fsec_repository, sample_fsec.version_uuid, {"requested_views": None}
        )

        updated_bean = mock_fsec_repository.update.call_args[0][0]
        assert updated_bean.requested_views is None

    def test_update_fsec_preserves_requested_views_when_absent(self, sample_fsec):
        """Un PUT partiel (bean sans requested_views) ne doit JAMAIS effacer la valeur."""
        sample_fsec.requested_views = "Vue de dessus à conserver"
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.update.side_effect = lambda bean: bean

        put_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            status_id=2,
            name=sample_fsec.name,
            is_active=True,
        )
        assert put_bean.requested_views is None

        result = update_fsec(mock_repo, put_bean)

        sent_bean = mock_repo.update.call_args[0][0]
        assert sent_bean.requested_views == "Vue de dessus à conserver"
        assert result.requested_views == "Vue de dessus à conserver"
        assert result.status_id == 2

    def test_update_fsec_ignores_requested_views_from_put_payload(self, sample_fsec):
        """Même si un PUT porte une valeur, c'est l'existant qui prime (PATCH seul)."""
        sample_fsec.requested_views = None
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.update.side_effect = lambda bean: bean

        put_bean = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name=sample_fsec.name,
            is_active=True,
            requested_views="Injection via PUT",
        )

        update_fsec(mock_repo, put_bean)

        sent_bean = mock_repo.update.call_args[0][0]
        assert sent_bean.requested_views is None


# ============================================================================
# COUNT TESTS
# ============================================================================


@pytest.mark.unit
class TestFsecServiceCount:
    """Tests comptage FSEC."""

    def test_count_all_fsecs(self):
        mock_repo = MagicMock()
        mock_repo.count_all.return_value = 42

        result = count_all_fsecs(mock_repo)

        assert result == 42
        mock_repo.count_all.assert_called_once()

    def test_count_all_fsecs_zero(self):
        mock_repo = MagicMock()
        mock_repo.count_all.return_value = 0

        result = count_all_fsecs(mock_repo)

        assert result == 0


# ============================================================================
# MUTATION-KILLING TESTS - Logger messages & Exception strings
# ============================================================================


@pytest.mark.unit
class TestFsecLoggerMessages:
    """Tests Pattern B: tuer les mutants qui modifient les messages de log."""

    def test_create_logs_created_message(self, sample_fsec, mock_fsec_repository):
        """Test que create_fsec log 'Created FSEC'."""
        mock_fsec_repository.create.return_value = sample_fsec

        with patch("app.domain.fsec.services.fsec_service.logger") as mock_logger:
            create_fsec(mock_fsec_repository, sample_fsec)

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Created FSEC" in log_msg
            assert sample_fsec.name in log_msg

    def test_update_logs_updated_message(self, sample_fsec):
        """Test que update_fsec log 'Updated FSEC'."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.update.return_value = sample_fsec

        with patch("app.domain.fsec.services.fsec_service.logger") as mock_logger:
            update_fsec(
                mock_repo,
                FsecBean(
                    version_uuid=sample_fsec.version_uuid,
                    fsec_uuid=sample_fsec.fsec_uuid,
                    campaign_id=sample_fsec.campaign_id,
                    name=sample_fsec.name,
                    is_active=True,
                ),
            )

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Updated FSEC" in log_msg
            assert sample_fsec.version_uuid in log_msg

    def test_delete_logs_deleted_message(self):
        """Test que delete_fsec log 'Deleted FSEC'."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True
        version_uuid = str(uuid.uuid4())

        with patch("app.domain.fsec.services.fsec_service.logger") as mock_logger:
            delete_fsec(mock_repo, version_uuid)

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Deleted FSEC" in log_msg
            assert version_uuid in log_msg

    def test_create_new_version_logs_message(self, sample_fsec):
        """Test que create_new_version log 'Created new version'."""
        mock_repo = MagicMock()
        mock_repo.create_version_atomic.return_value = sample_fsec

        with patch("app.domain.fsec.services.fsec_service.logger") as mock_logger:
            create_new_version(mock_repo, sample_fsec.fsec_uuid, sample_fsec)

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Created new version" in log_msg
            assert sample_fsec.fsec_uuid in log_msg


@pytest.mark.unit
class TestFsecExceptionValueStrings:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'exception."""

    def test_create_conflict_value_contains_campaign_and_name(self, sample_fsec):
        """Test que ConflictException.value contient campaign_id et name."""
        mock_repo = MagicMock()
        mock_repo.exists_by_campaign_and_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_fsec(mock_repo, sample_fsec)

        assert sample_fsec.campaign_id in exc_info.value.value
        assert sample_fsec.name in exc_info.value.value

    def test_create_without_campaign_conflict_value_is_name(self):
        """Test que ConflictException.value est le nom quand pas de campagne."""
        mock_repo = MagicMock()
        fsec = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=None,
            name="Dup Name",
            is_active=True,
        )
        mock_repo.exists_by_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_fsec(mock_repo, fsec)

        assert exc_info.value.value == "Dup Name"
        assert exc_info.value.field == "name"

    def test_get_not_found_identifier_contains_uuid(self):
        """Test que NotFoundException.identifier est le UUID passé."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = None
        test_uuid = "specific-uuid-123"

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_by_version_uuid(mock_repo, test_uuid)

        assert exc_info.value.identifier == test_uuid
        assert "FSEC" in str(exc_info.value)

    def test_update_conflict_value_contains_campaign_and_name(self, sample_fsec):
        """Test que ConflictException de update contient campaign_id/name."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = sample_fsec
        mock_repo.exists_by_campaign_and_name.return_value = True
        updated = FsecBean(
            version_uuid=sample_fsec.version_uuid,
            fsec_uuid=sample_fsec.fsec_uuid,
            campaign_id=sample_fsec.campaign_id,
            name="Doublon",
            is_active=True,
        )

        with pytest.raises(ConflictException) as exc_info:
            update_fsec(mock_repo, updated)

        assert sample_fsec.campaign_id in exc_info.value.value
        assert "Doublon" in exc_info.value.value

    def test_patch_conflict_value_contains_merged_values(
        self, sample_fsec, mock_fsec_repository
    ):
        """Test que ConflictException de patch contient les valeurs fusionnées."""
        mock_fsec_repository.get_by_version_uuid.return_value = sample_fsec
        mock_fsec_repository.exists_by_campaign_and_name.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_fsec(
                mock_fsec_repository,
                sample_fsec.version_uuid,
                {"name": "PatchedName"},
            )

        assert "PatchedName" in exc_info.value.value
        assert sample_fsec.campaign_id in exc_info.value.value

    def test_get_active_not_found_resource_name(self):
        """Test que NotFoundException de get_active contient 'FSEC (active)'."""
        mock_repo = MagicMock()
        mock_repo.get_active_by_fsec_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_active_fsec(mock_repo, "test-uuid")

        assert "FSEC (active)" in str(exc_info.value)

    def test_delete_not_found_identifier_contains_uuid(self):
        """Test que NotFoundException de delete contient le UUID."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False
        test_uuid = "del-specific-uuid"

        with pytest.raises(NotFoundException) as exc_info:
            delete_fsec(mock_repo, test_uuid)

        assert exc_info.value.identifier == test_uuid
        assert exc_info.value.resource == "FSEC"

    def test_update_not_found_identifier_is_version_uuid(self):
        """Test que NotFoundException de update contient le version_uuid."""
        mock_repo = MagicMock()
        mock_repo.get_by_version_uuid.return_value = None
        bean = FsecBean(
            version_uuid="miss-v-uuid", fsec_uuid="f", name="X", is_active=True
        )

        with pytest.raises(NotFoundException) as exc_info:
            update_fsec(mock_repo, bean)

        assert exc_info.value.identifier == "miss-v-uuid"

    def test_patch_not_found_identifier_is_version_uuid(self, mock_fsec_repository):
        """Test que NotFoundException de patch contient le version_uuid."""
        mock_fsec_repository.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            patch_fsec(mock_fsec_repository, "miss-p-uuid", {"name": "X"})

        assert exc_info.value.identifier == "miss-p-uuid"
