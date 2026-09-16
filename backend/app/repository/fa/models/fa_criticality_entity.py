"""Référentiel FA_CRITICALITY - Niveaux de criticité de Fiche d'Anomalie.

AUDIT R-SEC-03 : AutoField (entier) accepté pour table référentielle
à cardinalité fixe (4 valeurs). Pas de risque d'énumération.
"""

from django.db import models


class FaCriticalityEntity(models.Model):
    """Entité représentant les niveaux de criticité de FA (0, 1, 2, 3)."""

    class Meta:
        app_label = "app"
        db_table = "FA_CRITICALITY"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
