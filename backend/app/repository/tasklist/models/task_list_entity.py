"""Entité TASK_LIST — liste de tâches partagée à visibilité restreinte."""

import uuid

from django.db import models

from app.domain.tasklist.models.constants import (
    LIST_COLOR_CHOICES,
    LIST_COLOR_DEFAULT,
    MAX_LIST_NAME_LENGTH,
)


class TaskListEntity(models.Model):
    """Liste partagée : seul le propriétaire et les membres invités la voient."""

    class Meta:
        app_label = "app"
        db_table = "TASK_LIST"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["owner"], name="task_list_owner_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=MAX_LIST_NAME_LENGTH)
    # Longueur maximale contrôlée par le serializer et le service (2000).
    description = models.TextField(blank=True, default="")
    color = models.CharField(
        max_length=20, choices=LIST_COLOR_CHOICES, default=LIST_COLOR_DEFAULT
    )

    # PROTECT : une liste doit toujours avoir un propriétaire ; supprimer le
    # compte propriétaire exige d'abord de supprimer (ou transférer) ses listes.
    owner = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="owner_uuid",
        to_field="uuid",
        related_name="+",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.uuid})"
