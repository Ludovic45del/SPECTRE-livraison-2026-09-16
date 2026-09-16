"""Entité MACHINE_MAINTENANCE — historique des interventions de maintenance."""

import uuid

from django.db import models

from app.domain.material.models.constants import (
    MAINTENANCE_TYPE_CHOICES,
    MAINTENANCE_TYPE_PREVENTIVE,
)


class MachineMaintenanceEntity(models.Model):
    """Une intervention de maintenance (préventive ou curative) sur une machine.

    `next_maintenance_date` permet de driver des alertes côté UI sans calcul auto :
    c'est l'opérateur qui inscrit la prochaine échéance prévue.
    """

    class Meta:
        app_label = "app"
        db_table = "MACHINE_MAINTENANCE"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["machine", "-date"], name="maint_machine_date_idx"),
            models.Index(fields=["next_maintenance_date"], name="maint_next_date_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    machine = models.ForeignKey(
        "app.MachineEntity",
        on_delete=models.CASCADE,
        related_name="maintenances",
        db_column="machine_uuid",
    )
    date = models.DateField()
    type = models.CharField(
        max_length=20,
        choices=MAINTENANCE_TYPE_CHOICES,
        default=MAINTENANCE_TYPE_PREVENTIVE,
    )

    # SET_NULL pour conserver l'historique même si l'intervenant quitte la structure.
    performed_by_user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="performed_by_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    # Fallback texte si l'intervenant n'est pas (encore) un utilisateur du système.
    performed_by_name = models.CharField(max_length=100, blank=True, default="")

    description = models.TextField(blank=True, default="")
    next_maintenance_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
