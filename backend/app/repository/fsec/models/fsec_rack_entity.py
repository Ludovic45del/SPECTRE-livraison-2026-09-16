"""Référentiel FSEC_RACK - Racks de rangement FSEC."""

from django.db import models


class FsecRackEntity(models.Model):
    """Entité représentant les racks de rangement FSEC."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_RACK"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
    is_full = models.BooleanField(default=False)
