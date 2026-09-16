"""Référentiel CAMPAIGN_DOCUMENT_SUBTYPES - Sous-types de documents de campagne."""

from django.db import models

from app.repository.campaign.models.campaign_document_types_entity import (
    CampaignDocumentTypesEntity,
)


class CampaignDocumentSubtypesEntity(models.Model):
    """Entité représentant les sous-types de documents de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_DOCUMENT_SUBTYPES"

    id = models.AutoField(primary_key=True)
    type_id = models.ForeignKey(
        CampaignDocumentTypesEntity,
        on_delete=models.PROTECT,
        db_column="type_id",
        related_name="subtypes",
    )
    label = models.CharField(max_length=40)
