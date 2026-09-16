"""
Tests unitaires pour le mapper Planning.

Verifie les conversions entity -> bean, api -> bean, bean -> api
pour tous les types du planning.
"""

import uuid
from datetime import date

import pytest

from app.domain.planning.models.lab_event_bean import LabEventBean
from app.domain.planning.models.planning_campaign_step_bean import (
    PlanningCampaignStepBean,
)
from app.domain.planning.models.planning_member_period_bean import (
    PlanningMemberPeriodBean,
)
from app.domain.planning.models.planning_step_bean import PlanningStepBean
from app.domain.planning.models.planning_week_state_bean import PlanningWeekStateBean
from app.mapper.planning.planning_mapper import (
    lab_event_api_to_bean,
    lab_event_bean_to_api,
    planning_campaign_step_api_to_bean,
    planning_campaign_step_bean_to_api,
    planning_cell_annotation_api_to_bean,
    planning_fsec_cell_link_api_to_bean,
    planning_member_period_api_to_bean,
    planning_member_period_bean_to_api,
    planning_step_bean_to_api,
    planning_step_entity_to_bean,
    planning_week_state_api_to_bean,
    planning_week_state_bean_to_api,
)
from app.repository.planning.models.planning_step_entity import PlanningStepEntity

# ====================== WEEK STATE ======================


class TestWeekStateMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        data = {"year": 2025, "week_num": 12, "state": "vacances"}
        bean = planning_week_state_api_to_bean(data)
        assert bean.year == 2025
        assert bean.week_num == 12
        assert bean.state == "vacances"
        assert bean.uuid is None

    @pytest.mark.unit
    def test_bean_to_api(self):
        uid = uuid.uuid4()
        bean = PlanningWeekStateBean(
            uuid=uid, year=2025, week_num=12, state="fermeture"
        )
        result = planning_week_state_bean_to_api(bean)
        assert result["uuid"] == uid
        assert result["year"] == 2025
        assert result["week_num"] == 12
        assert result["state"] == "fermeture"

    @pytest.mark.unit
    def test_roundtrip_api(self):
        """bean -> api -> bean preserves data."""
        bean = PlanningWeekStateBean(
            uuid=uuid.uuid4(), year=2025, week_num=1, state="vacances"
        )
        api = planning_week_state_bean_to_api(bean)
        restored = planning_week_state_api_to_bean(api)
        assert restored.year == bean.year
        assert restored.week_num == bean.week_num
        assert restored.state == bean.state


# ====================== MEMBER PERIOD ======================


class TestMemberPeriodMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        data = {
            "member_name": "Marie Dupont",
            "member_role": "Assembleur",
            "year": 2025,
            "period_type": "conge",
            "commentaire": "Vacances ete",
            "start_date": date(2025, 7, 1),
            "end_date": date(2025, 7, 15),
        }
        bean = planning_member_period_api_to_bean(data)
        assert bean.member_name == "Marie Dupont"
        assert bean.period_type == "conge"
        assert bean.commentaire == "Vacances ete"
        assert bean.start_date == date(2025, 7, 1)

    @pytest.mark.unit
    def test_api_to_bean_no_commentaire(self):
        data = {
            "member_name": "Jean",
            "member_role": "Metrologue",
            "year": 2025,
            "period_type": "formation",
            "start_date": date(2025, 1, 1),
            "end_date": date(2025, 1, 5),
        }
        bean = planning_member_period_api_to_bean(data)
        assert bean.commentaire is None

    @pytest.mark.unit
    def test_bean_to_api_preserves_native_types(self):
        """Les types natifs (UUID, date) sont preserves dans la sortie API."""
        uid = uuid.uuid4()
        bean = PlanningMemberPeriodBean(
            uuid=uid,
            member_name="Test",
            member_role="Assembleur",
            year=2025,
            period_type="conge",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
        )
        result = planning_member_period_bean_to_api(bean)
        assert result["uuid"] == uid  # UUID natif, pas str
        assert result["start_date"] == date(2025, 1, 1)  # date native, pas str


# ====================== CELL ANNOTATION ======================


class TestCellAnnotationMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        uid = uuid.uuid4()
        data = {
            "campaign_uuid": uid,
            "step_label": "Assemblage",
            "year": 2025,
            "week_num": 15,
            "text": "RAS",
        }
        bean = planning_cell_annotation_api_to_bean(data)
        assert bean.campaign_uuid == uid
        assert bean.step_label == "Assemblage"
        assert bean.text == "RAS"


