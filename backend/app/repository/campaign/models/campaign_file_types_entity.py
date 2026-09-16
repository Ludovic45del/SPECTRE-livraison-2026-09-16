"""Référentiel CAMPAIGN_FILE_TYPES - Types de fichiers (dossiers) pour les documents."""

from django.db import models

from app.repository.campaign.models.campaign_document_subtypes_entity import (
    CampaignDocumentSubtypesEntity,
)


class CampaignFileTypesEntity(models.Model):
    """Entité représentant les types de fichiers (dossiers) de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_FILE_TYPES"

    id = models.AutoField(primary_key=True)
    subtype_id = models.ForeignKey(
        CampaignDocumentSubtypesEntity,
        on_delete=models.PROTECT,
        db_column="subtype_id",
        related_name="file_types",
    )
    label = models.CharField(max_length=40)
