"""
Tests unitaires pour le service CampaignDocuments.

Ces tests vérifient la logique métier pure sans dépendance à la BD.
Utilise des mocks pour isoler le service des repositories.
"""

import uuid
from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.domain.campaign.services import campaign_documents_service
from app.domain.campaign.services.campaign_documents_service import (
    create_campaign_document,
    delete_campaign_document,
    get_campaign_document_by_uuid,
    get_campaign_documents,
    update_campaign_document,
)
from app.domain.exceptions import ConflictException, NotFoundException


@pytest.fixture
def sample_campaign_document_bean(sample_campaign_uuid):
    """Bean CampaignDocuments de test."""
    return CampaignDocumentsBean(
        uuid=str(uuid.uuid4()),
        campaign_uuid=sample_campaign_uuid,
        subtype_id=0,
        file_type_id=1,
        name="Document Test",
        path="/path/to/document.pdf",
        date=date(2025, 3, 1),
    )


@pytest.fixture
def mock_campaign_documents_repository():
    """Mock du repository CampaignDocuments."""
    return MagicMock()


class TestCampaignDocumentsServiceCreate:
    """Tests pour la création de document de campagne."""

    @pytest.mark.unit
    def test_create_campaign_document_success(
        self, sample_campaign_document_bean, mock_campaign_documents_repository
    ):
        """Test création réussie d'un document de campagne."""
        mock_campaign_documents_repository.create.return_value = (
            sample_campaign_document_bean
        )
        mock_campaign_documents_repository.get_by_campaign_uuid.return_value = []
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = MagicMock()

        result = create_campaign_document(
            mock_campaign_documents_repository,
            sample_campaign_document_bean,
            campaign_repository=mock_campaign_repo,
        )

        assert result.uuid == sample_campaign_document_bean.uuid
        assert result.name == sample_campaign_document_bean.name
        assert result.campaign_uuid == sample_campaign_document_bean.campaign_uuid
        mock_campaign_documents_repository.create.assert_called_once_with(
            sample_campaign_document_bean
        )

    @pytest.mark.unit
    def test_create_document_parent_not_found(
        self, sample_campaign_document_bean, mock_campaign_documents_repository
    ):
        """Test que la création avec campagne parente inexistante lève NotFoundException."""
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_campaign_document(
                mock_campaign_documents_repository,
                sample_campaign_document_bean,
                campaign_repository=mock_campaign_repo,
            )

        assert "Campaign" in str(exc_info.value)
        mock_campaign_documents_repository.create.assert_not_called()


class TestCampaignDocumentsServiceGet:
    """Tests pour la récupération de document de campagne."""

    @pytest.mark.unit
    def test_get_campaign_document_by_uuid_success(
        self, sample_campaign_document_bean, mock_campaign_documents_repository
    ):
        """Test récupération réussie par UUID."""
        mock_campaign_documents_repository.get_by_uuid.return_value = (
            sample_campaign_document_bean
        )

        result = get_campaign_document_by_uuid(
            mock_campaign_documents_repository, sample_campaign_document_bean.uuid
        )

        assert result.uuid == sample_campaign_document_bean.uuid
        mock_campaign_documents_repository.get_by_uuid.assert_called_once_with(
            sample_campaign_document_bean.uuid
        )

    @pytest.mark.unit
    def test_get_campaign_document_by_uuid_not_found(
        self, mock_campaign_documents_repository
    ):
        """Test qu'un UUID inexistant lève NotFoundException."""
        mock_campaign_documents_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_document_by_uuid(mock_campaign_documents_repository, fake_uuid)

        assert fake_uuid in str(exc_info.value)
        assert "CampaignDocument" in str(exc_info.value)

    @pytest.mark.unit
    def test_get_campaign_documents_by_campaign_uuid(
        self,
        sample_campaign_document_bean,
        sample_campaign_uuid,
        mock_campaign_documents_repository,
    ):
        """Test récupération de tous les documents d'une campagne."""
        mock_campaign_documents_repository.get_by_campaign_uuid.return_value = [
            sample_campaign_document_bean,
            sample_campaign_document_bean,
        ]

        result = get_campaign_documents(
            mock_campaign_documents_repository, sample_campaign_uuid
        )

        assert len(result) == 2
        mock_campaign_documents_repository.get_by_campaign_uuid.assert_called_once_with(
            sample_campaign_uuid
        )

    @pytest.mark.unit
    def test_get_campaign_documents_empty(self, mock_campaign_documents_repository):
        """Test récupération quand aucun document n'existe."""
        mock_campaign_documents_repository.get_by_campaign_uuid.return_value = []
        fake_uuid = str(uuid.uuid4())

        result = get_campaign_documents(mock_campaign_documents_repository, fake_uuid)

        assert len(result) == 0


