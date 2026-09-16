"""Entité CONVERSATION — fil de discussion privé (direct) ou de groupe."""

import uuid

from django.db import models

from app.domain.messaging.models.constants import (
    KIND_CHOICES,
    MAX_CONVERSATION_NAME_LENGTH,
)


class ConversationEntity(models.Model):
    """Conversation visible uniquement par ses membres.

    Le tri métier de la liste (last_message_at décroissant, NULL en dernier)
    est porté par le repository : `Meta.ordering` reste sur `created_at` car
    un tri décroissant sur une colonne nullable place les NULL en premier sur
    PostgreSQL et en dernier sur SQLite.
    """

    class Meta:
        app_label = "app"
        db_table = "CONVERSATION"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner"], name="conversation_owner_idx"),
            models.Index(fields=["last_message_at"], name="conversation_last_msg_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    kind = models.CharField(max_length=20, choices=KIND_CHOICES)

    # Vide pour une conversation privée ; requis pour un groupe (validé par le service).
    name = models.CharField(
        max_length=MAX_CONVERSATION_NAME_LENGTH, blank=True, default=""
    )

    # PROTECT : une conversation a toujours un propriétaire ; la propriété est
    # transférée lors du départ du propriétaire, jamais laissée orpheline.
    owner = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="owner_uuid",
        to_field="uuid",
        related_name="+",
    )

    # Conversations privées uniquement : les deux uuid membres canoniques triés
    # et joints par « : ». NULL pour les groupes (plusieurs NULL restent
    # autorisés par une contrainte UNIQUE sur PostgreSQL comme sur SQLite).
    direct_key = models.CharField(max_length=73, null=True, blank=True, unique=True)

    # Dénormalisation : date du dernier message (texte ou système), pour trier
    # la liste sans agrégat.
    last_message_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.name or self.kind} ({self.uuid})"
