"""Repository Planning - Implementation IPlanningRepository."""

import uuid as uuid_mod

from django.db import IntegrityError, transaction

from app.domain.exceptions import ValidationException
from app.domain.planning.interface.planning_repository import IPlanningRepository
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
from app.mapper.planning.planning_mapper import (
    lab_event_entity_to_bean,
    planning_campaign_step_entity_to_bean,
    planning_cell_annotation_entity_to_bean,
    planning_fsec_cell_link_entity_to_bean,
    planning_member_period_entity_to_bean,
    planning_step_entity_to_bean,
    planning_week_state_entity_to_bean,
)
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


class PlanningRepository(IPlanningRepository):
    """Implementation du repository Planning."""

    @staticmethod
    @transaction.atomic
    def _delete_by_uuid(model_class, uuid: uuid_mod.UUID) -> bool:
        """Supprime une entite par UUID. Retourne True si supprimee."""
        deleted, _ = model_class.objects.filter(uuid=uuid).delete()
        return deleted > 0

    # ====================== WEEK STATE ======================

    def get_week_states_by_year(self, year: int) -> list[PlanningWeekStateBean]:
        entities = PlanningWeekStateEntity.objects.filter(year=year)
        return [planning_week_state_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def upsert_week_state(self, bean: PlanningWeekStateBean) -> PlanningWeekStateBean:
        entity, _ = PlanningWeekStateEntity.objects.update_or_create(
            year=bean.year,
            week_num=bean.week_num,
            defaults={"state": bean.state},
        )
        return planning_week_state_entity_to_bean(entity)

    @transaction.atomic
    def delete_week_state(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(PlanningWeekStateEntity, uuid)

    # ====================== MEMBER PERIOD ======================

    def get_member_periods_by_year(self, year: int) -> list[PlanningMemberPeriodBean]:
        entities = PlanningMemberPeriodEntity.objects.filter(year=year)
        return [planning_member_period_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create_member_period(
        self, bean: PlanningMemberPeriodBean
    ) -> PlanningMemberPeriodBean:
        entity = PlanningMemberPeriodEntity.objects.create(
            member_name=bean.member_name,
            member_role=bean.member_role,
            year=bean.year,
            period_type=bean.period_type,
            commentaire=bean.commentaire,
            start_date=bean.start_date,
            end_date=bean.end_date,
        )
        return planning_member_period_entity_to_bean(entity)

    @transaction.atomic
    def update_member_period(
        self, uuid: uuid_mod.UUID, bean: PlanningMemberPeriodBean
    ) -> PlanningMemberPeriodBean | None:
        try:
            entity = PlanningMemberPeriodEntity.objects.get(uuid=uuid)
        except PlanningMemberPeriodEntity.DoesNotExist:
            return None
        entity.member_name = bean.member_name
        entity.member_role = bean.member_role
        entity.year = bean.year
        entity.period_type = bean.period_type
        entity.commentaire = bean.commentaire
        entity.start_date = bean.start_date
        entity.end_date = bean.end_date
        entity.save(
            update_fields=[
                "member_name",
                "member_role",
                "year",
                "period_type",
                "commentaire",
                "start_date",
                "end_date",
            ]
        )
        return planning_member_period_entity_to_bean(entity)

    @transaction.atomic
    def delete_member_period(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(PlanningMemberPeriodEntity, uuid)

    # ====================== CELL ANNOTATION ======================

    def get_cell_annotations_by_year(
        self, year: int
    ) -> list[PlanningCellAnnotationBean]:
        entities = PlanningCellAnnotationEntity.objects.filter(year=year)
        return [planning_cell_annotation_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def upsert_cell_annotation(
        self, bean: PlanningCellAnnotationBean
    ) -> PlanningCellAnnotationBean:
        try:
            entity, _ = PlanningCellAnnotationEntity.objects.update_or_create(
                campaign_id=bean.campaign_uuid,
                step_label=bean.step_label,
                year=bean.year,
                week_num=bean.week_num,
                defaults={"text": bean.text},
            )
        except IntegrityError:
            raise ValidationException(
                "campaign_uuid", "La campagne referencee n'existe pas."
            )
        return planning_cell_annotation_entity_to_bean(entity)

    @transaction.atomic
    def delete_cell_annotation(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(PlanningCellAnnotationEntity, uuid)

    # ====================== FSEC CELL LINK ======================

    def get_fsec_cell_links_by_year(self, year: int) -> list[PlanningFsecCellLinkBean]:
        entities = PlanningFsecCellLinkEntity.objects.filter(year=year)
        return [planning_fsec_cell_link_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create_fsec_cell_link(
        self, bean: PlanningFsecCellLinkBean
    ) -> PlanningFsecCellLinkBean:
        try:
            entity, _ = PlanningFsecCellLinkEntity.objects.get_or_create(
                campaign_id=bean.campaign_uuid,
                step_label=bean.step_label,
                year=bean.year,
                week_num=bean.week_num,
                fsec_uuid_id=bean.fsec_uuid,
            )
        except IntegrityError:
            raise ValidationException(
                "campaign_uuid", "La campagne referencee n'existe pas."
            )
        return planning_fsec_cell_link_entity_to_bean(entity)

    @transaction.atomic
    def delete_fsec_cell_link(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(PlanningFsecCellLinkEntity, uuid)

    # ====================== PLANNING STEP (referentiel) ======================

    def get_planning_steps(self) -> list[PlanningStepBean]:
        entities = PlanningStepEntity.objects.all()
        return [planning_step_entity_to_bean(e) for e in entities]

    # ====================== CAMPAIGN STEP ======================

    def get_campaign_steps_by_year(self, year: int) -> list[PlanningCampaignStepBean]:
        entities = PlanningCampaignStepEntity.objects.filter(year=year)
        return [planning_campaign_step_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create_campaign_step(
        self, bean: PlanningCampaignStepBean
    ) -> PlanningCampaignStepBean:
        try:
            entity = PlanningCampaignStepEntity.objects.create(
                campaign_id=bean.campaign_uuid,
                fsec_uuid_id=bean.fsec_uuid,
                step_label=bean.step_label,
                year=bean.year,
                start_date=bean.start_date,
                end_date=bean.end_date,
            )
        except IntegrityError as e:
            error_msg = str(e).lower()
            if "campaign" in error_msg:
                raise ValidationException(
                    "campaign_uuid", "La campagne referencee n'existe pas."
                )
            if "fsec" in error_msg:
                raise ValidationException(
                    "fsec_uuid", "La FSEC referencee n'existe pas."
                )
            raise ValidationException(
                "campaign_step",
                "Contrainte d'unicite violee (campagne/fsec/etape/annee).",
            )
        return planning_campaign_step_entity_to_bean(entity)

    @transaction.atomic
    def update_campaign_step(
        self, uuid: uuid_mod.UUID, bean: PlanningCampaignStepBean
    ) -> PlanningCampaignStepBean | None:
        try:
            entity = PlanningCampaignStepEntity.objects.get(uuid=uuid)
        except PlanningCampaignStepEntity.DoesNotExist:
            return None
        entity.campaign_id = bean.campaign_uuid
        entity.fsec_uuid_id = bean.fsec_uuid
        entity.step_label = bean.step_label
        entity.year = bean.year
        entity.start_date = bean.start_date
        entity.end_date = bean.end_date
        try:
            entity.save(
                update_fields=[
                    "campaign_id",
                    "fsec_uuid_id",
                    "step_label",
                    "year",
                    "start_date",
                    "end_date",
                ]
            )
        except IntegrityError as e:
            error_msg = str(e).lower()
            if "campaign" in error_msg:
                raise ValidationException(
                    "campaign_uuid", "La campagne referencee n'existe pas."
                )
            if "fsec" in error_msg:
                raise ValidationException(
                    "fsec_uuid", "La FSEC referencee n'existe pas."
                )
            raise ValidationException(
                "campaign_step",
                "Contrainte d'unicite violee (campagne/fsec/etape/annee).",
            )
        return planning_campaign_step_entity_to_bean(entity)

    @transaction.atomic
    def delete_campaign_step(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(PlanningCampaignStepEntity, uuid)

    # ====================== LAB EVENT ======================

    def get_all_lab_events(self) -> list[LabEventBean]:
        entities = LabEventEntity.objects.select_related("machine").all()
        return [lab_event_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def create_lab_event(self, bean: LabEventBean) -> LabEventBean:
        try:
            entity = LabEventEntity.objects.create(
                machine_id=bean.machine_uuid,
                category=bean.category,
                description=bean.description,
                start_date=bean.start_date,
                end_date=bean.end_date,
            )
        except IntegrityError:
            raise ValidationException(
                "machine_uuid", "La machine referencee n'existe pas."
            )
        return lab_event_entity_to_bean(entity)

    @transaction.atomic
    def update_lab_event(
        self, uuid: uuid_mod.UUID, bean: LabEventBean
    ) -> LabEventBean | None:
        try:
            entity = LabEventEntity.objects.get(uuid=uuid)
        except LabEventEntity.DoesNotExist:
            return None
        entity.machine_id = bean.machine_uuid
        entity.category = bean.category
        entity.description = bean.description
        entity.start_date = bean.start_date
        entity.end_date = bean.end_date
        try:
            entity.save(
                update_fields=[
                    "machine_id",
                    "category",
                    "description",
                    "start_date",
                    "end_date",
                ]
            )
        except IntegrityError:
            raise ValidationException(
                "machine_uuid", "La machine referencee n'existe pas."
            )
        return lab_event_entity_to_bean(entity)

    @transaction.atomic
    def delete_lab_event(self, uuid: uuid_mod.UUID) -> bool:
        return self._delete_by_uuid(LabEventEntity, uuid)