class TestCampaignDocumentsServiceUpdate:
    """Tests pour la mise à jour de document de campagne."""

    @pytest.mark.unit
    def test_update_campaign_document_success(
        self, sample_campaign_document_bean, mock_campaign_documents_repository
    ):
        """Test mise à jour réussie."""
        mock_campaign_documents_repository.get_by_uuid.return_value = (
            sample_campaign_document_bean
        )
        updated_bean = CampaignDocumentsBean(
            uuid=sample_campaign_document_bean.uuid,
            campaign_uuid=sample_campaign_document_bean.campaign_uuid,
            subtype_id=2,
            file_type_id=3,
            name="Document Modifié",
            path="/path/to/updated_document.pdf",
            date=date(2025, 4, 1),
        )
        mock_campaign_documents_repository.update.return_value = updated_bean

        result = update_campaign_document(
            mock_campaign_documents_repository, updated_bean
        )

        assert result.name == "Document Modifié"
        assert result.subtype_id == 2
        mock_campaign_documents_repository.update.assert_called_once_with(updated_bean)

    @pytest.mark.unit
    def test_update_campaign_document_not_found(
        self, mock_campaign_documents_repository
    ):
        """Test que la mise à jour d'un document inexistant lève NotFoundException."""
        mock_campaign_documents_repository.get_by_uuid.return_value = None
        fake_bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=str(uuid.uuid4()),
            subtype_id=0,
            file_type_id=0,
            name="Inexistant",
            path="/path/to/missing.pdf",
            date=None,
        )

        with pytest.raises(NotFoundException):
            update_campaign_document(mock_campaign_documents_repository, fake_bean)

        mock_campaign_documents_repository.update.assert_not_called()


class TestCampaignDocumentsServiceDelete:
    """Tests pour la suppression de document de campagne."""

    @pytest.mark.unit
    def test_delete_campaign_document_success(self, mock_campaign_documents_repository):
        """Test suppression réussie."""
        mock_campaign_documents_repository.get_by_uuid.return_value = MagicMock()
        mock_campaign_documents_repository.delete.return_value = True
        doc_uuid = str(uuid.uuid4())

        result = delete_campaign_document(mock_campaign_documents_repository, doc_uuid)

        assert result is True
        mock_campaign_documents_repository.delete.assert_called_once_with(doc_uuid)

    @pytest.mark.unit
    def test_delete_campaign_document_not_found(
        self, mock_campaign_documents_repository
    ):
        """Test que la suppression d'un document inexistant lève NotFoundException."""
        mock_campaign_documents_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            delete_campaign_document(mock_campaign_documents_repository, fake_uuid)

        mock_campaign_documents_repository.delete.assert_not_called()

    @pytest.mark.unit
    def test_delete_campaign_document_repo_returns_false(
        self, mock_campaign_documents_repository
    ):
        """Test que delete lève NotFoundException quand repository.delete retourne False."""
        mock_campaign_documents_repository.get_by_uuid.return_value = MagicMock()
        mock_campaign_documents_repository.delete.return_value = False
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_document(mock_campaign_documents_repository, fake_uuid)

        assert exc_info.value.resource == "CampaignDocument"
        assert exc_info.value.identifier == fake_uuid


# ============================================================================
# MUTATION-KILLING TESTS
# ============================================================================


