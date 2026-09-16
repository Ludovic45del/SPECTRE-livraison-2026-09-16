"""Entite ASSEMBLY_STEP - Etape d'assemblage."""

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class AssemblyStepEntity(BaseStepEntity):
    """Entite representant une etape d'assemblage."""

    class Meta:
        app_label = "app"
        db_table = "ASSEMBLY_STEP"

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="assembly_steps",
        to_field="version_uuid",
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    comments = models.TextField(max_length=4000, null=True, blank=True)
    machines = models.ManyToManyField(
        "app.MachineEntity",
        db_table="ASSEMBLY_STEP_MACHINE",
        related_name="assembly_steps",
        blank=True,
    )
    # Assembleurs multiples : une étape peut être réalisée à plusieurs.
    # Source de vérité de la liste ; `operator_user` (FK héritée) reste
    # synchronisée sur le premier sélectionné pour la rétro-compatibilité.
    operator_users = models.ManyToManyField(
        "app.UserProfileEntity",
        db_table="ASSEMBLY_STEP_OPERATOR",
        related_name="+",
        blank=True,
    )
