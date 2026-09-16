"""Référentiel FSEC_CATEGORY - Catégories de FSEC."""

from django.db import models


class FsecCategoryEntity(models.Model):
    """Entité représentant les catégories de FSEC (Sans Gaz, Avec Gaz HP, etc.)."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_CATEGORY"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
