"""Entité DEPRESSURIZATION_STEP - Étape de dépressurisation."""

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class DepressurizationStepEntity(BaseStepEntity):
    """Entité représentant une étape de dépressurisation."""

    class Meta:
        app_label = "app"
        db_table = "DEPRESSURIZATION_STEP"
        indexes = [
            models.Index(fields=["fsec_version_id"], name="depress_fsec_idx"),
        ]

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="depressurization_steps",
        to_field="version_uuid",
    )
    date_of_fulfilment = models.DateField(null=True, blank=True)
    pressure_gauge = models.FloatField(null=True, blank=True)
    enclosure_pressure_measured = models.FloatField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    observations = models.TextField(max_length=4000, null=True, blank=True)
    depressurization_time_before_firing = models.FloatField(null=True, blank=True)
    computed_pressure_before_firing = models.FloatField(null=True, blank=True)
