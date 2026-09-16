"""Entité principale CAMPAIGN - Campagnes."""

import uuid

from django.db import models

from app.repository.campaign.models.campaign_installations_entity import (
    CampaignInstallationsEntity,
)
from app.repository.campaign.models.campaign_status_entity import CampaignStatusEntity
from app.repository.campaign.models.campaign_types_entity import CampaignTypesEntity


class CampaignEntity(models.Model):
    """Entité représentant une campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN"
        unique_together = [("name", "year", "semester")]
        indexes = [
            models.Index(fields=["year"], name="campaign_year_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type_id = models.ForeignKey(
        CampaignTypesEntity,
        on_delete=models.PROTECT,
        db_column="type_id",
        related_name="campaigns",
    )
    status_id = models.ForeignKey(
        CampaignStatusEntity,
        on_delete=models.PROTECT,
        db_column="status_id",
        related_name="campaigns",
    )
    installation_id = models.ForeignKey(
        CampaignInstallationsEntity,
        on_delete=models.PROTECT,
        db_column="installation_id",
        related_name="campaigns",
    )
    name = models.CharField(max_length=50)
    year = models.IntegerField()
    SEMESTER_CHOICES = [("S1", "S1"), ("S2", "S2")]
    semester = models.CharField(max_length=2, choices=SEMESTER_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    dtri_number = models.IntegerField(null=True, blank=True)
    description = models.TextField(max_length=4000, null=True, blank=True)
