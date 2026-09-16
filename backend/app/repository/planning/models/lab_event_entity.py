"""Entite PLANNING_LAB_EVENT - Evenements du laboratoire."""

import uuid

from django.db import models

from app.domain.planning.models.planning_constants import LAB_EVENT_CATEGORY_CHOICES


class LabEventEntity(models.Model):
    """Represente un evenement sur une machine (maintenance, panne, etc.)."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_LAB_EVENT"
        ordering = ["start_date"]
        indexes = [
            models.Index(fields=["start_date"], name="lab_event_start_date_idx"),
            models.Index(fields=["machine_id"], name="lab_event_machine_id_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    machine = models.ForeignKey(
        "app.MachineEntity", on_delete=models.CASCADE, db_column="machine_id"
    )
    category = models.CharField(
        max_length=50,
        choices=[(c, c) for c in LAB_EVENT_CATEGORY_CHOICES],
    )
    description = models.TextField(blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
