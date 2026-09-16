"""Référentiel FA_TYPE - Types 5M de Fiche d'Anomalie.

AUDIT R-SEC-03 : AutoField (entier) accepté pour table référentielle
à cardinalité fixe (5 valeurs). Pas de risque d'énumération.
"""

from django.db import models


class FaTypeEntity(models.Model):
    """Entité représentant les types 5M de FA (Moyen, Main d'œuvre, Matière, Milieu, Méthode)."""

    class Meta:
        app_label = "app"
        db_table = "FA_TYPE"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
    color = models.CharField(max_length=40)
