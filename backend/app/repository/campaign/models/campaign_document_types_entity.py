"""Référentiel CAMPAIGN_DOCUMENT_TYPES - Types de documents de campagne."""

from django.db import models


class CampaignDocumentTypesEntity(models.Model):
    """Entité représentant les types de documents de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_DOCUMENT_TYPES"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
