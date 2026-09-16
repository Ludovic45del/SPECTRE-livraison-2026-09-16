"""Entite PLANNING_CAMPAIGN_STEP - Etapes programmees des campagnes."""

import uuid as uuid_mod

from django.db import models

from app.domain.planning.models.planning_constants import STEP_LABEL_CHOICES
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity


class PlanningCampaignStepEntity(models.Model):
    """Represente une etape programmee d'une campagne (Assemblage, Metrologie, etc.)."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_CAMPAIGN_STEP"
        ordering = ["start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "step_label", "fsec_uuid"],
                name="uq_planning_campaign_step_composite",
            ),
        ]
        indexes = [
            models.Index(fields=["year"], name="pln_campstep_year_idx"),
            models.Index(fields=["campaign"], name="pln_campstep_camp_idx"),
            models.Index(
                fields=["campaign", "year"], name="pln_campstep_camp_year_idx"
            ),
            models.Index(fields=["fsec_uuid"], name="pln_campstep_fsec_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid_mod.uuid4, editable=False)
    campaign = models.ForeignKey(
        CampaignEntity,
        on_delete=models.CASCADE,
        db_column="campaign_uuid",
        related_name="planning_campaign_steps",
    )
    fsec_uuid = models.ForeignKey(
        FsecEntity,
        on_delete=models.CASCADE,
        db_column="fsec_uuid",
        related_name="planning_campaign_steps",
        to_field="version_uuid",
    )
    step_label = models.CharField(
        max_length=50,
        choices=[(c, c) for c in STEP_LABEL_CHOICES],
    )
    year = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
