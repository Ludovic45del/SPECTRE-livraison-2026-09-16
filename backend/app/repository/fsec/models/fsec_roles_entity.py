"""Référentiel FSEC_ROLES - Rôles dans les équipes FSEC."""

from django.db import models


class FsecRolesEntity(models.Model):
    """Entité représentant les rôles dans les équipes FSEC."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_ROLES"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
