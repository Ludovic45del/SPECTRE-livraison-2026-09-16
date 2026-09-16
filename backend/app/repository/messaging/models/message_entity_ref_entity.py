"""Entité MESSAGE_ENTITY_REF — référence structurée (FSEC, campagne, FA) d'un message."""

import uuid

from django.db import models

from app.domain.messaging.models.constants import (
    ENTITY_REF_LABEL_MAX_LENGTH,
    ENTITY_REF_TYPE_CHOICES,
)


class MessageEntityRefEntity(models.Model):
    """Référence attachée à un message.

    Aucune clé étrangère vers la cible : trois tables sont possibles (FSEC,
    campagne, FA) et l'entité référencée peut être supprimée sans emporter le
    message. Une FSEC est identifiée par son `fsec_uuid` (stable à travers les
    versions). `label` est un instantané du libellé pris à la création, pour
    afficher une chip « (supprimée) » si la cible n'existe plus ; le slug n'est
    jamais stocké (recalculé à la lecture).
    """

    class Meta:
        app_label = "app"
        db_table = "MESSAGE_ENTITY_REF"
        ordering = ["position", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["message", "entity_type", "entity_uuid"],
                name="message_entity_ref_unique",
            ),
        ]
        indexes = [
            models.Index(
                fields=["entity_type", "entity_uuid"],
                name="message_entity_ref_target_idx",
            ),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression du message emporte ses références.
    message = models.ForeignKey(
        "app.MessageEntity",
        on_delete=models.CASCADE,
        db_column="message_uuid",
        related_name="entity_refs",
    )

    entity_type = models.CharField(max_length=20, choices=ENTITY_REF_TYPE_CHOICES)
    entity_uuid = models.UUIDField()

    label = models.CharField(max_length=ENTITY_REF_LABEL_MAX_LENGTH)

    # Ordre d'insertion dans le message (0 = première référence).
    position = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.entity_type}:{self.entity_uuid} @ message {self.message_id}"
