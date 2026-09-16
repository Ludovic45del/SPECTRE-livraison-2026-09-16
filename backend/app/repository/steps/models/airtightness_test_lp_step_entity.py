"""Entité AIRTIGHTNESS_TEST_LP_STEP - Test d'étanchéité basse pression."""

from django.db import models

from app.repository.embase.models.embase_entity import EmbaseEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class AirtightnessTestLpStepEntity(BaseStepEntity):
    """Entité représentant un test d'étanchéité basse pression.

    `phase` discrimine la phase fonctionnelle à laquelle le test est rattaché :
    'BP' pour les rubriques BP / Perméation, 'HP' pour les rubriques HP. Le test est
    techniquement toujours réalisé à basse pression, mais peut être lié à une étape
    BP ou HP selon le workflow physique.
    """

    PHASE_BP = "BP"
    PHASE_HP = "HP"
    PHASE_CHOICES = [(PHASE_BP, "BP"), (PHASE_HP, "HP")]

    class Meta:
        app_label = "app"
        db_table = "AIRTIGHTNESS_TEST_LP_STEP"
        indexes = [
            models.Index(fields=["fsec_version_id"], name="airtight_lp_fsec_idx"),
        ]

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="airtightness_test_lp_steps",
        to_field="version_uuid",
    )
    embase = models.ForeignKey(
        EmbaseEntity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="airtightness_test_lp_steps_embase",
    )
    leak_rate_dtri = models.CharField(max_length=200, null=True, blank=True)
    gas_type = models.CharField(max_length=200, null=True, blank=True)
    experiment_pressure = models.FloatField(null=True, blank=True)
    airtightness_test_duration = models.FloatField(null=True, blank=True)
    date_of_fulfilment = models.DateField(null=True, blank=True)
    phase = models.CharField(max_length=2, choices=PHASE_CHOICES, default=PHASE_BP)
