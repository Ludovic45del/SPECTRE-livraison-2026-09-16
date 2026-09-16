"""Référentiel CAMPAIGN_TYPES - Types de campagne."""

from django.db import models


class CampaignTypesEntity(models.Model):
    """Entité représentant les types de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_TYPES"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
