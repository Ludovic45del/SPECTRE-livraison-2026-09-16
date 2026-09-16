"""Entité MESSAGE — message texte ou message système d'une conversation."""

import uuid

from django.db import models

from app.domain.messaging.models.constants import (
    MESSAGE_KIND_CHOICES,
    MESSAGE_KIND_TEXT,
)


class MessageEntity(models.Model):
    """Message d'une conversation.

    Un message système (`kind="system"`) est écrit par le service lors des
    événements de groupe : son auteur est l'acteur de l'événement et il compte
    dans les non-lus comme un message ordinaire.

    Un message texte peut être édité par son auteur (`edited_at`) ou supprimé
    logiquement (`deleted_at`) ; le corps peut être vide s'il porte au moins
    une pièce jointe (`MessageAttachmentEntity`).
    """

    class Meta:
        app_label = "app"
        db_table = "MESSAGE"
        ordering = ["created_at", "uuid"]
        indexes = [
            models.Index(
                fields=["conversation", "created_at"], name="message_conv_created_idx"
            ),
            # Polling `updated_since` : éditions / suppressions d'anciens messages.
            models.Index(
                fields=["conversation", "updated_at"], name="message_conv_updated_idx"
            ),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression de la conversation emporte ses messages.
    conversation = models.ForeignKey(
        "app.ConversationEntity",
        on_delete=models.CASCADE,
        db_column="conversation_uuid",
        related_name="messages",
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

    kind = models.CharField(
        max_length=20, choices=MESSAGE_KIND_CHOICES, default=MESSAGE_KIND_TEXT
    )

    # Longueur maximale (4000 caractères) contrôlée par le serializer et le service.
    body = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    # Avancé à chaque édition / suppression logique (chemin de polling `updated_since`).
    updated_at = models.DateTimeField(auto_now=True)
    # Édition (vague M4) : date de la dernière modification du corps par l'auteur.
    edited_at = models.DateTimeField(null=True, blank=True)
    # Suppression logique (vague M4) : la ligne subsiste avec un corps vide, sans
    # référence ni pièce jointe, pour garder l'historique et les curseurs stables.
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Message {self.uuid} (conversation {self.conversation_id})"
