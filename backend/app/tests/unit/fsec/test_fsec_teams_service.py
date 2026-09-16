"""
Tests unitaires pour le service FsecTeams.

Ces tests vérifient la logique métier pure sans dépendance à la BD.
Utilise des mocks pour isoler le service des repositories.
Objectif: tuer les mutants de mutation testing (logger, exception messages, and/or inversions).
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.domain.exceptions import ConflictException, NotFoundException
from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean
from app.domain.fsec.services import fsec_teams_service
from app.domain.fsec.services.fsec_teams_service import (
    create_fsec_team_member,
    delete_fsec_team_member,
    get_fsec_team_member_by_uuid,
    get_fsec_team_members,
    update_fsec_team_member,
)


@pytest.fixture
def sample_fsec_team_bean(sample_fsec_version_uuid):
    """Bean FsecTeams de test."""
    return FsecTeamsBean(
        uuid=str(uuid.uuid4()),
        fsec_id=sample_fsec_version_uuid,
        role_id=0,
        name="Jean Dupont",
    )


@pytest.fixture
def mock_fsec_teams_repository():
    """Mock du repository FsecTeams."""
    return MagicMock()


class TestFsecTeamsServiceCreate:
    """Tests pour la création de membre d'équipe FSEC."""

    @pytest.mark.unit
    def test_create_fsec_team_member_success(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test création réussie d'un membre d'équipe FSEC."""
        mock_fsec_teams_repository.create.return_value = sample_fsec_team_bean

        result = create_fsec_team_member(
            mock_fsec_teams_repository, sample_fsec_team_bean
        )

        assert result.uuid == sample_fsec_team_bean.uuid
        assert result.name == sample_fsec_team_bean.name
        assert result.fsec_id == sample_fsec_team_bean.fsec_id
        mock_fsec_teams_repository.create.assert_called_once_with(sample_fsec_team_bean)

    @pytest.mark.unit
    def test_create_fsec_team_member_with_parent_validation_success(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test création réussie avec validation du FSEC parent existant."""
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = MagicMock()  # parent existe
        mock_fsec_teams_repository.get_by_fsec_id.return_value = []  # pas de doublon
        mock_fsec_teams_repository.create.return_value = sample_fsec_team_bean

        result = create_fsec_team_member(
            mock_fsec_teams_repository,
            sample_fsec_team_bean,
            fsec_repository=mock_fsec_repo,
        )

        assert result.uuid == sample_fsec_team_bean.uuid
        mock_fsec_repo.get_by_version_uuid.assert_called_once_with(
            sample_fsec_team_bean.fsec_id
        )
        mock_fsec_teams_repository.create.assert_called_once_with(sample_fsec_team_bean)

    @pytest.mark.unit
    def test_create_fsec_team_member_parent_not_found(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test NotFoundException quand le FSEC parent n'existe pas."""
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = None  # parent absent

        with pytest.raises(NotFoundException) as exc_info:
            create_fsec_team_member(
                mock_fsec_teams_repository,
                sample_fsec_team_bean,
                fsec_repository=mock_fsec_repo,
            )

        assert "FSEC" in str(exc_info.value)
        assert sample_fsec_team_bean.fsec_id in str(exc_info.value)
        mock_fsec_teams_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_create_fsec_team_member_repository_exception(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test que les exceptions du repository sont propagées."""
        mock_fsec_teams_repository.create.side_effect = RuntimeError("DB error")

        with pytest.raises(RuntimeError, match="DB error"):
            create_fsec_team_member(mock_fsec_teams_repository, sample_fsec_team_bean)

    @pytest.mark.unit
    def test_create_duplicate_raises_conflict(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test qu'un doublon nom+role_id dans le même FSEC lève ConflictException."""
        existing_member = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id=sample_fsec_team_bean.fsec_id,
            role_id=sample_fsec_team_bean.role_id,
            name=sample_fsec_team_bean.name,
        )
        mock_fsec_teams_repository.get_by_fsec_id.return_value = [existing_member]

        with pytest.raises(ConflictException) as exc_info:
            create_fsec_team_member(mock_fsec_teams_repository, sample_fsec_team_bean)

        assert "name/role_id" in str(exc_info.value)
        mock_fsec_teams_repository.create.assert_not_called()


class TestFsecTeamsServiceGet:
    """Tests pour la récupération de membre d'équipe FSEC."""

    @pytest.mark.unit
    def test_get_fsec_team_member_by_uuid_success(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test récupération réussie par UUID."""
        mock_fsec_teams_repository.get_by_uuid.return_value = sample_fsec_team_bean

        result = get_fsec_team_member_by_uuid(
            mock_fsec_teams_repository, sample_fsec_team_bean.uuid
        )

        assert result.uuid == sample_fsec_team_bean.uuid
        mock_fsec_teams_repository.get_by_uuid.assert_called_once_with(
            sample_fsec_team_bean.uuid
        )

    @pytest.mark.unit
    def test_get_fsec_team_member_by_uuid_not_found(self, mock_fsec_teams_repository):
        """Test qu'un UUID inexistant lève NotFoundException."""
        mock_fsec_teams_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_team_member_by_uuid(mock_fsec_teams_repository, fake_uuid)

        assert fake_uuid in str(exc_info.value)
        assert "FsecTeamMember" in str(exc_info.value)

    @pytest.mark.unit
    def test_get_fsec_team_members_by_fsec_id(
        self,
        sample_fsec_team_bean,
        sample_fsec_version_uuid,
        mock_fsec_teams_repository,
    ):
        """Test récupération de tous les membres d'une équipe FSEC."""
        mock_fsec_teams_repository.get_by_fsec_id.return_value = [
            sample_fsec_team_bean,
            sample_fsec_team_bean,
        ]

        result = get_fsec_team_members(
            mock_fsec_teams_repository, sample_fsec_version_uuid
        )

        assert len(result) == 2
        mock_fsec_teams_repository.get_by_fsec_id.assert_called_once_with(
            sample_fsec_version_uuid
        )

    @pytest.mark.unit
    def test_get_fsec_team_members_empty(self, mock_fsec_teams_repository):
        """Test récupération quand aucun membre n'existe."""
        mock_fsec_teams_repository.get_by_fsec_id.return_value = []
        fake_uuid = str(uuid.uuid4())

        result = get_fsec_team_members(mock_fsec_teams_repository, fake_uuid)

        assert len(result) == 0


class TestFsecTeamsServiceUpdate:
    """Tests pour la mise à jour de membre d'équipe FSEC."""

    @pytest.mark.unit
    def test_update_fsec_team_member_success(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test mise à jour réussie."""
        mock_fsec_teams_repository.get_by_uuid.return_value = sample_fsec_team_bean
        updated_bean = FsecTeamsBean(
            uuid=sample_fsec_team_bean.uuid,
            fsec_id=sample_fsec_team_bean.fsec_id,
            role_id=1,
            name="Marie Martin",
        )
        mock_fsec_teams_repository.update.return_value = updated_bean

        result = update_fsec_team_member(mock_fsec_teams_repository, updated_bean)

        assert result.name == "Marie Martin"
        assert result.role_id == 1
        mock_fsec_teams_repository.update.assert_called_once_with(updated_bean)

    @pytest.mark.unit
    def test_update_fsec_team_member_not_found(self, mock_fsec_teams_repository):
        """Test que la mise à jour d'un membre inexistant lève NotFoundException."""
        mock_fsec_teams_repository.get_by_uuid.return_value = None
        fake_bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id=str(uuid.uuid4()),
            role_id=0,
            name="Inexistant",
        )

        with pytest.raises(NotFoundException):
            update_fsec_team_member(mock_fsec_teams_repository, fake_bean)

        mock_fsec_teams_repository.update.assert_not_called()

    @pytest.mark.unit
    def test_update_fsec_team_member_repository_exception(
        self, sample_fsec_team_bean, mock_fsec_teams_repository
    ):
        """Test que les exceptions du repository sont propagées lors de la mise à jour."""
        mock_fsec_teams_repository.get_by_uuid.return_value = sample_fsec_team_bean
        mock_fsec_teams_repository.update.side_effect = RuntimeError("DB error")

        with pytest.raises(RuntimeError, match="DB error"):
            update_fsec_team_member(mock_fsec_teams_repository, sample_fsec_team_bean)


class TestFsecTeamsServiceDelete:
    """Tests pour la suppression de membre d'équipe FSEC."""

    @pytest.mark.unit
    def test_delete_fsec_team_member_success(self, mock_fsec_teams_repository):
        """Test suppression réussie."""
        mock_fsec_teams_repository.delete.return_value = True
        member_uuid = str(uuid.uuid4())

        result = delete_fsec_team_member(mock_fsec_teams_repository, member_uuid)

        assert result is True
        mock_fsec_teams_repository.delete.assert_called_once_with(member_uuid)

    @pytest.mark.unit
    def test_delete_fsec_team_member_not_found(self, mock_fsec_teams_repository):
        """Test que la suppression d'un membre inexistant lève NotFoundException."""
        mock_fsec_teams_repository.delete.return_value = False
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            delete_fsec_team_member(mock_fsec_teams_repository, fake_uuid)

    @pytest.mark.unit
    def test_delete_fsec_team_member_repository_exception(
        self, mock_fsec_teams_repository
    ):
        """Test que les exceptions du repository sont propagées lors de la suppression."""
        mock_fsec_teams_repository.delete.side_effect = RuntimeError("DB error")
        member_uuid = str(uuid.uuid4())

        with pytest.raises(RuntimeError, match="DB error"):
            delete_fsec_team_member(mock_fsec_teams_repository, member_uuid)


# ============================================================================
# MUTATION-KILLING TESTS
# ============================================================================


class TestFsecTeamsModuleLogger:
    """Tests pour le logger du module."""

    @pytest.mark.unit
    def test_logger_exists(self):
        """Vérifie que le logger du module est défini."""
        assert fsec_teams_service.logger is not None

    @pytest.mark.unit
    def test_logger_name(self):
        """Vérifie que le logger porte le bon nom de module."""
        assert (
            fsec_teams_service.logger.name
            == "app.domain.fsec.services.fsec_teams_service"
        )


class TestCreateFsecTeamMemberAndOrMutants:
    """Tests Pattern A: and->or mutant killers pour create_fsec_team_member."""

    @pytest.mark.unit
    def test_create_with_none_repository_skips_parent_check(self):
        """Pattern A: fsec_repository=None + bean.fsec_id set.
        With 'and', skips. With 'or' mutant, calls None.get_by_version_uuid() => crash.
        """
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="some-fsec-uuid",
            role_id=0,
            name="Agent Test",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_fsec_id.return_value = []

        result = create_fsec_team_member(mock_repo, bean, fsec_repository=None)

        assert result is bean
        mock_repo.create.assert_called_once()

    @pytest.mark.unit
    def test_create_with_repo_but_no_fsec_id_skips_parent_check(self):
        """Pattern A (second operand): fsec_repository set but bean.fsec_id empty.
        With 'and', skips. With 'or' mutant, enters the block."""
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="",  # falsy
            role_id=0,
            name="Agent Test",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_fsec_id.return_value = []
        mock_fsec_repo = MagicMock()

        result = create_fsec_team_member(
            mock_repo, bean, fsec_repository=mock_fsec_repo
        )

        assert result is bean
        mock_fsec_repo.get_by_version_uuid.assert_not_called()


class TestFsecTeamsLoggerMessages:
    """Tests Pattern B: tuer les mutants qui modifient les messages de log."""

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_create_logs_creating_message(self, mock_logger):
        """Test que create log le message 'Creating fsec team member'."""
        bean = FsecTeamsBean(
            uuid="new-uuid",
            fsec_id="fsec-1",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_fsec_id.return_value = []

        create_fsec_team_member(mock_repo, bean)

        assert mock_logger.info.call_count == 2
        first_log = mock_logger.info.call_args_list[0][0][0]
        assert "Creating fsec team member" in first_log
        assert "fsec-1" in first_log

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_create_logs_created_message(self, mock_logger):
        """Test que create log le message 'Created fsec team member'."""
        bean = FsecTeamsBean(
            uuid="result-uuid",
            fsec_id="fsec-1",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_fsec_id.return_value = []

        create_fsec_team_member(mock_repo, bean)

        second_log = mock_logger.info.call_args_list[1][0][0]
        assert "Created fsec team member" in second_log
        assert "result-uuid" in second_log

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_update_logs_updating_message(self, mock_logger):
        """Test que update log le message 'Updating fsec team member'."""
        bean = FsecTeamsBean(uuid="upd-uuid", fsec_id="f", role_id=0, name="A")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.update.return_value = bean

        update_fsec_team_member(mock_repo, bean)

        # update logs 'Updating' and 'Updated'
        info_calls = [c[0][0] for c in mock_logger.info.call_args_list]
        assert any("Updating fsec team member" in msg for msg in info_calls)
        assert any("upd-uuid" in msg for msg in info_calls)

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_update_logs_updated_message(self, mock_logger):
        """Test que update log le message 'Updated fsec team member'."""
        bean = FsecTeamsBean(uuid="upd-uuid", fsec_id="f", role_id=0, name="A")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.update.return_value = bean

        update_fsec_team_member(mock_repo, bean)

        info_calls = [c[0][0] for c in mock_logger.info.call_args_list]
        assert any("Updated fsec team member" in msg for msg in info_calls)

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_update_not_found_logs_warning(self, mock_logger):
        """Test que update log un warning quand le membre n'est pas trouvé."""
        bean = FsecTeamsBean(uuid="miss-uuid", fsec_id="f", role_id=0, name="A")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            update_fsec_team_member(mock_repo, bean)

        mock_logger.warning.assert_called_once()
        warning_msg = mock_logger.warning.call_args[0][0]
        assert "FsecTeamMember not found" in warning_msg
        assert "miss-uuid" in warning_msg

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_delete_logs_deleting_and_deleted_messages(self, mock_logger):
        """Test que delete log 'Deleting' et 'Deleted'."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True

        delete_fsec_team_member(mock_repo, "del-uuid")

        info_calls = [c[0][0] for c in mock_logger.info.call_args_list]
        assert any("Deleting fsec team member" in msg for msg in info_calls)
        assert any("del-uuid" in msg for msg in info_calls)
        assert any("Deleted fsec team member" in msg for msg in info_calls)

    @pytest.mark.unit
    @patch("app.domain.fsec.services.fsec_teams_service.logger")
    def test_delete_not_found_logs_warning(self, mock_logger):
        """Test que delete log un warning quand le membre n'est pas trouvé."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException):
            delete_fsec_team_member(mock_repo, "miss-uuid")

        mock_logger.warning.assert_called_once()
        warning_msg = mock_logger.warning.call_args[0][0]
        assert "FsecTeamMember not found" in warning_msg
        assert "miss-uuid" in warning_msg


class TestFsecTeamsExceptionMessages:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'exception."""

    @pytest.mark.unit
    def test_create_parent_not_found_resource(self):
        """Test que NotFoundException de create contient resource='FSEC'."""
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="parent-fsec-uuid",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_fsec_team_member(mock_repo, bean, fsec_repository=mock_fsec_repo)

        assert exc_info.value.resource == "FSEC"
        assert exc_info.value.identifier == "parent-fsec-uuid"

    @pytest.mark.unit
    def test_get_not_found_resource(self):
        """Test que NotFoundException de get contient resource='FsecTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_team_member_by_uuid(mock_repo, "missing-uuid")

        assert exc_info.value.resource == "FsecTeamMember"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_update_not_found_resource(self):
        """Test que NotFoundException de update contient resource='FsecTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        bean = FsecTeamsBean(uuid="upd-miss", fsec_id="f", role_id=0, name="X")

        with pytest.raises(NotFoundException) as exc_info:
            update_fsec_team_member(mock_repo, bean)

        assert exc_info.value.resource == "FsecTeamMember"
        assert exc_info.value.identifier == "upd-miss"

    @pytest.mark.unit
    def test_delete_not_found_resource(self):
        """Test que NotFoundException de delete contient resource='FsecTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_fsec_team_member(mock_repo, "del-miss")

        assert exc_info.value.resource == "FsecTeamMember"
        assert exc_info.value.identifier == "del-miss"

    @pytest.mark.unit
    def test_create_conflict_exception_field(self):
        """Test que ConflictException de create a le bon field 'name/role_id'."""
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=0,
            name="Dup",
        )
        existing = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=0,
            name="Dup",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_id.return_value = [existing]

        with pytest.raises(ConflictException) as exc_info:
            create_fsec_team_member(mock_repo, bean)

        assert exc_info.value.field == "name/role_id"
        assert "Dup" in exc_info.value.value
        assert "0" in exc_info.value.value

    @pytest.mark.unit
    def test_create_no_conflict_different_name(self):
        """Test que deux membres avec des noms différents ne lèvent pas de conflit."""
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=0,
            name="Agent A",
        )
        existing = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=0,
            name="Agent B",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_id.return_value = [existing]
        mock_repo.create.return_value = bean

        result = create_fsec_team_member(mock_repo, bean)

        assert result is bean

    @pytest.mark.unit
    def test_create_no_conflict_different_role(self):
        """Test que deux membres avec le même nom mais des rôles différents ne lèvent pas de conflit."""
        bean = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=0,
            name="Same Name",
        )
        existing = FsecTeamsBean(
            uuid=str(uuid.uuid4()),
            fsec_id="fsec-uuid",
            role_id=1,
            name="Same Name",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_id.return_value = [existing]
        mock_repo.create.return_value = bean

        result = create_fsec_team_member(mock_repo, bean)

        assert result is bean


class TestFsecTeamsReturnValues:
    """Tests vérifiant les valeurs de retour."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self):
        """Test que create retourne le bean du repository."""
        bean = FsecTeamsBean(uuid="in", fsec_id="f", role_id=0, name="A")
        returned = FsecTeamsBean(uuid="out", fsec_id="f", role_id=0, name="A")
        mock_repo = MagicMock()
        mock_repo.create.return_value = returned
        mock_repo.get_by_fsec_id.return_value = []

        result = create_fsec_team_member(mock_repo, bean)

        assert result is returned

    @pytest.mark.unit
    def test_update_returns_repository_result(self):
        """Test que update retourne le bean du repository."""
        existing = FsecTeamsBean(uuid="m", fsec_id="f", role_id=0, name="X")
        returned = FsecTeamsBean(uuid="m", fsec_id="f", role_id=0, name="Y")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = returned

        result = update_fsec_team_member(mock_repo, existing)

        assert result is returned

    @pytest.mark.unit
    def test_get_members_returns_repository_result(self):
        """Test que get_fsec_team_members retourne la liste du repository."""
        expected = [MagicMock(), MagicMock()]
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_id.return_value = expected

        result = get_fsec_team_members(mock_repo, "fsec-id")

        assert result is expected

    @pytest.mark.unit
    def test_delete_returns_true(self):
        """Test que delete retourne True en cas de succès."""
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_fsec_team_member(mock_repo, "uuid")

        assert result is True
