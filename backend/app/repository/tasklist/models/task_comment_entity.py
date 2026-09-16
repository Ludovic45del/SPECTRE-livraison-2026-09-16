"""Entité TASK_LIST_COMMENT — commentaire (annotation) sur une tâche."""

import uuid

from django.db import models


class TaskCommentEntity(models.Model):
    """Commentaire horodaté d'un membre sur une tâche."""

    class Meta:
        app_label = "app"
        db_table = "TASK_LIST_COMMENT"
        ordering = ["created_at"]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression de la tâche emporte ses commentaires.
    task = models.ForeignKey(
        "app.TaskItemEntity",
        on_delete=models.CASCADE,
        db_column="task_uuid",
        related_name="comments",
    )

    # SET_NULL : le fil de discussion survit à la suppression d'un compte.
    author = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.SET_NULL,
        db_column="author_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    # Longueur maximale contrôlée par le serializer et le service (2000).
    text = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Commentaire {self.uuid} (tâche {self.task_id})"
