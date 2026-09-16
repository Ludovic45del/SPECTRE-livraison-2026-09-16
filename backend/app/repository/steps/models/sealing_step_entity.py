"""Entité SEALING_STEP - Étape de scellement, liée à une métrologie."""

import uuid

from django.db import models

from app.repository.fsec.models.fsec_rack_entity import FsecRackEntity
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity


class SealingStepEntity(models.Model):
    """Entité représentant une étape de scellement, liée 1:1 à une métrologie."""

    # Vérification du scellement : OK / NOK, null = non vérifié.
    # Même pattern que PHASE_CHOICES (airtightness_test_lp_step_entity.py).
    VERIFICATION_OK = "OK"
    VERIFICATION_NOK = "NOK"
    VERIFICATION_CHOICES = [(VERIFICATION_OK, "OK"), (VERIFICATION_NOK, "NOK")]

    class Meta:
        app_label = "app"
        db_table = "SEALING_STEP"

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metrology_step_id = models.OneToOneField(
        MetrologyStepEntity,
        on_delete=models.CASCADE,
        db_column="metrology_step_id",
        related_name="sealing_step",
    )
    date = models.DateField(null=True, blank=True)
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
    rack_id = models.ForeignKey(
        FsecRackEntity,
        on_delete=models.PROTECT,
        db_column="rack_id",
        related_name="sealing_steps",
        null=True,
        blank=True,
    )
    interface_io = models.CharField(max_length=50, null=True, blank=True)
    comments = models.TextField(max_length=4000, null=True, blank=True)
    # Vérification du scellement : 'OK' / 'NOK', null = non vérifié.
    verification_status = models.CharField(
        max_length=3, choices=VERIFICATION_CHOICES, null=True, blank=True
    )
    verification_remark = models.TextField(max_length=4000, null=True, blank=True)