class TestCampaignDocumentsModuleLogger:
    """Tests pour le logger du module."""

    @pytest.mark.unit
    def test_logger_exists(self):
        """Vérifie que le logger du module est défini."""
        assert campaign_documents_service.logger is not None

    @pytest.mark.unit
    def test_logger_name(self):
        """Vérifie que le logger porte le bon nom de module."""
        assert (
            campaign_documents_service.logger.name
            == "app.domain.campaign.services.campaign_documents_service"
        )


class TestCreateCampaignDocumentAndOrMutants:
    """Tests Pattern A: and->or mutant killers pour create_campaign_document."""

    @pytest.mark.unit
    def test_create_with_none_repository_skips_parent_check(self):
        """Pattern A: campaign_repository=None + bean.campaign_uuid set.
        With 'and', skips the check. With 'or' mutant, calls None.get_by_uuid() => crash.
        """
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="some-uuid",
            subtype_id=0,
            file_type_id=1,
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        result = create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert result is bean
        mock_repo.create.assert_called_once()

    @pytest.mark.unit
    def test_create_with_repo_but_no_campaign_uuid_skips_parent_check(self):
        """Pattern A (second operand): campaign_repository set but bean.campaign_uuid empty.
        With 'and', skips. With 'or' mutant, enters the block."""
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="",  # falsy
            subtype_id=0,
            file_type_id=1,
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []
        mock_campaign_repo = MagicMock()

        result = create_campaign_document(
            mock_repo, bean, campaign_repository=mock_campaign_repo
        )

        assert result is bean
        mock_campaign_repo.get_by_uuid.assert_not_called()


class TestCreateCampaignDocumentConflict:
    """Tests pour les doublons de nom dans la même campagne."""

    @pytest.mark.unit
    def test_create_duplicate_name_raises_conflict(self):
        """Test qu'un document avec le même nom dans la même campagne lève ConflictException."""
        campaign_uuid = str(uuid.uuid4())
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            subtype_id=0,
            file_type_id=1,
            name="MonDocument",
            path="/path",
        )
        existing_doc = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            subtype_id=1,
            file_type_id=2,
            name="MonDocument",
            path="/other",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = [existing_doc]

        with pytest.raises(ConflictException) as exc_info:
            create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert exc_info.value.field == "name"
        assert "MonDocument" in exc_info.value.value
        mock_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_different_name_no_conflict(self):
        """Test qu'un document avec un nom différent ne lève pas de conflit."""
        campaign_uuid = str(uuid.uuid4())
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            name="NouveauDoc",
            path="/path",
        )
        existing_doc = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            name="AutreDoc",
            path="/other",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = [existing_doc]
        mock_repo.create.return_value = bean

        result = create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert result is bean
        mock_repo.create.assert_called_once()


