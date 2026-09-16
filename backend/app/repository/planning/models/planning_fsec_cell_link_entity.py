"""Entite PLANNING_FSEC_CELL_LINK - Liens FSEC -> cellule planning."""

import uuid

from django.db import models

from app.domain.planning.models.planning_constants import STEP_LABEL_CHOICES
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity


class PlanningFsecCellLinkEntity(models.Model):
    """Represente l'association d'un FSEC a une cellule (campagne, etape, semaine) du planning."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_FSEC_CELL_LINK"
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "step_label", "year", "week_num", "fsec_uuid"],
                name="uq_planning_fsec_cell_link_composite",
            ),
        ]
        indexes = [models.Index(fields=["year"], name="pln_fseclink_year_idx")]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        CampaignEntity,
        on_delete=models.CASCADE,
        db_column="campaign_uuid",
        related_name="planning_fsec_links",
    )
    step_label = models.CharField(
        max_length=50,
        choices=[(c, c) for c in STEP_LABEL_CHOICES],
    )
    year = models.IntegerField()
    week_num = models.IntegerField()
    fsec_uuid = models.ForeignKey(
        FsecEntity,
        on_delete=models.CASCADE,
        db_column="fsec_uuid",
        related_name="planning_fsec_links",
        to_field="version_uuid",
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