# ====================== FSEC CELL LINK ======================


class TestFsecCellLinkMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        c_uuid = uuid.uuid4()
        f_uuid = uuid.uuid4()
        data = {
            "campaign_uuid": c_uuid,
            "step_label": "Metrologie",
            "year": 2025,
            "week_num": 20,
            "fsec_uuid": f_uuid,
        }
        bean = planning_fsec_cell_link_api_to_bean(data)
        assert bean.campaign_uuid == c_uuid
        assert bean.fsec_uuid == f_uuid


# ====================== LAB EVENT ======================


class TestLabEventMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        m_uuid = uuid.uuid4()
        data = {
            "machine_uuid": m_uuid,
            "category": "Maintenance",
            "description": "Nettoyage hebdo",
            "start_date": date(2025, 5, 1),
            "end_date": date(2025, 5, 3),
        }
        bean = lab_event_api_to_bean(data)
        assert bean.machine_uuid == m_uuid
        assert bean.category == "Maintenance"
        assert bean.start_date == date(2025, 5, 1)

    @pytest.mark.unit
    def test_api_to_bean_no_description(self):
        data = {
            "machine_uuid": uuid.uuid4(),
            "category": "Panne",
            "start_date": date(2025, 5, 1),
            "end_date": date(2025, 5, 1),
        }
        bean = lab_event_api_to_bean(data)
        assert bean.description == ""

    @pytest.mark.unit
    def test_bean_to_api(self):
        uid = uuid.uuid4()
        m_uuid = uuid.uuid4()
        bean = LabEventBean(
            uuid=uid,
            machine_uuid=m_uuid,
            category="Calibration",
            description="Annuelle",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 6, 2),
        )
        result = lab_event_bean_to_api(bean)
        assert result["uuid"] == uid
        assert result["machine_uuid"] == m_uuid
        assert result["category"] == "Calibration"


# ====================== CAMPAIGN STEP ======================


class TestCampaignStepMapper:

    @pytest.mark.unit
    def test_api_to_bean(self):
        c_uuid = uuid.uuid4()
        f_uuid = uuid.uuid4()
        data = {
            "campaign_uuid": c_uuid,
            "fsec_uuid": f_uuid,
            "step_label": "Assemblage",
            "year": 2025,
            "start_date": date(2025, 3, 1),
            "end_date": date(2025, 3, 15),
        }
        bean = planning_campaign_step_api_to_bean(data)
        assert bean.campaign_uuid == c_uuid
        assert bean.fsec_uuid == f_uuid
        assert bean.step_label == "Assemblage"

    @pytest.mark.unit
    def test_bean_to_api(self):
        uid = uuid.uuid4()
        bean = PlanningCampaignStepBean(
            uuid=uid,
            campaign_uuid=uuid.uuid4(),
            fsec_uuid=uuid.uuid4(),
            step_label="Scellement",
            year=2025,
            start_date=date(2025, 4, 1),
            end_date=date(2025, 4, 10),
        )
        result = planning_campaign_step_bean_to_api(bean)
        assert result["uuid"] == uid
        assert result["step_label"] == "Scellement"


# ====================== PLANNING STEP (referentiel) ======================


class TestPlanningStepMapper:

    @pytest.mark.unit
    def test_entity_to_bean(self):
        entity = PlanningStepEntity(
            id=3,
            label="Gaz",
            color="#8b5cf6",
            display_order=3,
            min_status_for_done=5,
            use_shooting_date=False,
            gas_only=True,
        )
        bean = planning_step_entity_to_bean(entity)
        assert bean.id == 3
        assert bean.label == "Gaz"
        assert bean.color == "#8b5cf6"
        assert bean.display_order == 3
        assert bean.min_status_for_done == 5
        assert bean.gas_only is True

    @pytest.mark.unit
    def test_bean_to_api(self):
        bean = PlanningStepBean(
            id=1,
            label="Assemblage",
            color="#5B7FC7",
            display_order=1,
            min_status_for_done=2,
        )
        result = planning_step_bean_to_api(bean)
        assert result["id"] == 1
        assert result["label"] == "Assemblage"
        assert result["display_order"] == 1
        assert result["min_status_for_done"] == 2
        assert result["gas_only"] is False
        assert result["use_shooting_date"] is False