class TestCampaignDocumentsLoggerMessages:
    """Tests Pattern B: tuer les mutants qui modifient les messages de log."""

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_documents_service.logger")
    def test_create_logs_creating_message(self, mock_logger):
        """Test que create_campaign_document log le message 'Creating'."""
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="",
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert mock_logger.info.call_count == 2
        first_log = mock_logger.info.call_args_list[0][0][0]
        assert "Creating campaign document" in first_log

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_documents_service.logger")
    def test_create_logs_created_message(self, mock_logger):
        """Test que create_campaign_document log le message 'Created'."""
        bean = CampaignDocumentsBean(
            uuid="result-uuid",
            campaign_uuid="",
            name="Doc",
            path="/path",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        create_campaign_document(mock_repo, bean, campaign_repository=None)

        second_log = mock_logger.info.call_args_list[1][0][0]
        assert "Created campaign document" in second_log
        assert "result-uuid" in second_log

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_documents_service.logger")
    def test_update_logs_updating_message(self, mock_logger):
        """Test que update_campaign_document log le message 'Updating'."""
        bean = CampaignDocumentsBean(uuid="upd-uuid", name="Doc", path="/p")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.update.return_value = bean

        update_campaign_document(mock_repo, bean)

        mock_logger.info.assert_called_once()
        log_msg = mock_logger.info.call_args[0][0]
        assert "Updating campaign document" in log_msg
        assert "upd-uuid" in log_msg

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_documents_service.logger")
    def test_delete_logs_deleting_and_deleted_messages(self, mock_logger):
        """Test que delete_campaign_document log 'Deleting' et 'Deleted'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = True
        doc_uuid = "del-uuid"

        delete_campaign_document(mock_repo, doc_uuid)

        assert mock_logger.info.call_count == 2
        first_log = mock_logger.info.call_args_list[0][0][0]
        second_log = mock_logger.info.call_args_list[1][0][0]
        assert "Deleting campaign document" in first_log
        assert "del-uuid" in first_log
        assert "Deleted campaign document" in second_log
        assert "del-uuid" in second_log


class TestCampaignDocumentsExceptionMessages:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'exception."""

    @pytest.mark.unit
    def test_create_parent_not_found_exception_fields(self):
        """Test que NotFoundException de create contient les bons champs."""
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="parent-uuid",
            name="Doc",
            path="/p",
        )
        mock_repo = MagicMock()
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_campaign_document(
                mock_repo, bean, campaign_repository=mock_campaign_repo
            )

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "parent-uuid"

    @pytest.mark.unit
    def test_get_not_found_exception_fields(self):
        """Test que NotFoundException de get contient les bons champs."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_document_by_uuid(mock_repo, "missing-uuid")

        assert exc_info.value.resource == "CampaignDocument"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_update_not_found_exception_fields(self):
        """Test que NotFoundException de update contient les bons champs."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        bean = CampaignDocumentsBean(uuid="upd-missing", name="X", path="/x")

        with pytest.raises(NotFoundException) as exc_info:
            update_campaign_document(mock_repo, bean)

        assert exc_info.value.resource == "CampaignDocument"
        assert exc_info.value.identifier == "upd-missing"

    @pytest.mark.unit
    def test_delete_get_not_found_exception_fields(self):
        """Test que NotFoundException de delete (get_by_uuid=None) contient les bons champs."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_document(mock_repo, "del-missing")

        assert exc_info.value.resource == "CampaignDocument"
        assert exc_info.value.identifier == "del-missing"

    @pytest.mark.unit
    def test_delete_repo_false_exception_fields(self):
        """Test que NotFoundException de delete (repo.delete=False) contient les bons champs."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_document(mock_repo, "del-false")

        assert exc_info.value.resource == "CampaignDocument"
        assert exc_info.value.identifier == "del-false"

    @pytest.mark.unit
    def test_create_conflict_exception_field_is_name(self):
        """Test que ConflictException de create a le bon field."""
        campaign_uuid = str(uuid.uuid4())
        bean = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            name="Dup",
            path="/p",
        )
        existing = CampaignDocumentsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=campaign_uuid,
            name="Dup",
            path="/q",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = [existing]

        with pytest.raises(ConflictException) as exc_info:
            create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert exc_info.value.field == "name"
        assert "Dup" in str(exc_info.value)


class TestCreateCampaignDocumentReturnValues:
    """Tests vérifiant les valeurs de retour."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self):
        """Test que create retourne le bean du repository."""
        bean = CampaignDocumentsBean(uuid="input", name="Doc", path="/p")
        returned = CampaignDocumentsBean(uuid="returned", name="Doc", path="/p")
        mock_repo = MagicMock()
        mock_repo.create.return_value = returned
        mock_repo.get_by_campaign_uuid.return_value = []

        result = create_campaign_document(mock_repo, bean, campaign_repository=None)

        assert result is returned

    @pytest.mark.unit
    def test_update_returns_repository_result(self):
        """Test que update retourne le bean du repository."""
        existing = CampaignDocumentsBean(uuid="exist", name="Old", path="/p")
        returned = CampaignDocumentsBean(uuid="exist", name="New", path="/p")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = returned

        result = update_campaign_document(mock_repo, existing)

        assert result is returned

    @pytest.mark.unit
    def test_get_documents_returns_repository_result(self):
        """Test que get_campaign_documents retourne la liste du repository."""
        expected = [MagicMock(), MagicMock()]
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = expected

        result = get_campaign_documents(mock_repo, "campaign-uuid")

        assert result is expected

    @pytest.mark.unit
    def test_delete_returns_true(self):
        """Test que delete retourne True en cas de succès."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_campaign_document(mock_repo, "uuid")

        assert result is True
