"""
Tests unitaires pour le service FsecDocuments.

Ces tests vérifient la logique métier pure sans dépendance à la BD.
Utilise des mocks pour isoler le service des repositories.
Objectif: tuer les mutants de mutation testing (logger, exception messages, and/or inversions).
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.exceptions import NotFoundException
from app.domain.fsec.models.fsec_documents_bean import FsecDocumentsBean
from app.domain.fsec.services import fsec_documents_service
from app.domain.fsec.services.fsec_documents_service import (
    create_fsec_document,
    delete_fsec_document,
    get_fsec_document_by_uuid,
    get_fsec_documents,
    update_fsec_document,
)


@pytest.fixture
def sample_fsec_document_bean(sample_fsec_version_uuid):
    """Bean FsecDocuments de test."""
    return FsecDocumentsBean(
        uuid=str(uuid.uuid4()),
        fsec_id=sample_fsec_version_uuid,
        subtype_id=0,
        name="Document FSEC Test",
        path="/path/to/fsec_document.pdf",
        date=date(2025, 3, 15),
    )


@pytest.fixture
def mock_fsec_documents_repository():
    """Mock du repository FsecDocuments."""
    return MagicMock()


class TestFsecDocumentsServiceCreate:
    """Tests pour la création de document FSEC."""

    @pytest.mark.unit
    def test_create_fsec_document_success(
        self, sample_fsec_document_bean, mock_fsec_documents_repository
    ):
        """Test création réussie d'un document FSEC."""
        mock_fsec_documents_repository.create.return_value = sample_fsec_document_bean

        result = create_fsec_document(
            mock_fsec_documents_repository, sample_fsec_document_bean
        )

        assert result.uuid == sample_fsec_document_bean.uuid
        assert result.name == sample_fsec_document_bean.name
        assert result.fsec_id == sample_fsec_document_bean.fsec_id
        mock_fsec_documents_repository.create.assert_called_once_with(
            sample_fsec_document_bean
        )

    @pytest.mark.unit
    def test_create_fsec_document_with_parent_validation_success(
        self, sample_fsec_document_bean, mock_fsec_documents_repository
    ):
        """Test création réussie avec validation du parent FSEC existant."""
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = MagicMock()  # parent existe
        mock_fsec_documents_repository.create.return_value = sample_fsec_document_bean

        result = create_fsec_document(
            mock_fsec_documents_repository,
            sample_fsec_document_bean,
            fsec_repository=mock_fsec_repo,
        )

        assert result.uuid == sample_fsec_document_bean.uuid
        mock_fsec_repo.get_by_version_uuid.assert_called_once_with(
            sample_fsec_document_bean.fsec_id
        )
        mock_fsec_documents_repository.create.assert_called_once_with(
            sample_fsec_document_bean
        )

    @pytest.mark.unit
    def test_create_fsec_document_parent_not_found(
        self, sample_fsec_document_bean, mock_fsec_documents_repository
    ):
        """Test NotFoundException quand le FSEC parent n'existe pas."""
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = None  # parent absent

        with pytest.raises(NotFoundException) as exc_info:
            create_fsec_document(
                mock_fsec_documents_repository,
                sample_fsec_document_bean,
                fsec_repository=mock_fsec_repo,
            )

        assert "FSEC" in str(exc_info.value)
        assert sample_fsec_document_bean.fsec_id in str(exc_info.value)
        mock_fsec_documents_repository.create.assert_not_called()


