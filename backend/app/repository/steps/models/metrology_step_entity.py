"""Entite METROLOGY_STEP - Etape de metrologie."""

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.fsec.models.fsec_rack_entity import FsecRackEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class MetrologyStepEntity(BaseStepEntity):
    """Entite representant une etape de metrologie."""

    class Meta:
        app_label = "app"
        db_table = "METROLOGY_STEP"

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="metrology_steps",
        to_field="version_uuid",
    )
    machines = models.ManyToManyField(
        "app.MachineEntity",
        db_table="METROLOGY_STEP_MACHINE",
        related_name="metrology_steps",
        blank=True,
    )
    rack_id = models.ForeignKey(
        FsecRackEntity,
        on_delete=models.PROTECT,
        db_column="rack_id",
        related_name="metrology_steps",
        null=True,
        blank=True,
    )
    metrologist_name = models.CharField(max_length=255, null=True, blank=True)
    metrologist_user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="metrologist_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    # Métrologues multiples : une étape peut être réalisée à plusieurs.
    # Source de vérité de la liste ; `metrologist_user` (FK) reste synchronisée
    # sur le premier sélectionné pour la rétro-compatibilité.
    metrologist_users = models.ManyToManyField(
        "app.UserProfileEntity",
        db_table="METROLOGY_STEP_METROLOGIST",
        related_name="+",
        blank=True,
    )
    date = models.DateField(null=True, blank=True)
    comments = models.TextField(max_length=4000, null=True, blank=True)
    # Liens fichiers (CharField plutôt qu'URLField : on accepte les chemins UNC
    # \\serveur\share\... du réseau fermé en plus des URL HTTP internes).
    # Livrables de la métrologie (déplacés depuis SealingStepEntity, cf. 0090).
    metro_file_link = models.CharField(max_length=500, null=True, blank=True)
    visrad_link = models.CharField(max_length=500, null=True, blank=True)
