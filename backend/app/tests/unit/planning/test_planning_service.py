"""
Tests unitaires pour le service Planning.

Verifie la logique metier pure (validation week_num, gestion des erreurs)
sans dependance a la base de donnees.
Note: la validation des dates est faite par DateRangeValidationMixin dans les serializers.
Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.planning.models.lab_event_bean import LabEventBean
from app.domain.planning.models.planning_campaign_step_bean import (
    PlanningCampaignStepBean,
)
from app.domain.planning.models.planning_cell_annotation_bean import (
    PlanningCellAnnotationBean,
)
from app.domain.planning.models.planning_constants import WEEK_STATE_CHOICES
from app.domain.planning.models.planning_fsec_cell_link_bean import (
    PlanningFsecCellLinkBean,
)
from app.domain.planning.models.planning_member_period_bean import (
    PlanningMemberPeriodBean,
)
from app.domain.planning.models.planning_week_state_bean import PlanningWeekStateBean
from app.domain.planning.services import planning_service as svc


@pytest.fixture
def mock_repo():
    return MagicMock()


# ============================================================================
# Module-level constants and logger
# ============================================================================


@pytest.mark.unit
class TestModuleLevelAttributes:

    def test_logger_exists(self):
        assert svc.logger is not None
        assert isinstance(svc.logger, logging.Logger)


# ====================== Generic helpers ======================


@pytest.mark.unit
class TestDeleteOrRaise:
    """Tests pour le helper _delete_or_raise."""

    def test_raises_when_not_found(self):
        repo_method = MagicMock(return_value=False)
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc._delete_or_raise(repo_method, uid, "TestEntity")
        assert exc_info.value.resource == "TestEntity"
        assert str(uid) in exc_info.value.identifier

    def test_returns_true_on_success(self):
        repo_method = MagicMock(return_value=True)
        assert svc._delete_or_raise(repo_method, uuid.uuid4(), "TestEntity") is True

    def test_calls_repo_method_with_uuid(self):
        uid = uuid.uuid4()
        repo_method = MagicMock(return_value=True)
        svc._delete_or_raise(repo_method, uid, "TestEntity")
        repo_method.assert_called_once_with(uid)

    def test_entity_name_in_exception(self):
        repo_method = MagicMock(return_value=False)
        with pytest.raises(NotFoundException) as exc_info:
            svc._delete_or_raise(repo_method, uuid.uuid4(), "SpecialEntity")
        assert exc_info.value.resource == "SpecialEntity"


@pytest.mark.unit
class TestUpdateOrRaise:
    """Tests pour le helper _update_or_raise."""

    def test_raises_when_not_found(self):
        repo_method = MagicMock(return_value=None)
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc._update_or_raise(repo_method, uid, "bean", "TestEntity")
        assert exc_info.value.resource == "TestEntity"
        assert str(uid) in exc_info.value.identifier

    def test_returns_result_on_success(self):
        expected = LabEventBean(category="Maintenance")
        repo_method = MagicMock(return_value=expected)
        result = svc._update_or_raise(repo_method, uuid.uuid4(), expected, "LabEvent")
        assert result is expected

    def test_calls_repo_method_with_uuid_and_bean(self):
        uid = uuid.uuid4()
        bean = LabEventBean(category="Panne")
        repo_method = MagicMock(return_value=bean)
        svc._update_or_raise(repo_method, uid, bean, "LabEvent")
        repo_method.assert_called_once_with(uid, bean)


# ====================== WEEK STATE ======================


@pytest.mark.unit
class TestWeekStateService:
    """Tests pour la gestion des etats de semaine."""

    def test_get_week_states_by_year_delegates(self, mock_repo):
        expected = [PlanningWeekStateBean(year=2025, week_num=1, state="vacances")]
        mock_repo.get_week_states_by_year.return_value = expected
        result = svc.get_week_states_by_year(mock_repo, 2025)
        assert result is expected
        mock_repo.get_week_states_by_year.assert_called_once_with(2025)

    def test_upsert_valid_vacances(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=1, state="vacances")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.state == "vacances"
        mock_repo.upsert_week_state.assert_called_once_with(bean)

    def test_upsert_valid_fermeture(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=10, state="fermeture")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.state == "fermeture"

    def test_upsert_week53_valid(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=53, state="fermeture")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.week_num == 53

    def test_upsert_week1_valid(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=1, state="vacances")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.week_num == 1

    def test_upsert_week0_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=0, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "week_num"

    def test_upsert_week54_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=54, state="fermeture")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "week_num"

    def test_upsert_negative_week_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=-1, state="vacances")
        with pytest.raises(ValidationException):
            svc.upsert_week_state(mock_repo, bean)

    def test_upsert_year_2000_valid(self, mock_repo):
        bean = PlanningWeekStateBean(year=2000, week_num=1, state="vacances")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.year == 2000

    def test_upsert_year_2100_valid(self, mock_repo):
        bean = PlanningWeekStateBean(year=2100, week_num=1, state="vacances")
        mock_repo.upsert_week_state.return_value = bean
        result = svc.upsert_week_state(mock_repo, bean)
        assert result.year == 2100

    def test_upsert_year_1999_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=1999, week_num=1, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "year"

    def test_upsert_year_2101_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2101, week_num=1, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "year"

    def test_upsert_invalid_state_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=1, state="invalid")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "state"

    def test_upsert_empty_state_raises(self, mock_repo):
        bean = PlanningWeekStateBean(year=2025, week_num=1, state="")
        with pytest.raises(ValidationException):
            svc.upsert_week_state(mock_repo, bean)

    def test_upsert_validates_year_before_week(self, mock_repo):
        """Year 1999 should raise before week_num is checked."""
        bean = PlanningWeekStateBean(year=1999, week_num=0, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "year"

    def test_upsert_validates_week_before_state(self, mock_repo):
        """Invalid week should raise before state is checked."""
        bean = PlanningWeekStateBean(year=2025, week_num=0, state="invalid")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert exc_info.value.field == "week_num"

    def test_week_state_choices_contains_vacances_and_fermeture(self):
        assert "vacances" in WEEK_STATE_CHOICES
        assert "fermeture" in WEEK_STATE_CHOICES

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_week_state.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_week_state(mock_repo, uid)
        assert exc_info.value.resource == "PlanningWeekState"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_week_state.return_value = True
        assert svc.delete_week_state(mock_repo, uuid.uuid4()) is True


# ====================== MEMBER PERIOD ======================


@pytest.mark.unit
class TestMemberPeriodService:
    """Tests pour la gestion des periodes de membres."""

    def test_get_member_periods_by_year_delegates(self, mock_repo):
        expected = [PlanningMemberPeriodBean(member_name="Jean", year=2025)]
        mock_repo.get_member_periods_by_year.return_value = expected
        result = svc.get_member_periods_by_year(mock_repo, 2025)
        assert result is expected
        mock_repo.get_member_periods_by_year.assert_called_once_with(2025)

    def test_create_delegates_to_repo(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            member_name="Jean Dupont",
            member_role="Assembleur",
            year=2025,
            period_type="conge",
            start_date=date(2025, 7, 1),
            end_date=date(2025, 7, 15),
        )
        mock_repo.create_member_period.return_value = bean
        result = svc.create_member_period(mock_repo, bean)
        assert result.member_name == "Jean Dupont"
        mock_repo.create_member_period.assert_called_once_with(bean)

    def test_create_same_dates_valid(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            start_date=date(2025, 7, 1),
            end_date=date(2025, 7, 1),
        )
        mock_repo.create_member_period.return_value = bean
        result = svc.create_member_period(mock_repo, bean)
        assert result.start_date == result.end_date

    def test_create_no_dates_valid(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            start_date=None,
            end_date=None,
        )
        mock_repo.create_member_period.return_value = bean
        result = svc.create_member_period(mock_repo, bean)
        assert result is bean

    def test_create_start_only_valid(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            start_date=date(2025, 7, 1),
            end_date=None,
        )
        mock_repo.create_member_period.return_value = bean
        result = svc.create_member_period(mock_repo, bean)
        assert result is bean

    def test_create_end_only_valid(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            start_date=None,
            end_date=date(2025, 7, 15),
        )
        mock_repo.create_member_period.return_value = bean
        result = svc.create_member_period(mock_repo, bean)
        assert result is bean

    def test_create_start_after_end_raises(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            member_name="Jean Dupont",
            member_role="Assembleur",
            year=2025,
            period_type="congés",
            start_date=date(2025, 7, 15),
            end_date=date(2025, 7, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.create_member_period(mock_repo, bean)
        assert exc_info.value.field == "start_date/end_date"

    def test_update_success(self, mock_repo):
        bean = PlanningMemberPeriodBean(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )
        uid = uuid.uuid4()
        mock_repo.update_member_period.return_value = bean
        result = svc.update_member_period(mock_repo, uid, bean)
        assert result is bean
        mock_repo.update_member_period.assert_called_once_with(uid, bean)

    def test_update_not_found_raises(self, mock_repo):
        mock_repo.update_member_period.return_value = None
        bean = PlanningMemberPeriodBean(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.update_member_period(mock_repo, uid, bean)
        assert exc_info.value.resource == "PlanningMemberPeriod"

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_member_period.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_member_period(mock_repo, uid)
        assert exc_info.value.resource == "PlanningMemberPeriod"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_member_period.return_value = True
        assert svc.delete_member_period(mock_repo, uuid.uuid4()) is True


# ====================== CELL ANNOTATION ======================


@pytest.mark.unit
class TestCellAnnotationService:
    """Tests pour la gestion des annotations de cellules."""

    def test_get_cell_annotations_by_year_delegates(self, mock_repo):
        expected = [PlanningCellAnnotationBean(year=2025, text="Note")]
        mock_repo.get_cell_annotations_by_year.return_value = expected
        result = svc.get_cell_annotations_by_year(mock_repo, 2025)
        assert result is expected
        mock_repo.get_cell_annotations_by_year.assert_called_once_with(2025)

    def test_upsert_delegates(self, mock_repo):
        bean = PlanningCellAnnotationBean(
            campaign_uuid=uuid.uuid4(),
            step_label="Assemblage",
            year=2025,
            week_num=10,
            text="Note test",
        )
        mock_repo.upsert_cell_annotation.return_value = bean
        result = svc.upsert_cell_annotation(mock_repo, bean)
        assert result is bean
        mock_repo.upsert_cell_annotation.assert_called_once_with(bean)

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_cell_annotation.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_cell_annotation(mock_repo, uid)
        assert exc_info.value.resource == "PlanningCellAnnotation"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_cell_annotation.return_value = True
        assert svc.delete_cell_annotation(mock_repo, uuid.uuid4()) is True


# ====================== FSEC CELL LINK ======================


@pytest.mark.unit
class TestFsecCellLinkService:
    """Tests pour la gestion des liens FSEC-cellule."""

    def test_get_fsec_cell_links_by_year_delegates(self, mock_repo):
        expected = [PlanningFsecCellLinkBean(year=2025)]
        mock_repo.get_fsec_cell_links_by_year.return_value = expected
        result = svc.get_fsec_cell_links_by_year(mock_repo, 2025)
        assert result is expected
        mock_repo.get_fsec_cell_links_by_year.assert_called_once_with(2025)

    def test_create_delegates(self, mock_repo):
        bean = PlanningFsecCellLinkBean(
            campaign_uuid=uuid.uuid4(),
            step_label="Assemblage",
            year=2025,
            week_num=10,
            fsec_uuid=uuid.uuid4(),
        )
        mock_repo.create_fsec_cell_link.return_value = bean
        result = svc.create_fsec_cell_link(mock_repo, bean)
        assert result is bean
        mock_repo.create_fsec_cell_link.assert_called_once_with(bean)

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_fsec_cell_link.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_fsec_cell_link(mock_repo, uid)
        assert exc_info.value.resource == "PlanningFsecCellLink"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_fsec_cell_link.return_value = True
        assert svc.delete_fsec_cell_link(mock_repo, uuid.uuid4()) is True


# ====================== CAMPAIGN STEP ======================


@pytest.mark.unit
class TestCampaignStepService:
    """Tests pour la gestion des etapes de campagne."""

    def test_get_campaign_steps_by_year_delegates(self, mock_repo):
        expected = [PlanningCampaignStepBean(year=2025)]
        mock_repo.get_campaign_steps_by_year.return_value = expected
        result = svc.get_campaign_steps_by_year(mock_repo, 2025)
        assert result is expected
        mock_repo.get_campaign_steps_by_year.assert_called_once_with(2025)

    def test_create_delegates_to_repo(self, mock_repo):
        bean = PlanningCampaignStepBean(
            campaign_uuid=uuid.uuid4(),
            fsec_uuid=uuid.uuid4(),
            step_label="Assemblage",
            year=2025,
            start_date=date(2025, 3, 1),
            end_date=date(2025, 3, 15),
        )
        mock_repo.create_campaign_step.return_value = bean
        result = svc.create_campaign_step(mock_repo, bean)
        assert result.step_label == "Assemblage"
        mock_repo.create_campaign_step.assert_called_once_with(bean)

    def test_create_same_dates_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 3, 1),
            end_date=date(2025, 3, 1),
        )
        mock_repo.create_campaign_step.return_value = bean
        result = svc.create_campaign_step(mock_repo, bean)
        assert result.start_date == result.end_date

    def test_create_no_dates_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(start_date=None, end_date=None)
        mock_repo.create_campaign_step.return_value = bean
        result = svc.create_campaign_step(mock_repo, bean)
        assert result is bean

    def test_create_start_only_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(start_date=date(2025, 3, 1), end_date=None)
        mock_repo.create_campaign_step.return_value = bean
        result = svc.create_campaign_step(mock_repo, bean)
        assert result is bean

    def test_create_end_only_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(start_date=None, end_date=date(2025, 3, 15))
        mock_repo.create_campaign_step.return_value = bean
        result = svc.create_campaign_step(mock_repo, bean)
        assert result is bean

    def test_create_start_after_end_raises(self, mock_repo):
        bean = PlanningCampaignStepBean(
            campaign_uuid=uuid.uuid4(),
            fsec_uuid=uuid.uuid4(),
            step_label="Assemblage",
            year=2025,
            start_date=date(2025, 3, 15),
            end_date=date(2025, 3, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.create_campaign_step(mock_repo, bean)
        assert exc_info.value.field == "start_date/end_date"

    def test_update_success(self, mock_repo):
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )
        uid = uuid.uuid4()
        mock_repo.update_campaign_step.return_value = bean
        result = svc.update_campaign_step(mock_repo, uid, bean)
        assert result is bean

    def test_update_start_after_end_raises(self, mock_repo):
        bean = PlanningCampaignStepBean(
            campaign_uuid=uuid.uuid4(),
            fsec_uuid=uuid.uuid4(),
            step_label="Métrologie",
            year=2025,
            start_date=date(2025, 6, 30),
            end_date=date(2025, 6, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.update_campaign_step(mock_repo, uuid.uuid4(), bean)
        assert exc_info.value.field == "start_date/end_date"

    def test_update_same_dates_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 1),
        )
        uid = uuid.uuid4()
        mock_repo.update_campaign_step.return_value = bean
        result = svc.update_campaign_step(mock_repo, uid, bean)
        assert result is bean

    def test_update_no_dates_valid(self, mock_repo):
        bean = PlanningCampaignStepBean(start_date=None, end_date=None)
        uid = uuid.uuid4()
        mock_repo.update_campaign_step.return_value = bean
        result = svc.update_campaign_step(mock_repo, uid, bean)
        assert result is bean

    def test_update_not_found_raises(self, mock_repo):
        mock_repo.update_campaign_step.return_value = None
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.update_campaign_step(mock_repo, uid, bean)
        assert exc_info.value.resource == "PlanningCampaignStep"

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_campaign_step.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_campaign_step(mock_repo, uid)
        assert exc_info.value.resource == "PlanningCampaignStep"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_campaign_step.return_value = True
        assert svc.delete_campaign_step(mock_repo, uuid.uuid4()) is True


# ====================== LAB EVENT ======================


@pytest.mark.unit
class TestLabEventService:
    """Tests pour la gestion des evenements labo."""

    def test_get_all_lab_events_delegates(self, mock_repo):
        expected = [LabEventBean(category="Maintenance")]
        mock_repo.get_all_lab_events.return_value = expected
        result = svc.get_all_lab_events(mock_repo)
        assert result is expected
        mock_repo.get_all_lab_events.assert_called_once()

    def test_create_delegates_to_repo(self, mock_repo):
        bean = LabEventBean(
            machine_uuid=uuid.uuid4(),
            category="Maintenance",
            description="Nettoyage",
            start_date=date(2025, 4, 1),
            end_date=date(2025, 4, 3),
        )
        mock_repo.create_lab_event.return_value = bean
        result = svc.create_lab_event(mock_repo, bean)
        assert result.category == "Maintenance"
        mock_repo.create_lab_event.assert_called_once_with(bean)

    def test_update_success(self, mock_repo):
        bean = LabEventBean(category="Panne", description="Reparation")
        uid = uuid.uuid4()
        mock_repo.update_lab_event.return_value = bean
        result = svc.update_lab_event(mock_repo, uid, bean)
        assert result is bean

    def test_update_not_found_raises(self, mock_repo):
        mock_repo.update_lab_event.return_value = None
        bean = LabEventBean(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.update_lab_event(mock_repo, uid, bean)
        assert exc_info.value.resource == "LabEvent"

    def test_delete_not_found_raises(self, mock_repo):
        mock_repo.delete_lab_event.return_value = False
        uid = uuid.uuid4()
        with pytest.raises(NotFoundException) as exc_info:
            svc.delete_lab_event(mock_repo, uid)
        assert exc_info.value.resource == "LabEvent"

    def test_delete_success(self, mock_repo):
        mock_repo.delete_lab_event.return_value = True
        assert svc.delete_lab_event(mock_repo, uuid.uuid4()) is True


# ============================================================================
# MUTATION-KILLING: TypeVar name, error messages, logger
# ============================================================================


@pytest.mark.unit
class TestPlanningServiceMutationKilling:
    """Kill remaining mutants on TypeVar name, error messages, and logger."""

    def test_typevar_T_name(self):
        """Kill TypeVar name mutation: T = TypeVar('T') -> TypeVar('XXTXX')."""
        from app.domain.planning.services.planning_service import T

        assert T.__name__ == "T"

    def test_upsert_week_state_year_error_message(self, mock_repo):
        """Verify year error message content."""
        bean = PlanningWeekStateBean(year=1999, week_num=1, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert "2000" in str(exc_info.value) or "annee" in str(exc_info.value).lower()

    def test_upsert_week_state_week_error_message(self, mock_repo):
        """Verify week_num error message content."""
        bean = PlanningWeekStateBean(year=2025, week_num=0, state="vacances")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        assert "1" in str(exc_info.value) and "53" in str(exc_info.value)

    def test_upsert_week_state_invalid_state_error_message(self, mock_repo):
        """Verify state error message contains the invalid value and WEEK_STATE_CHOICES."""
        bean = PlanningWeekStateBean(year=2025, week_num=1, state="invalid_state")
        with pytest.raises(ValidationException) as exc_info:
            svc.upsert_week_state(mock_repo, bean)
        msg = str(exc_info.value)
        assert "invalid_state" in msg

    def test_create_member_period_date_error_message(self, mock_repo):
        """Verify date validation error message."""
        bean = PlanningMemberPeriodBean(
            start_date=date(2025, 7, 15),
            end_date=date(2025, 7, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.create_member_period(mock_repo, bean)
        msg = str(exc_info.value)
        assert "date" in msg.lower()

    def test_create_campaign_step_date_error_message(self, mock_repo):
        """Verify campaign step date validation error message."""
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 3, 15),
            end_date=date(2025, 3, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.create_campaign_step(mock_repo, bean)
        msg = str(exc_info.value)
        assert "date" in msg.lower()

    def test_update_campaign_step_date_error_message(self, mock_repo):
        """Verify update campaign step date validation error message."""
        bean = PlanningCampaignStepBean(
            start_date=date(2025, 6, 30),
            end_date=date(2025, 6, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            svc.update_campaign_step(mock_repo, uuid.uuid4(), bean)
        msg = str(exc_info.value)
        assert "date" in msg.lower()
