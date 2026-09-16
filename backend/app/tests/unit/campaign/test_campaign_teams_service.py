"""
Tests unitaires pour le service CampaignTeams.

Ces tests vérifient la logique métier pure sans dépendance à la BD.
Utilise des mocks pour isoler le service des repositories.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.domain.campaign.services import campaign_teams_service
from app.domain.campaign.services.campaign_teams_service import (
    create_campaign_team_member,
    delete_campaign_team_member,
    get_campaign_team_member_by_uuid,
    get_campaign_team_members,
    update_campaign_team_member,
)
from app.domain.exceptions import ConflictException, NotFoundException


@pytest.fixture
def sample_campaign_team_bean(sample_campaign_uuid):
    """Bean CampaignTeams de test."""
    return CampaignTeamsBean(
        uuid=str(uuid.uuid4()),
        campaign_uuid=sample_campaign_uuid,
        role_id=0,
        name="Jean Dupont",
    )


@pytest.fixture
def mock_campaign_teams_repository():
    """Mock du repository CampaignTeams."""
    return MagicMock()


class TestCampaignTeamsServiceCreate:
    """Tests pour la création de membre d'équipe de campagne."""

    @pytest.mark.unit
    def test_create_campaign_team_member_success(
        self, sample_campaign_team_bean, mock_campaign_teams_repository
    ):
        """Test création réussie d'un membre d'équipe."""
        mock_campaign_teams_repository.create.return_value = sample_campaign_team_bean
        mock_campaign_teams_repository.get_by_campaign_uuid.return_value = []
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = MagicMock()

        result = create_campaign_team_member(
            mock_campaign_teams_repository,
            sample_campaign_team_bean,
            campaign_repository=mock_campaign_repo,
        )

        assert result.uuid == sample_campaign_team_bean.uuid
        assert result.name == sample_campaign_team_bean.name
        assert result.campaign_uuid == sample_campaign_team_bean.campaign_uuid
        mock_campaign_teams_repository.create.assert_called_once_with(
            sample_campaign_team_bean
        )

    @pytest.mark.unit
    def test_create_team_member_parent_not_found(
        self, sample_campaign_team_bean, mock_campaign_teams_repository
    ):
        """Test que la création avec campagne parente inexistante lève NotFoundException."""
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_campaign_team_member(
                mock_campaign_teams_repository,
                sample_campaign_team_bean,
                campaign_repository=mock_campaign_repo,
            )

        assert "Campaign" in str(exc_info.value)
        mock_campaign_teams_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_create_team_member_conflict(
        self, sample_campaign_team_bean, mock_campaign_teams_repository
    ):
        """Test qu'un doublon nom/rôle lève ConflictException."""
        existing_member = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=sample_campaign_team_bean.campaign_uuid,
            role_id=sample_campaign_team_bean.role_id,
            name=sample_campaign_team_bean.name,
        )
        mock_campaign_teams_repository.get_by_campaign_uuid.return_value = [
            existing_member
        ]

        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = MagicMock()

        with pytest.raises(ConflictException):
            create_campaign_team_member(
                mock_campaign_teams_repository,
                sample_campaign_team_bean,
                campaign_repository=mock_campaign_repo,
            )

        mock_campaign_teams_repository.create.assert_not_called()


