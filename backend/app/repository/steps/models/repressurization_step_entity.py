"""Entité REPRESSURIZATION_STEP - Étape de repressurisation."""

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class RepressurizationStepEntity(BaseStepEntity):
    """Entité représentant une étape de repressurisation."""

    class Meta:
        app_label = "app"
        db_table = "REPRESSURIZATION_STEP"
        indexes = [
            models.Index(fields=["fsec_version_id"], name="repress_fsec_idx"),
        ]

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="repressurization_steps",
        to_field="version_uuid",
    )
    gas_type = models.CharField(max_length=200, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    estimated_end_date = models.DateTimeField(null=True, blank=True)
    sensor_pressure = models.FloatField(null=True, blank=True)
    computed_pressure = models.FloatField(null=True, blank=True)
