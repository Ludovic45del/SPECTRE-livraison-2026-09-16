"""Entité CAMPAIGN_DOCUMENTS - Documents de campagne."""

import uuid

from django.db import models

from app.repository.campaign.models.campaign_document_subtypes_entity import (
    CampaignDocumentSubtypesEntity,
)
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.campaign.models.campaign_file_types_entity import (
    CampaignFileTypesEntity,
)


class CampaignDocumentsEntity(models.Model):
    """Entité représentant les documents de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_DOCUMENTS"

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign_uuid = models.ForeignKey(
        CampaignEntity,
        on_delete=models.PROTECT,
        db_column="campaign_uuid",
        related_name="documents",
    )
    subtype_id = models.ForeignKey(
        CampaignDocumentSubtypesEntity,
        on_delete=models.PROTECT,
        db_column="subtype_id",
        related_name="documents",
    )
    file_type_id = models.ForeignKey(
        CampaignFileTypesEntity,
        on_delete=models.SET_NULL,
        db_column="file_type_id",
        related_name="documents",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=100)
    path = models.CharField(max_length=500)
    date = models.DateField()
