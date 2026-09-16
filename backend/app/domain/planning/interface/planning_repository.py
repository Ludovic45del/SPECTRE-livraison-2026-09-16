"""Interface IPlanningRepository - Repository abstrait pour le planning."""

import abc
import uuid as uuid_mod

from app.domain.planning.models.lab_event_bean import LabEventBean
from app.domain.planning.models.planning_campaign_step_bean import (
    PlanningCampaignStepBean,
)
from app.domain.planning.models.planning_cell_annotation_bean import (
    PlanningCellAnnotationBean,
)
from app.domain.planning.models.planning_fsec_cell_link_bean import (
    PlanningFsecCellLinkBean,
)
from app.domain.planning.models.planning_member_period_bean import (
    PlanningMemberPeriodBean,
)
from app.domain.planning.models.planning_step_bean import PlanningStepBean
from app.domain.planning.models.planning_week_state_bean import PlanningWeekStateBean


class IPlanningRepository(abc.ABC):
    """Interface abstraite pour le repository Planning."""

    # --- Week States ---

    @abc.abstractmethod
    def get_week_states_by_year(self, year: int) -> list[PlanningWeekStateBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def upsert_week_state(self, bean: PlanningWeekStateBean) -> PlanningWeekStateBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_week_state(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError

    # --- Member Periods ---

    @abc.abstractmethod
    def get_member_periods_by_year(self, year: int) -> list[PlanningMemberPeriodBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create_member_period(
        self, bean: PlanningMemberPeriodBean
    ) -> PlanningMemberPeriodBean:
        raise NotImplementedError

    @abc.abstractmethod
    def update_member_period(
        self, uuid: uuid_mod.UUID, bean: PlanningMemberPeriodBean
    ) -> PlanningMemberPeriodBean | None:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_member_period(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError

    # --- Cell Annotations ---

    @abc.abstractmethod
    def get_cell_annotations_by_year(
        self, year: int
    ) -> list[PlanningCellAnnotationBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def upsert_cell_annotation(
        self, bean: PlanningCellAnnotationBean
    ) -> PlanningCellAnnotationBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_cell_annotation(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError

    # --- FSEC Cell Links ---

    @abc.abstractmethod
    def get_fsec_cell_links_by_year(self, year: int) -> list[PlanningFsecCellLinkBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create_fsec_cell_link(
        self, bean: PlanningFsecCellLinkBean
    ) -> PlanningFsecCellLinkBean:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_fsec_cell_link(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError

    # --- Campaign Steps ---

    @abc.abstractmethod
    def get_campaign_steps_by_year(self, year: int) -> list[PlanningCampaignStepBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create_campaign_step(
        self, bean: PlanningCampaignStepBean
    ) -> PlanningCampaignStepBean:
        raise NotImplementedError

    @abc.abstractmethod
    def update_campaign_step(
        self, uuid: uuid_mod.UUID, bean: PlanningCampaignStepBean
    ) -> PlanningCampaignStepBean | None:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_campaign_step(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError

    # --- Planning Steps (referentiel) ---

    @abc.abstractmethod
    def get_planning_steps(self) -> list[PlanningStepBean]:
        raise NotImplementedError

    # --- Lab Events ---

    @abc.abstractmethod
    def get_all_lab_events(self) -> list[LabEventBean]:
        raise NotImplementedError

    @abc.abstractmethod
    def create_lab_event(self, bean: LabEventBean) -> LabEventBean:
        raise NotImplementedError

    @abc.abstractmethod
    def update_lab_event(
        self, uuid: uuid_mod.UUID, bean: LabEventBean
    ) -> LabEventBean | None:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_lab_event(self, uuid: uuid_mod.UUID) -> bool:
        raise NotImplementedError
