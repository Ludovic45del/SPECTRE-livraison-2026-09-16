"""Entité CONVERSATION_MEMBER — adhésion d'un utilisateur à une conversation."""

import uuid

from django.db import models


class ConversationMemberEntity(models.Model):
    """Une ligne = un membre d'une conversation, avec son curseur de lecture.

    Le propriétaire possède lui aussi une ligne membre : la visibilité d'une
    conversation se résume à « être membre ».

    Le point de départ des non-lus est `COALESCE(last_read_at, joined_at)` :
    un membre ajouté à un groupe n'hérite pas de l'historique antérieur à son
    adhésion, et un membre parti puis ré-ajouté repart de sa nouvelle adhésion.
    """

    class Meta:
        app_label = "app"
        db_table = "CONVERSATION_MEMBER"
        ordering = ["joined_at", "member_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "member"], name="conversation_member_unique"
            ),
        ]
        indexes = [
            models.Index(fields=["member"], name="conversation_member_member_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression de la conversation emporte ses adhésions.
    conversation = models.ForeignKey(
        "app.ConversationEntity",
        on_delete=models.CASCADE,
        db_column="conversation_uuid",
        related_name="memberships",
    )

    # PROTECT : cohérent avec TaskListMemberEntity — on désactive les comptes,
    # on ne les supprime pas tant qu'ils sont référencés.
    member = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="member_uuid",
        to_field="uuid",
        related_name="+",
    )

    # NULL = jamais lu DEPUIS L'ADHÉSION (les non-lus partent alors de joined_at).
    last_read_at = models.DateTimeField(null=True, blank=True)

    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.member_id} @ {self.conversation_id}"