class TestFsecDocumentsServiceGet:
    """Tests pour la récupération de document FSEC."""

    @pytest.mark.unit
    def test_get_fsec_document_by_uuid_success(
        self, sample_fsec_document_bean, mock_fsec_documents_repository
    ):
        """Test récupération réussie par UUID."""
        mock_fsec_documents_repository.get_by_uuid.return_value = (
            sample_fsec_document_bean
        )

        result = get_fsec_document_by_uuid(
            mock_fsec_documents_repository, sample_fsec_document_bean.uuid
        )

        assert result.uuid == sample_fsec_document_bean.uuid
        mock_fsec_documents_repository.get_by_uuid.assert_called_once_with(
            sample_fsec_document_bean.uuid
        )

    @pytest.mark.unit
    def test_get_fsec_document_by_uuid_not_found(self, mock_fsec_documents_repository):
        """Test qu'un UUID inexistant lève NotFoundException."""
        mock_fsec_documents_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_document_by_uuid(mock_fsec_documents_repository, fake_uuid)

        assert fake_uuid in str(exc_info.value)
        assert "FsecDocument" in str(exc_info.value)

    @pytest.mark.unit
    def test_get_fsec_documents_by_fsec_id(
        self,
        sample_fsec_document_bean,
        sample_fsec_version_uuid,
        mock_fsec_documents_repository,
    ):
        """Test récupération de tous les documents d'un FSEC."""
        mock_fsec_documents_repository.get_by_fsec_id.return_value = [
            sample_fsec_document_bean,
            sample_fsec_document_bean,
        ]

        result = get_fsec_documents(
            mock_fsec_documents_repository, sample_fsec_version_uuid
        )

        assert len(result) == 2
        mock_fsec_documents_repository.get_by_fsec_id.assert_called_once_with(
            sample_fsec_version_uuid
        )

    @pytest.mark.unit
    def test_get_fsec_documents_empty(self, mock_fsec_documents_repository):
        """Test récupération quand aucun document n'existe."""
        mock_fsec_documents_repository.get_by_fsec_id.return_value = []
        fake_uuid = str(uuid.uuid4())

        result = get_fsec_documents(mock_fsec_documents_repository, fake_uuid)

        assert len(result) == 0


class TestFsecDocumentsServiceUpdate:
    """Tests pour la mise à jour de document FSEC."""

    @pytest.mark.unit
    def test_update_fsec_document_success(
        self, sample_fsec_document_bean, mock_fsec_documents_repository
    ):
        """Test mise à jour réussie."""
        mock_fsec_documents_repository.get_by_uuid.return_value = (
            sample_fsec_document_bean
        )
        updated_bean = FsecDocumentsBean(
            uuid=sample_fsec_document_bean.uuid,
            fsec_id=sample_fsec_document_bean.fsec_id,
            subtype_id=2,
            name="Document FSEC Modifié",
            path="/path/to/updated_fsec_document.pdf",
            date=date(2025, 4, 15),
        )
        mock_fsec_documents_repository.update.return_value = updated_bean

        result = update_fsec_document(mock_fsec_documents_repository, updated_bean)

        assert result.name == "Document FSEC Modifié"
        assert result.subtype_id == 2
        mock_fsec_documents_repository.update.assert_called_once_with(updated_bean)

    @pytest.mark.unit
    def test_update_fsec_document_not_found(self, mock_fsec_documents_repository):
        """Test que la mise à jour d'un document inexistant lève NotFoundException."""
        mock_fsec_documents_repository.get_by_uuid.return_value = None
        fake_bean = FsecDocumentsBean(
            uuid=str(uuid.uuid4()),
            fsec_id=str(uuid.uuid4()),
            subtype_id=0,
            name="Inexistant",
            path="/path/to/missing.pdf",
            date=None,
        )

        with pytest.raises(NotFoundException):
            update_fsec_document(mock_fsec_documents_repository, fake_bean)

        mock_fsec_documents_repository.update.assert_not_called()


class TestFsecDocumentsServiceDelete:
    """Tests pour la suppression de document FSEC."""

    @pytest.mark.unit
    def test_delete_fsec_document_success(self, mock_fsec_documents_repository):
        """Test suppression réussie."""
        mock_fsec_documents_repository.delete.return_value = True
        doc_uuid = str(uuid.uuid4())

        result = delete_fsec_document(mock_fsec_documents_repository, doc_uuid)

        assert result is True
        mock_fsec_documents_repository.delete.assert_called_once_with(doc_uuid)

    @pytest.mark.unit
    def test_delete_fsec_document_not_found(self, mock_fsec_documents_repository):
        """Test que la suppression d'un document inexistant lève NotFoundException."""
        mock_fsec_documents_repository.delete.return_value = False
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            delete_fsec_document(mock_fsec_documents_repository, fake_uuid)


# ============================================================================
# MUTATION-KILLING TESTS
# ============================================================================


