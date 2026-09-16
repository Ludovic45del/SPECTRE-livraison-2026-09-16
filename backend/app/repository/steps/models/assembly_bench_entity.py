"""Référentiel ASSEMBLY_BENCH - Bancs d'assemblage."""

from django.db import models


class AssemblyBenchEntity(models.Model):
    """Entité représentant les bancs d'assemblage."""

    class Meta:
        app_label = "app"
        db_table = "ASSEMBLY_BENCH"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
