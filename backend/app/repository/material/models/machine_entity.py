"""Entité MACHINE — équipement physique rattaché à une salle."""

import uuid

from django.db import models

from app.domain.material.models.constants import (
    MACHINE_STATUS_CHOICES,
    MACHINE_STATUS_IN_SERVICE,
)


class MachineEntity(models.Model):
    """Machine appartenant à une salle, avec un cycle de vie matériel."""

    class Meta:
        app_label = "app"
        db_table = "MACHINE"
        ordering = ["room__sort_order", "name"]
        indexes = [
            models.Index(fields=["room"], name="machine_room_idx"),
            models.Index(fields=["status"], name="machine_status_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=200)
    room = models.ForeignKey(
        "app.MachineRoomEntity",
        on_delete=models.PROTECT,
        related_name="machines",
        db_column="room_id",
    )

    reference = models.CharField(max_length=200, blank=True, default="")
    manufacturer = models.CharField(max_length=200, blank=True, default="")
    model = models.CharField(max_length=200, blank=True, default="")
    commissioning_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=MACHINE_STATUS_CHOICES,
        default=MACHINE_STATUS_IN_SERVICE,
    )

    # SET_NULL : si l'utilisateur responsable est supprimé, on garde la machine
    # mais on perd la référence — l'historique doit survivre à un départ.
    responsible_user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="responsible_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.room_id})"