class TestCampaignTeamsServiceGet:
    """Tests pour la récupération de membre d'équipe de campagne."""

    @pytest.mark.unit
    def test_get_campaign_team_member_by_uuid_success(
        self, sample_campaign_team_bean, mock_campaign_teams_repository
    ):
        """Test récupération réussie par UUID."""
        mock_campaign_teams_repository.get_by_uuid.return_value = (
            sample_campaign_team_bean
        )

        result = get_campaign_team_member_by_uuid(
            mock_campaign_teams_repository, sample_campaign_team_bean.uuid
        )

        assert result.uuid == sample_campaign_team_bean.uuid
        mock_campaign_teams_repository.get_by_uuid.assert_called_once_with(
            sample_campaign_team_bean.uuid
        )

    @pytest.mark.unit
    def test_get_campaign_team_member_by_uuid_not_found(
        self, mock_campaign_teams_repository
    ):
        """Test qu'un UUID inexistant lève NotFoundException."""
        mock_campaign_teams_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_team_member_by_uuid(mock_campaign_teams_repository, fake_uuid)

        assert fake_uuid in str(exc_info.value)
        assert "CampaignTeamMember" in str(exc_info.value)

    @pytest.mark.unit
    def test_get_campaign_team_members_by_campaign_uuid(
        self,
        sample_campaign_team_bean,
        sample_campaign_uuid,
        mock_campaign_teams_repository,
    ):
        """Test récupération de tous les membres d'une équipe de campagne."""
        mock_campaign_teams_repository.get_by_campaign_uuid.return_value = [
            sample_campaign_team_bean,
            sample_campaign_team_bean,
        ]

        result = get_campaign_team_members(
            mock_campaign_teams_repository, sample_campaign_uuid
        )

        assert len(result) == 2
        mock_campaign_teams_repository.get_by_campaign_uuid.assert_called_once_with(
            sample_campaign_uuid
        )

    @pytest.mark.unit
    def test_get_campaign_team_members_empty(self, mock_campaign_teams_repository):
        """Test récupération quand aucun membre n'existe."""
        mock_campaign_teams_repository.get_by_campaign_uuid.return_value = []
        fake_uuid = str(uuid.uuid4())

        result = get_campaign_team_members(mock_campaign_teams_repository, fake_uuid)

        assert len(result) == 0


class TestCampaignTeamsServiceUpdate:
    """Tests pour la mise à jour de membre d'équipe de campagne."""

    @pytest.mark.unit
    def test_update_campaign_team_member_success(
        self, sample_campaign_team_bean, mock_campaign_teams_repository
    ):
        """Test mise à jour réussie."""
        mock_campaign_teams_repository.get_by_uuid.return_value = (
            sample_campaign_team_bean
        )
        updated_bean = CampaignTeamsBean(
            uuid=sample_campaign_team_bean.uuid,
            campaign_uuid=sample_campaign_team_bean.campaign_uuid,
            role_id=1,
            name="Marie Martin",
        )
        mock_campaign_teams_repository.update.return_value = updated_bean

        result = update_campaign_team_member(
            mock_campaign_teams_repository, updated_bean
        )

        assert result.name == "Marie Martin"
        assert result.role_id == 1
        mock_campaign_teams_repository.update.assert_called_once_with(updated_bean)

    @pytest.mark.unit
    def test_update_campaign_team_member_not_found(
        self, mock_campaign_teams_repository
    ):
        """Test que la mise à jour d'un membre inexistant lève NotFoundException."""
        mock_campaign_teams_repository.get_by_uuid.return_value = None
        fake_bean = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid=str(uuid.uuid4()),
            role_id=0,
            name="Inexistant",
        )

        with pytest.raises(NotFoundException):
            update_campaign_team_member(mock_campaign_teams_repository, fake_bean)

        mock_campaign_teams_repository.update.assert_not_called()


class TestCampaignTeamsServiceDelete:
    """Tests pour la suppression de membre d'équipe de campagne."""

    @pytest.mark.unit
    def test_delete_campaign_team_member_success(self, mock_campaign_teams_repository):
        """Test suppression réussie."""
        mock_campaign_teams_repository.get_by_uuid.return_value = MagicMock()
        mock_campaign_teams_repository.delete.return_value = True
        member_uuid = str(uuid.uuid4())

        result = delete_campaign_team_member(
            mock_campaign_teams_repository, member_uuid
        )

        assert result is True
        mock_campaign_teams_repository.delete.assert_called_once_with(member_uuid)

    @pytest.mark.unit
    def test_delete_campaign_team_member_not_found(
        self, mock_campaign_teams_repository
    ):
        """Test que la suppression d'un membre inexistant lève NotFoundException."""
        mock_campaign_teams_repository.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            delete_campaign_team_member(mock_campaign_teams_repository, fake_uuid)

        mock_campaign_teams_repository.delete.assert_not_called()

    @pytest.mark.unit
    def test_delete_campaign_team_member_repo_returns_false(
        self, mock_campaign_teams_repository
    ):
        """Test que delete lève NotFoundException quand repository.delete retourne False."""
        mock_campaign_teams_repository.get_by_uuid.return_value = MagicMock()
        mock_campaign_teams_repository.delete.return_value = False
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_team_member(mock_campaign_teams_repository, fake_uuid)

        assert exc_info.value.resource == "CampaignTeamMember"
        assert exc_info.value.identifier == fake_uuid


