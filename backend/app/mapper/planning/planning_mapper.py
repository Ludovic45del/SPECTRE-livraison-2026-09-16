"""Mapper Planning - Conversion Entity <-> Bean <-> API.

Utilise DjangoJSONEncoder dans JsonResponse pour serialiser
uuid.UUID et datetime.date automatiquement.
"""

from __future__ import annotations

from typing import Any

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
from app.repository.planning.models.lab_event_entity import LabEventEntity
from app.repository.planning.models.planning_campaign_step_entity import (
    PlanningCampaignStepEntity,
)
from app.repository.planning.models.planning_cell_annotation_entity import (
    PlanningCellAnnotationEntity,
)
from app.repository.planning.models.planning_fsec_cell_link_entity import (
    PlanningFsecCellLinkEntity,
)
from app.repository.planning.models.planning_member_period_entity import (
    PlanningMemberPeriodEntity,
)
from app.repository.planning.models.planning_step_entity import PlanningStepEntity
from app.repository.planning.models.planning_week_state_entity import (
    PlanningWeekStateEntity,
)

# ====================== WEEK STATE ======================


def planning_week_state_entity_to_bean(
    entity: PlanningWeekStateEntity,
) -> PlanningWeekStateBean:
    return PlanningWeekStateBean(
        uuid=entity.uuid,
        year=entity.year,
        week_num=entity.week_num,
        state=entity.state,
    )


def planning_week_state_bean_to_entity(
    bean: PlanningWeekStateBean,
) -> PlanningWeekStateEntity:
    entity = PlanningWeekStateEntity(
        year=bean.year,
        week_num=bean.week_num,
        state=bean.state,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def planning_week_state_bean_to_api(bean: PlanningWeekStateBean) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "year": bean.year,
        "week_num": bean.week_num,
        "state": bean.state,
    }


def planning_week_state_api_to_bean(data: dict[str, Any]) -> PlanningWeekStateBean:
    return PlanningWeekStateBean(
        year=data["year"],
        week_num=data["week_num"],
        state=data["state"],
    )


# ====================== MEMBER PERIOD ======================


def planning_member_period_entity_to_bean(
    entity: PlanningMemberPeriodEntity,
) -> PlanningMemberPeriodBean:
    return PlanningMemberPeriodBean(
        uuid=entity.uuid,
        member_name=entity.member_name,
        member_role=entity.member_role,
        year=entity.year,
        period_type=entity.period_type,
        commentaire=entity.commentaire,
        start_date=entity.start_date,
        end_date=entity.end_date,
    )


def planning_member_period_bean_to_entity(
    bean: PlanningMemberPeriodBean,
) -> PlanningMemberPeriodEntity:
    entity = PlanningMemberPeriodEntity(
        member_name=bean.member_name,
        member_role=bean.member_role,
        year=bean.year,
        period_type=bean.period_type,
        commentaire=bean.commentaire,
        start_date=bean.start_date,
        end_date=bean.end_date,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def planning_member_period_bean_to_api(
    bean: PlanningMemberPeriodBean,
) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "member_name": bean.member_name,
        "member_role": bean.member_role,
        "year": bean.year,
        "period_type": bean.period_type,
        "commentaire": bean.commentaire,
        "start_date": bean.start_date,
        "end_date": bean.end_date,
    }


def planning_member_period_api_to_bean(
    data: dict[str, Any],
) -> PlanningMemberPeriodBean:
    return PlanningMemberPeriodBean(
        member_name=data["member_name"],
        member_role=data["member_role"],
        year=data["year"],
        period_type=data["period_type"],
        commentaire=data.get("commentaire"),
        start_date=data["start_date"],
        end_date=data["end_date"],
    )


# ====================== CELL ANNOTATION ======================


def planning_cell_annotation_entity_to_bean(
    entity: PlanningCellAnnotationEntity,
) -> PlanningCellAnnotationBean:
    return PlanningCellAnnotationBean(
        uuid=entity.uuid,
        campaign_uuid=entity.campaign_id,
        step_label=entity.step_label,
        year=entity.year,
        week_num=entity.week_num,
        text=entity.text,
    )


def planning_cell_annotation_bean_to_entity(
    bean: PlanningCellAnnotationBean,
) -> PlanningCellAnnotationEntity:
    entity = PlanningCellAnnotationEntity(
        campaign_id=bean.campaign_uuid,
        step_label=bean.step_label,
        year=bean.year,
        week_num=bean.week_num,
        text=bean.text,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def planning_cell_annotation_bean_to_api(
    bean: PlanningCellAnnotationBean,
) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "campaign_uuid": bean.campaign_uuid,
        "step_label": bean.step_label,
        "year": bean.year,
        "week_num": bean.week_num,
        "text": bean.text,
    }


def planning_cell_annotation_api_to_bean(
    data: dict[str, Any],
) -> PlanningCellAnnotationBean:
    return PlanningCellAnnotationBean(
        campaign_uuid=data["campaign_uuid"],
        step_label=data["step_label"],
        year=data["year"],
        week_num=data["week_num"],
        text=data["text"],
    )


# ====================== FSEC CELL LINK ======================


