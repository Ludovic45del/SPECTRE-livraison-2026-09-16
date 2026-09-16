"""Controllers Planning - API REST pour les donnees de planning."""

from app.api.planning.base_planning_controller import BasePlanningController
from app.api.planning.serializers import (
    LabEventSerializer,
    PlanningCampaignStepSerializer,
    PlanningCellAnnotationSerializer,
    PlanningFsecCellLinkSerializer,
    PlanningMemberPeriodSerializer,
    PlanningWeekStateSerializer,
)
from app.domain.planning.services.planning_service import (
    create_campaign_step,
    create_fsec_cell_link,
    create_lab_event,
    create_member_period,
    delete_campaign_step,
    delete_cell_annotation,
    delete_fsec_cell_link,
    delete_lab_event,
    delete_member_period,
    delete_week_state,
    get_all_lab_events,
    get_campaign_steps_by_year,
    get_cell_annotations_by_year,
    get_fsec_cell_links_by_year,
    get_member_periods_by_year,
    get_planning_steps,
    get_week_states_by_year,
    update_campaign_step,
    update_lab_event,
    update_member_period,
    upsert_cell_annotation,
    upsert_week_state,
)
from app.mapper.planning.planning_mapper import (
    lab_event_api_to_bean,
    lab_event_bean_to_api,
    planning_campaign_step_api_to_bean,
    planning_campaign_step_bean_to_api,
    planning_cell_annotation_api_to_bean,
    planning_cell_annotation_bean_to_api,
    planning_fsec_cell_link_api_to_bean,
    planning_fsec_cell_link_bean_to_api,
    planning_member_period_api_to_bean,
    planning_member_period_bean_to_api,
    planning_step_bean_to_api,
    planning_week_state_api_to_bean,
    planning_week_state_bean_to_api,
)

# ====================== Planning Entities ======================


class PlanningWeekStateController(BasePlanningController):
    """Etats de semaines (vacances/fermeture)."""

    serializer_class = PlanningWeekStateSerializer
    mapper_api_to_bean = staticmethod(planning_week_state_api_to_bean)
    mapper_bean_to_api = staticmethod(planning_week_state_bean_to_api)
    service_list = staticmethod(get_week_states_by_year)
    service_create = staticmethod(upsert_week_state)
    service_delete = staticmethod(delete_week_state)
    list_mode = "year"
    entity_name = "PlanningWeekState"


class PlanningMemberPeriodController(BasePlanningController):
    """Disponibilites des membres d'equipe."""

    serializer_class = PlanningMemberPeriodSerializer
    mapper_api_to_bean = staticmethod(planning_member_period_api_to_bean)
    mapper_bean_to_api = staticmethod(planning_member_period_bean_to_api)
    service_list = staticmethod(get_member_periods_by_year)
    service_create = staticmethod(create_member_period)
    service_update = staticmethod(update_member_period)
    service_delete = staticmethod(delete_member_period)
    list_mode = "year"
    entity_name = "PlanningMemberPeriod"


class PlanningCellAnnotationController(BasePlanningController):
    """Annotations de cellules campagne."""

    serializer_class = PlanningCellAnnotationSerializer
    mapper_api_to_bean = staticmethod(planning_cell_annotation_api_to_bean)
    mapper_bean_to_api = staticmethod(planning_cell_annotation_bean_to_api)
    service_list = staticmethod(get_cell_annotations_by_year)
    service_create = staticmethod(upsert_cell_annotation)
    service_delete = staticmethod(delete_cell_annotation)
    list_mode = "year"
    entity_name = "PlanningCellAnnotation"


class PlanningFsecCellLinkController(BasePlanningController):
    """Liens FSEC -> cellule planning."""

    serializer_class = PlanningFsecCellLinkSerializer
    mapper_api_to_bean = staticmethod(planning_fsec_cell_link_api_to_bean)
    mapper_bean_to_api = staticmethod(planning_fsec_cell_link_bean_to_api)
    service_list = staticmethod(get_fsec_cell_links_by_year)
    service_create = staticmethod(create_fsec_cell_link)
    service_delete = staticmethod(delete_fsec_cell_link)
    list_mode = "year"
    entity_name = "PlanningFsecCellLink"


class PlanningCampaignStepController(BasePlanningController):
    """Etapes programmees des campagnes."""

    serializer_class = PlanningCampaignStepSerializer
    mapper_api_to_bean = staticmethod(planning_campaign_step_api_to_bean)
    mapper_bean_to_api = staticmethod(planning_campaign_step_bean_to_api)
    service_list = staticmethod(get_campaign_steps_by_year)
    service_create = staticmethod(create_campaign_step)
    service_update = staticmethod(update_campaign_step)
    service_delete = staticmethod(delete_campaign_step)
    list_mode = "year"
    entity_name = "PlanningCampaignStep"


class PlanningStepController(BasePlanningController):
    """Referentiel des etapes de planning campagne (lecture seule)."""

    http_method_names = ["get", "options", "head"]
    mapper_bean_to_api = staticmethod(planning_step_bean_to_api)
    service_list = staticmethod(get_planning_steps)
    list_mode = "all"
    entity_name = "PlanningStep"


# ====================== Lab Entities ======================


class LabEventController(BasePlanningController):
    """Evenements du laboratoire."""

    serializer_class = LabEventSerializer
    mapper_api_to_bean = staticmethod(lab_event_api_to_bean)
    mapper_bean_to_api = staticmethod(lab_event_bean_to_api)
    service_list = staticmethod(get_all_lab_events)
    service_create = staticmethod(create_lab_event)
    service_update = staticmethod(update_lab_event)
    service_delete = staticmethod(delete_lab_event)
    list_mode = "all"
    entity_name = "LabEvent"
