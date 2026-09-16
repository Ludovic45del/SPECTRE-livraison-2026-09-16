"""Entité Etalonnage - Données d'étalonnage d'une embase."""

import uuid

from django.db import models


class EtalonnageEntity(models.Model):
    """Entité représentant un étalonnage d'embase."""

    VOIE_CHOICES = [
        (1, "V1"),
        (2, "V2"),
    ]

    class Meta:
        app_label = "app"
        db_table = "ETALONNAGE"
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["embase", "voie", "date"],
                name="uq_etalonnage_embase_voie_date",
            )
        ]
        indexes = [
            models.Index(
                fields=["embase", "voie", "-date"], name="etal_embase_voie_date_idx"
            ),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    embase = models.ForeignKey(
        "app.EmbaseEntity",
        on_delete=models.CASCADE,
        related_name="etalonnages",
        db_column="embase_uuid",
    )
    voie = models.IntegerField(choices=VOIE_CHOICES, default=1)

    # Données de calibration
    offset_0_bar_mv = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    mesurande_0_bar_lie = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    signal_etendue_mv = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    signal_pa_meteociel = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    # Metadata étalonnage
    date = models.DateField(null=True, blank=True)
    operateur = models.CharField(max_length=100, blank=True, default="")
    operateur_user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="operateur_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    # Metadata système
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Étalonnage {self.embase_id} V{self.voie} - {self.date}"
