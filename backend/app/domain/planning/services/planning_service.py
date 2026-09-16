"""Service Planning - Logique metier pure.

Validation des dates deja assuree par DateRangeValidationMixin dans les serializers.
Ce module se concentre sur la logique metier specifique et le wrapping NotFoundException.
"""

import logging
import uuid as uuid_mod
from typing import Any, Callable, TypeVar

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.planning.interface.planning_repository import IPlanningRepository
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
from app.domain.planning.models.planning_step_bean import PlanningStepBean
from app.domain.planning.models.planning_week_state_bean import PlanningWeekStateBean

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ====================== Generic helpers ======================


def _delete_or_raise(
    repo_method: Callable[[uuid_mod.UUID], bool],
    uuid: uuid_mod.UUID,
    entity_name: str,
) -> bool:
    """Appelle repo_method(uuid) et leve NotFoundException si non trouve."""
    if not repo_method(uuid):
        raise NotFoundException(entity_name, str(uuid))
    return True


def _update_or_raise(
    repo_method: Callable[[uuid_mod.UUID, Any], T | None],
    uuid: uuid_mod.UUID,
    bean: Any,
    entity_name: str,
) -> T:
    """Appelle repo_method(uuid, bean) et leve NotFoundException si None."""
    result = repo_method(uuid, bean)
    if result is None:
        raise NotFoundException(entity_name, str(uuid))
    return result


# ====================== WEEK STATE ======================


def get_week_states_by_year(
    repository: IPlanningRepository, year: int
) -> list[PlanningWeekStateBean]:
    return repository.get_week_states_by_year(year)


def upsert_week_state(
    repository: IPlanningRepository, bean: PlanningWeekStateBean
) -> PlanningWeekStateBean:
    if bean.year < 2000 or bean.year > 2100:
        raise ValidationException("year", "L'annee doit etre entre 2000 et 2100.")
    if bean.week_num < 1 or bean.week_num > 53:
        raise ValidationException("week_num", "Doit etre entre 1 et 53.")
    if bean.state not in WEEK_STATE_CHOICES:
        raise ValidationException(
            "state",
            f"Valeur invalide '{bean.state}'. Valeurs acceptées : {WEEK_STATE_CHOICES}",
        )
    return repository.upsert_week_state(bean)


def delete_week_state(repository: IPlanningRepository, uuid: uuid_mod.UUID) -> bool:
    return _delete_or_raise(repository.delete_week_state, uuid, "PlanningWeekState")


# ====================== MEMBER PERIOD ======================


def get_member_periods_by_year(
    repository: IPlanningRepository, year: int
) -> list[PlanningMemberPeriodBean]:
    return repository.get_member_periods_by_year(year)


def create_member_period(
    repository: IPlanningRepository, bean: PlanningMemberPeriodBean
) -> PlanningMemberPeriodBean:
    if bean.start_date and bean.end_date and bean.start_date > bean.end_date:
        raise ValidationException(
            "start_date/end_date",
            "La date de début doit être antérieure ou égale à la date de fin.",
        )
    return repository.create_member_period(bean)


def update_member_period(
    repository: IPlanningRepository, uuid: uuid_mod.UUID, bean: PlanningMemberPeriodBean
) -> PlanningMemberPeriodBean:
    return _update_or_raise(
        repository.update_member_period, uuid, bean, "PlanningMemberPeriod"
    )


def delete_member_period(repository: IPlanningRepository, uuid: uuid_mod.UUID) -> bool:
    return _delete_or_raise(
        repository.delete_member_period, uuid, "PlanningMemberPeriod"
    )


# ====================== CELL ANNOTATION ======================


def get_cell_annotations_by_year(
    repository: IPlanningRepository, year: int
) -> list[PlanningCellAnnotationBean]:
    return repository.get_cell_annotations_by_year(year)


def upsert_cell_annotation(
    repository: IPlanningRepository, bean: PlanningCellAnnotationBean
) -> PlanningCellAnnotationBean:
    return repository.upsert_cell_annotation(bean)


def delete_cell_annotation(
    repository: IPlanningRepository, uuid: uuid_mod.UUID
) -> bool:
    return _delete_or_raise(
        repository.delete_cell_annotation, uuid, "PlanningCellAnnotation"
    )


# ====================== FSEC CELL LINK ======================


def get_fsec_cell_links_by_year(
    repository: IPlanningRepository, year: int
) -> list[PlanningFsecCellLinkBean]:
    return repository.get_fsec_cell_links_by_year(year)


def create_fsec_cell_link(
    repository: IPlanningRepository, bean: PlanningFsecCellLinkBean
) -> PlanningFsecCellLinkBean:
    return repository.create_fsec_cell_link(bean)


def delete_fsec_cell_link(repository: IPlanningRepository, uuid: uuid_mod.UUID) -> bool:
    return _delete_or_raise(
        repository.delete_fsec_cell_link, uuid, "PlanningFsecCellLink"
    )


# ====================== PLANNING STEP (referentiel) ======================


def get_planning_steps(repository: IPlanningRepository) -> list[PlanningStepBean]:
    return repository.get_planning_steps()


# ====================== CAMPAIGN STEP ======================


def get_campaign_steps_by_year(
    repository: IPlanningRepository, year: int
) -> list[PlanningCampaignStepBean]:
    return repository.get_campaign_steps_by_year(year)


def create_campaign_step(
    repository: IPlanningRepository, bean: PlanningCampaignStepBean
) -> PlanningCampaignStepBean:
    if bean.start_date and bean.end_date and bean.start_date > bean.end_date:
        raise ValidationException(
            "start_date/end_date",
            "La date de début doit être antérieure ou égale à la date de fin.",
        )
    return repository.create_campaign_step(bean)


def update_campaign_step(
    repository: IPlanningRepository, uuid: uuid_mod.UUID, bean: PlanningCampaignStepBean
) -> PlanningCampaignStepBean:
    if bean.start_date and bean.end_date and bean.start_date > bean.end_date:
        raise ValidationException(
            "start_date/end_date",
            "La date de début doit être antérieure ou égale à la date de fin.",
        )
    return _update_or_raise(
        repository.update_campaign_step, uuid, bean, "PlanningCampaignStep"
    )


def delete_campaign_step(repository: IPlanningRepository, uuid: uuid_mod.UUID) -> bool:
    return _delete_or_raise(
        repository.delete_campaign_step, uuid, "PlanningCampaignStep"
    )


# ====================== LAB EVENT ======================


def get_all_lab_events(repository: IPlanningRepository) -> list[LabEventBean]:
    return repository.get_all_lab_events()


def create_lab_event(
    repository: IPlanningRepository, bean: LabEventBean
) -> LabEventBean:
    return repository.create_lab_event(bean)


def update_lab_event(
    repository: IPlanningRepository, uuid: uuid_mod.UUID, bean: LabEventBean
) -> LabEventBean:
    return _update_or_raise(repository.update_lab_event, uuid, bean, "LabEvent")


def delete_lab_event(repository: IPlanningRepository, uuid: uuid_mod.UUID) -> bool:
    return _delete_or_raise(repository.delete_lab_event, uuid, "LabEvent")
