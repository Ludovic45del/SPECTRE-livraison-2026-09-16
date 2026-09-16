"""Entité TASK_LIST_ITEM — tâche d'une liste partagée."""

import uuid

from django.db import models

from app.domain.tasklist.models.constants import (
    MAX_TASK_TITLE_LENGTH,
    PRIORITY_CHOICES,
    PRIORITY_NORMAL,
)


class TaskItemEntity(models.Model):
    """Tâche : titre, note (annotation), priorité, échéance, assignation."""

    class Meta:
        app_label = "app"
        db_table = "TASK_LIST_ITEM"
        ordering = ["position", "created_at"]
        indexes = [
            models.Index(fields=["task_list", "done"], name="task_item_list_done_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression de la liste emporte ses tâches.
    task_list = models.ForeignKey(
        "app.TaskListEntity",
        on_delete=models.CASCADE,
        db_column="task_list_uuid",
        related_name="items",
    )

    title = models.CharField(max_length=MAX_TASK_TITLE_LENGTH)
    # Longueur maximale contrôlée par le serializer et le service (4000).
    note = models.TextField(blank=True, default="")
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL
    )
    done = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    due_date = models.DateField(null=True, blank=True)

    # SET_NULL : l'historique des tâches survit à la suppression d'un compte.
    assignee = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="assignee_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    created_by = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="created_by_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    completed_by = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="completed_by_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.title} ({self.uuid})"