class TestFsecDocumentsModuleLogger:
    """Tests pour le logger du module."""

    @pytest.mark.unit
    def test_logger_exists(self):
        """Vérifie que le logger du module est défini."""
        assert fsec_documents_service.logger is not None

    @pytest.mark.unit
    def test_logger_name(self):
        """Vérifie que le logger porte le bon nom de module."""
        assert (
            fsec_documents_service.logger.name
            == "app.domain.fsec.services.fsec_documents_service"
        )


class TestCreateFsecDocumentAndOrMutants:
    """Tests Pattern A: and->or mutant killers pour create_fsec_document."""

    @pytest.mark.unit
    def test_create_with_none_repository_skips_parent_check(self):
        """Pattern A: fsec_repository=None + bean.fsec_id set.
        With 'and', skips. With 'or' mutant, calls None.get_by_version_uuid() => crash.
        """
        bean = FsecDocumentsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="some-fsec-uuid",
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean

        result = create_fsec_document(mock_repo, bean, fsec_repository=None)

        assert result is bean
        mock_repo.create.assert_called_once()

    @pytest.mark.unit
    def test_create_with_repo_but_no_fsec_id_skips_parent_check(self):
        """Pattern A (second operand): fsec_repository set but bean.fsec_id empty.
        With 'and', skips. With 'or' mutant, enters the block."""
        bean = FsecDocumentsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="",  # falsy
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_fsec_repo = MagicMock()

        result = create_fsec_document(mock_repo, bean, fsec_repository=mock_fsec_repo)

        assert result is bean
        mock_fsec_repo.get_by_version_uuid.assert_not_called()


class TestFsecDocumentsExceptionMessages:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'exception."""

    @pytest.mark.unit
    def test_create_parent_not_found_resource(self):
        """Test que NotFoundException de create contient resource='FSEC'."""
        bean = FsecDocumentsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="parent-fsec-uuid",
            name="Doc",
            path="/p",
        )
        mock_repo = MagicMock()
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_fsec_document(mock_repo, bean, fsec_repository=mock_fsec_repo)

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == "parent-fsec-uuid"

    @pytest.mark.unit
    def test_get_not_found_resource(self):
        """Test que NotFoundException de get contient resource='FsecDocument'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_document_by_uuid(mock_repo, "missing-uuid")

        assert exc_info.value.resource == "FsecDocument"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_update_not_found_resource(self):
        """Test que NotFoundException de update contient resource='FsecDocument'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        bean = FsecDocumentsBean(uuid="upd-miss", fsec_id="f", name="X", path="/x")

        with pytest.raises(NotFoundException) as exc_info:
            update_fsec_document(mock_repo, bean)

        assert exc_info.value.resource == "FsecDocument"
        assert exc_info.value.identifier == "upd-miss"

    @pytest.mark.unit
    def test_delete_not_found_resource(self):
        """Test que NotFoundException de delete contient resource='FsecDocument'."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_fsec_document(mock_repo, "del-miss")

        assert exc_info.value.resource == "FsecDocument"
        assert exc_info.value.identifier == "del-miss"


class TestFsecDocumentsReturnValues:
    """Tests vérifiant les valeurs de retour."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self):
        """Test que create retourne le bean du repository."""
        bean = FsecDocumentsBean(uuid="in", fsec_id="f", name="Doc", path="/p")
        returned = FsecDocumentsBean(uuid="out", fsec_id="f", name="Doc", path="/p")
        mock_repo = MagicMock()
        mock_repo.create.return_value = returned

        result = create_fsec_document(mock_repo, bean)

        assert result is returned

    @pytest.mark.unit
    def test_update_returns_repository_result(self):
        """Test que update retourne le bean du repository."""
        existing = FsecDocumentsBean(uuid="e", fsec_id="f", name="Old", path="/p")
        returned = FsecDocumentsBean(uuid="e", fsec_id="f", name="New", path="/p")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = returned

        result = update_fsec_document(mock_repo, existing)

        assert result is returned

    @pytest.mark.unit
    def test_get_documents_returns_repository_result(self):
        """Test que get_fsec_documents retourne la liste du repository."""
        expected = [MagicMock(), MagicMock()]
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_id.return_value = expected

        result = get_fsec_documents(mock_repo, "fsec-id")

        assert result is expected

    @pytest.mark.unit
    def test_delete_returns_true(self):
        """Test que delete retourne True en cas de succès."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_fsec_document(mock_repo, "uuid")

        assert result is True
