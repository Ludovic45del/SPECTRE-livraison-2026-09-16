"""Référentiel CAMPAIGN_ROLES - Rôles dans les équipes de campagne."""

from django.db import models


class CampaignRolesEntity(models.Model):
    """Entité représentant les rôles dans les équipes de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_ROLES"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
