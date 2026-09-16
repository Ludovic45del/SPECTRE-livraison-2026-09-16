"""Referentiel PLANNING_STEP - Etapes de planification des campagnes.

Source de verite des etapes du planning campagne (Reception cibles, Assemblage,
Metrologie, Gaz, Livraison, Tir). Auparavant codees en dur cote front et back ;
desormais configurables via l'admin Django.
"""

from django.db import models


class PlanningStepEntity(models.Model):
    """Etape de planning campagne (referentiel configurable)."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_STEP"
        ordering = ["display_order"]

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=40)
    display_order = models.IntegerField(default=0)
    # Statut FSEC minimal (id FSEC_STATUS) a partir duquel l'etape est "faite".
    min_status_for_done = models.IntegerField(null=True, blank=True)
    # L'avancement de l'etape se base sur la date de tir de la FSEC.
    use_shooting_date = models.BooleanField(default=False)
    # Etape visible uniquement pour les campagnes ayant des FSEC gaz.
    gas_only = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.label
