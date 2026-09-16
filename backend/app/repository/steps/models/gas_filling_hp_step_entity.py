"""Entité GAS_FILLING_HP_STEP - Remplissage gaz haute pression."""

from django.db import models

from app.repository.embase.models.embase_entity import EmbaseEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class GasFillingHpStepEntity(BaseStepEntity):
    """Entité représentant un remplissage gaz haute pression."""

    class Meta:
        app_label = "app"
        db_table = "GAS_FILLING_HP_STEP"
        indexes = [
            models.Index(fields=["fsec_version_id"], name="gas_fill_hp_fsec_idx"),
        ]

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="gas_filling_hp_steps",
        to_field="version_uuid",
    )
    embase = models.ForeignKey(
        EmbaseEntity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gas_filling_hp_steps_embase",
    )
    leak_rate_dtri = models.CharField(max_length=200, null=True, blank=True)
    gas_type = models.CharField(max_length=200, null=True, blank=True)
    experiment_pressure = models.FloatField(null=True, blank=True)
    date_of_fulfilment = models.DateField(null=True, blank=True)
    gas_base = models.IntegerField(null=True, blank=True)
    gas_container = models.IntegerField(null=True, blank=True)
    observations = models.TextField(max_length=4000, null=True, blank=True)
