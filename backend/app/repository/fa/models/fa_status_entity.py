"""Référentiel FA_STATUS - Statuts de Fiche d'Anomalie.

AUDIT R-SEC-03 : AutoField (entier) accepté pour table référentielle
à cardinalité fixe (3 valeurs). Pas de risque d'énumération.
"""

from django.db import models


class FaStatusEntity(models.Model):
    """Entité représentant les statuts de FA."""

    class Meta:
        app_label = "app"
        db_table = "FA_STATUS"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