# ============================================================================
# MUTATION-KILLING TESTS
# ============================================================================


class TestCampaignTeamsModuleLogger:
    """Tests pour le logger du module."""

    @pytest.mark.unit
    def test_logger_exists(self):
        """Vérifie que le logger du module est défini."""
        assert campaign_teams_service.logger is not None

    @pytest.mark.unit
    def test_logger_name(self):
        """Vérifie que le logger porte le bon nom de module."""
        assert (
            campaign_teams_service.logger.name
            == "app.domain.campaign.services.campaign_teams_service"
        )


class TestCreateTeamMemberAndOrMutants:
    """Tests Pattern A: and->or mutant killers pour create_campaign_team_member."""

    @pytest.mark.unit
    def test_create_with_none_repository_skips_parent_check(self):
        """Pattern A: campaign_repository=None + bean.campaign_uuid set.
        With 'and', skips. With 'or' mutant, calls None.get_by_uuid() => crash."""
        bean = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="some-uuid",
            role_id=0,
            name="Agent Test",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        result = create_campaign_team_member(mock_repo, bean, campaign_repository=None)

        assert result is bean
        mock_repo.create.assert_called_once()

    @pytest.mark.unit
    def test_create_with_repo_but_no_campaign_uuid_skips_parent_check(self):
        """Pattern A (second operand): campaign_repository set but bean.campaign_uuid empty.
        With 'and', skips. With 'or' mutant, enters the block."""
        bean = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="",  # falsy
            role_id=0,
            name="Agent Test",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []
        mock_campaign_repo = MagicMock()

        result = create_campaign_team_member(
            mock_repo, bean, campaign_repository=mock_campaign_repo
        )

        assert result is bean
        mock_campaign_repo.get_by_uuid.assert_not_called()


