"""Entite PLANNING_CELL_ANNOTATION - Annotations texte sur les cellules campagne."""

import uuid

from django.db import models

from app.domain.planning.models.planning_constants import STEP_LABEL_CHOICES
from app.repository.campaign.models.campaign_entity import CampaignEntity


class PlanningCellAnnotationEntity(models.Model):
    """Represente une annotation textuelle sur une cellule (campagne, etape, semaine)."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_CELL_ANNOTATION"
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "step_label", "year", "week_num"],
                name="uq_planning_cell_annotation_composite",
            ),
        ]
        indexes = [models.Index(fields=["year"], name="pln_cellannot_year_idx")]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        CampaignEntity,
        on_delete=models.CASCADE,
        db_column="campaign_uuid",
        related_name="planning_annotations",
    )
    step_label = models.CharField(
        max_length=50,
        choices=[(c, c) for c in STEP_LABEL_CHOICES],
    )
    year = models.IntegerField()
    week_num = models.IntegerField()
    text = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