def planning_fsec_cell_link_entity_to_bean(
    entity: PlanningFsecCellLinkEntity,
) -> PlanningFsecCellLinkBean:
    return PlanningFsecCellLinkBean(
        uuid=entity.uuid,
        campaign_uuid=entity.campaign_id,
        step_label=entity.step_label,
        year=entity.year,
        week_num=entity.week_num,
        fsec_uuid=entity.fsec_uuid_id,
    )


def planning_fsec_cell_link_bean_to_entity(
    bean: PlanningFsecCellLinkBean,
) -> PlanningFsecCellLinkEntity:
    entity = PlanningFsecCellLinkEntity(
        campaign_id=bean.campaign_uuid,
        step_label=bean.step_label,
        year=bean.year,
        week_num=bean.week_num,
        fsec_uuid_id=bean.fsec_uuid,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def planning_fsec_cell_link_bean_to_api(
    bean: PlanningFsecCellLinkBean,
) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "campaign_uuid": bean.campaign_uuid,
        "step_label": bean.step_label,
        "year": bean.year,
        "week_num": bean.week_num,
        "fsec_uuid": bean.fsec_uuid,
    }


def planning_fsec_cell_link_api_to_bean(
    data: dict[str, Any],
) -> PlanningFsecCellLinkBean:
    return PlanningFsecCellLinkBean(
        campaign_uuid=data["campaign_uuid"],
        step_label=data["step_label"],
        year=data["year"],
        week_num=data["week_num"],
        fsec_uuid=data["fsec_uuid"],
    )


# ====================== LAB EVENT ======================


def lab_event_entity_to_bean(entity: LabEventEntity) -> LabEventBean:
    return LabEventBean(
        uuid=entity.uuid,
        machine_uuid=entity.machine_id,
        category=entity.category,
        description=entity.description,
        start_date=entity.start_date,
        end_date=entity.end_date,
    )


def lab_event_bean_to_entity(bean: LabEventBean) -> LabEventEntity:
    entity = LabEventEntity(
        machine_id=bean.machine_uuid,
        category=bean.category,
        description=bean.description,
        start_date=bean.start_date,
        end_date=bean.end_date,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def lab_event_bean_to_api(bean: LabEventBean) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "machine_uuid": bean.machine_uuid,
        "category": bean.category,
        "description": bean.description,
        "start_date": bean.start_date,
        "end_date": bean.end_date,
    }


def lab_event_api_to_bean(data: dict[str, Any]) -> LabEventBean:
    return LabEventBean(
        machine_uuid=data["machine_uuid"],
        category=data["category"],
        description=data.get("description", ""),
        start_date=data["start_date"],
        end_date=data["end_date"],
    )


# ====================== CAMPAIGN STEP ======================


def planning_campaign_step_entity_to_bean(
    entity: PlanningCampaignStepEntity,
) -> PlanningCampaignStepBean:
    return PlanningCampaignStepBean(
        uuid=entity.uuid,
        campaign_uuid=entity.campaign_id,
        fsec_uuid=entity.fsec_uuid_id,
        step_label=entity.step_label,
        year=entity.year,
        start_date=entity.start_date,
        end_date=entity.end_date,
    )


def planning_campaign_step_bean_to_entity(
    bean: PlanningCampaignStepBean,
) -> PlanningCampaignStepEntity:
    entity = PlanningCampaignStepEntity(
        campaign_id=bean.campaign_uuid,
        fsec_uuid_id=bean.fsec_uuid,
        step_label=bean.step_label,
        year=bean.year,
        start_date=bean.start_date,
        end_date=bean.end_date,
    )
    if bean.uuid:
        entity.uuid = bean.uuid
    return entity


def planning_campaign_step_bean_to_api(
    bean: PlanningCampaignStepBean,
) -> dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "campaign_uuid": bean.campaign_uuid,
        "fsec_uuid": bean.fsec_uuid,
        "step_label": bean.step_label,
        "year": bean.year,
        "start_date": bean.start_date,
        "end_date": bean.end_date,
    }


def planning_campaign_step_api_to_bean(
    data: dict[str, Any],
) -> PlanningCampaignStepBean:
    return PlanningCampaignStepBean(
        campaign_uuid=data["campaign_uuid"],
        fsec_uuid=data["fsec_uuid"],
        step_label=data["step_label"],
        year=data["year"],
        start_date=data["start_date"],
        end_date=data["end_date"],
    )


# ====================== PLANNING STEP (referentiel) ======================


def planning_step_entity_to_bean(entity: PlanningStepEntity) -> PlanningStepBean:
    return PlanningStepBean(
        id=entity.id,
        label=entity.label,
        color=entity.color,
        display_order=entity.display_order,
        min_status_for_done=entity.min_status_for_done,
        use_shooting_date=entity.use_shooting_date,
        gas_only=entity.gas_only,
    )


def planning_step_bean_to_api(bean: PlanningStepBean) -> dict[str, Any]:
    return {
        "id": bean.id,
        "label": bean.label,
        "color": bean.color,
        "display_order": bean.display_order,
        "min_status_for_done": bean.min_status_for_done,
        "use_shooting_date": bean.use_shooting_date,
        "gas_only": bean.gas_only,
    }