class TestUpdateTeamMemberDuplicateCheck:
    """Tests pour la vérification de doublons lors du update."""

    @pytest.mark.unit
    def test_update_name_changed_triggers_duplicate_check(self):
        """Test que changer le nom déclenche la vérification de doublon."""
        existing = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Ancien Nom",
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Nouveau Nom",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.get_by_campaign_uuid.return_value = []
        mock_repo.update.return_value = updated

        result = update_campaign_team_member(mock_repo, updated)

        assert result.name == "Nouveau Nom"
        mock_repo.get_by_campaign_uuid.assert_called_once()

    @pytest.mark.unit
    def test_update_role_changed_triggers_duplicate_check(self):
        """Test que changer le rôle déclenche la vérification de doublon."""
        existing = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Same Name",
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=1,
            name="Same Name",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.get_by_campaign_uuid.return_value = []
        mock_repo.update.return_value = updated

        result = update_campaign_team_member(mock_repo, updated)

        assert result.role_id == 1
        mock_repo.get_by_campaign_uuid.assert_called_once()

    @pytest.mark.unit
    def test_update_no_key_change_skips_duplicate_check(self):
        """Test que si ni nom ni rôle ne change, pas de check doublon."""
        existing = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Same",
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Same",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = updated

        result = update_campaign_team_member(mock_repo, updated)

        assert result is updated
        mock_repo.get_by_campaign_uuid.assert_not_called()

    @pytest.mark.unit
    def test_update_conflict_different_uuid_raises(self):
        """Test que update lève ConflictException si un autre membre avec même nom/role existe."""
        existing = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Ancien Nom",
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Doublon",
        )
        other_member = CampaignTeamsBean(
            uuid="other-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Doublon",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.get_by_campaign_uuid.return_value = [other_member]

        with pytest.raises(ConflictException) as exc_info:
            update_campaign_team_member(mock_repo, updated)

        assert exc_info.value.field == "name/role_id"
        assert "Doublon" in exc_info.value.value
        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_update_conflict_same_uuid_no_conflict(self):
        """Test que update ne lève pas ConflictException si le membre trouvé est le même (même uuid)."""
        existing = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Ancien Nom",
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid",
            campaign_uuid="camp-uuid",
            role_id=1,
            name="Nouveau Nom",
        )
        same_member = CampaignTeamsBean(
            uuid="member-uuid",  # same uuid
            campaign_uuid="camp-uuid",
            role_id=1,
            name="Nouveau Nom",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.get_by_campaign_uuid.return_value = [same_member]
        mock_repo.update.return_value = updated

        result = update_campaign_team_member(mock_repo, updated)

        assert result is updated


class TestCampaignTeamsLoggerMessages:
    """Tests Pattern B: tuer les mutants qui modifient les messages de log."""

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_teams_service.logger")
    def test_create_logs_creating_message(self, mock_logger):
        """Test que create log le message 'Creating'."""
        bean = CampaignTeamsBean(
            uuid="new-uuid",
            campaign_uuid="",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        create_campaign_team_member(mock_repo, bean, campaign_repository=None)

        assert mock_logger.info.call_count == 2
        first_log = mock_logger.info.call_args_list[0][0][0]
        assert "Creating campaign team member" in first_log

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_teams_service.logger")
    def test_create_logs_created_message(self, mock_logger):
        """Test que create log le message 'Created'."""
        bean = CampaignTeamsBean(
            uuid="result-uuid",
            campaign_uuid="",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_repo.create.return_value = bean
        mock_repo.get_by_campaign_uuid.return_value = []

        create_campaign_team_member(mock_repo, bean, campaign_repository=None)

        second_log = mock_logger.info.call_args_list[1][0][0]
        assert "Created campaign team member" in second_log
        assert "result-uuid" in second_log

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_teams_service.logger")
    def test_update_logs_updating_message(self, mock_logger):
        """Test que update log le message 'Updating'."""
        existing = CampaignTeamsBean(
            uuid="upd-uuid", campaign_uuid="c", role_id=0, name="A"
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = existing

        update_campaign_team_member(mock_repo, existing)

        mock_logger.info.assert_called_once()
        log_msg = mock_logger.info.call_args[0][0]
        assert "Updating campaign team member" in log_msg
        assert "upd-uuid" in log_msg

    @pytest.mark.unit
    @patch("app.domain.campaign.services.campaign_teams_service.logger")
    def test_delete_logs_deleting_and_deleted_messages(self, mock_logger):
        """Test que delete log 'Deleting' et 'Deleted'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = True

        delete_campaign_team_member(mock_repo, "del-uuid")

        assert mock_logger.info.call_count == 2
        first_log = mock_logger.info.call_args_list[0][0][0]
        second_log = mock_logger.info.call_args_list[1][0][0]
        assert "Deleting campaign team member" in first_log
        assert "del-uuid" in first_log
        assert "Deleted campaign team member" in second_log
        assert "del-uuid" in second_log


class TestCampaignTeamsExceptionMessages:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'exception."""

    @pytest.mark.unit
    def test_create_parent_not_found_resource(self):
        """Test que NotFoundException de create contient resource='Campaign'."""
        bean = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="parent-uuid",
            role_id=0,
            name="Agent",
        )
        mock_repo = MagicMock()
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            create_campaign_team_member(
                mock_repo, bean, campaign_repository=mock_campaign_repo
            )

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "parent-uuid"

    @pytest.mark.unit
    def test_get_not_found_resource(self):
        """Test que NotFoundException de get contient resource='CampaignTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_team_member_by_uuid(mock_repo, "missing-uuid")

        assert exc_info.value.resource == "CampaignTeamMember"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_update_not_found_resource(self):
        """Test que NotFoundException de update contient resource='CampaignTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        bean = CampaignTeamsBean(
            uuid="upd-miss", campaign_uuid="c", role_id=0, name="X"
        )

        with pytest.raises(NotFoundException) as exc_info:
            update_campaign_team_member(mock_repo, bean)

        assert exc_info.value.resource == "CampaignTeamMember"
        assert exc_info.value.identifier == "upd-miss"

    @pytest.mark.unit
    def test_delete_get_not_found_resource(self):
        """Test que NotFoundException de delete (get_by_uuid=None) contient resource='CampaignTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_team_member(mock_repo, "del-miss")

        assert exc_info.value.resource == "CampaignTeamMember"
        assert exc_info.value.identifier == "del-miss"

    @pytest.mark.unit
    def test_delete_repo_false_not_found_resource(self):
        """Test que NotFoundException de delete (repo.delete=False) contient resource='CampaignTeamMember'."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign_team_member(mock_repo, "del-false")

        assert exc_info.value.resource == "CampaignTeamMember"
        assert exc_info.value.identifier == "del-false"

    @pytest.mark.unit
    def test_create_conflict_exception_field(self):
        """Test que ConflictException de create a le bon field 'name/role_id'."""
        bean = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Dup",
        )
        existing_member = CampaignTeamsBean(
            uuid=str(uuid.uuid4()),
            campaign_uuid="camp-uuid",
            role_id=0,
            name="Dup",
        )
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = [existing_member]

        with pytest.raises(ConflictException) as exc_info:
            create_campaign_team_member(mock_repo, bean, campaign_repository=None)

        assert exc_info.value.field == "name/role_id"
        assert "Dup" in exc_info.value.value
        assert "0" in exc_info.value.value

    @pytest.mark.unit
    def test_update_conflict_exception_field(self):
        """Test que ConflictException de update a le bon field 'name/role_id'."""
        existing = CampaignTeamsBean(
            uuid="member-uuid", campaign_uuid="camp-uuid", role_id=0, name="Old"
        )
        updated = CampaignTeamsBean(
            uuid="member-uuid", campaign_uuid="camp-uuid", role_id=1, name="Dup"
        )
        other = CampaignTeamsBean(
            uuid="other-uuid", campaign_uuid="camp-uuid", role_id=1, name="Dup"
        )
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.get_by_campaign_uuid.return_value = [other]

        with pytest.raises(ConflictException) as exc_info:
            update_campaign_team_member(mock_repo, updated)

        assert exc_info.value.field == "name/role_id"
        assert "Dup" in exc_info.value.value


class TestCampaignTeamsReturnValues:
    """Tests vérifiant les valeurs de retour."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self):
        """Test que create retourne le bean du repository."""
        bean = CampaignTeamsBean(uuid="in", campaign_uuid="", role_id=0, name="A")
        returned = CampaignTeamsBean(uuid="out", campaign_uuid="", role_id=0, name="A")
        mock_repo = MagicMock()
        mock_repo.create.return_value = returned
        mock_repo.get_by_campaign_uuid.return_value = []

        result = create_campaign_team_member(mock_repo, bean, campaign_repository=None)

        assert result is returned

    @pytest.mark.unit
    def test_update_returns_repository_result(self):
        """Test que update retourne le bean du repository."""
        existing = CampaignTeamsBean(uuid="m", campaign_uuid="c", role_id=0, name="X")
        returned = CampaignTeamsBean(uuid="m", campaign_uuid="c", role_id=0, name="Y")
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = returned

        result = update_campaign_team_member(mock_repo, existing)

        assert result is returned

    @pytest.mark.unit
    def test_get_members_returns_repository_result(self):
        """Test que get_campaign_team_members retourne la liste du repository."""
        expected = [MagicMock(), MagicMock()]
        mock_repo = MagicMock()
        mock_repo.get_by_campaign_uuid.return_value = expected

        result = get_campaign_team_members(mock_repo, "campaign-uuid")

        assert result is expected

    @pytest.mark.unit
    def test_delete_returns_true(self):
        """Test que delete retourne True en cas de succès."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_campaign_team_member(mock_repo, "uuid")

        assert result is True
