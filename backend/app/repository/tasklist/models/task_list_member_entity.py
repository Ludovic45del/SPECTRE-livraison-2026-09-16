"""Entité TASK_LIST_MEMBER — adhésion d'un utilisateur à une liste partagée."""

import uuid

from django.db import models


class TaskListMemberEntity(models.Model):
    """Une ligne = un utilisateur invité sur une liste.

    Le propriétaire n'est pas dupliqué en membre : la visibilité se calcule
    comme « owner OU membre ».
    """

    class Meta:
        app_label = "app"
        db_table = "TASK_LIST_MEMBER"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["task_list", "member"], name="task_list_member_unique"
            ),
        ]
        indexes = [
            models.Index(fields=["member"], name="task_list_member_member_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression de la liste emporte ses adhésions.
    task_list = models.ForeignKey(
        "app.TaskListEntity",
        on_delete=models.CASCADE,
        db_column="task_list_uuid",
        related_name="memberships",
    )

    # PROTECT : cohérent avec les équipes de campagne — on désactive les
    # comptes, on ne les supprime pas tant qu'ils sont référencés.
    member = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="member_uuid",
        to_field="uuid",
        related_name="+",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.member_id} @ {self.task_list_id}"
