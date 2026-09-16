"""Entité MESSAGE_ATTACHMENT — pièce jointe (fichier) d'un message."""

import os
import uuid
from typing import Iterable

from django.core.exceptions import SuspiciousFileOperation
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils.text import get_valid_filename

# Longueur maximale du nom de fichier sur disque (extension comprise).
STORED_FILENAME_MAX_LENGTH = 120
ATTACHMENTS_UPLOAD_PREFIX = "messaging/attachments"


def safe_attachment_filename(filename: str) -> str:
    """Nom de fichier sûr pour le stockage : caractères nettoyés
    (`get_valid_filename`), extension conservée en minuscules, tronqué à
    STORED_FILENAME_MAX_LENGTH caractères. Repli « fichier » si rien ne subsiste."""
    try:
        cleaned = get_valid_filename(os.path.basename(filename or ""))
    except SuspiciousFileOperation:
        # Nom vide ou réduit à « . » / « .. » après nettoyage.
        cleaned = ""
    stem, ext = os.path.splitext(cleaned)
    ext = ext.lower()
    stem = stem.strip("._") or "fichier"
    room = max(1, STORED_FILENAME_MAX_LENGTH - len(ext))
    return f"{stem[:room]}{ext}"


def message_attachment_upload_to(instance, filename: str) -> str:
    """Chemin de stockage non devinable : messaging/attachments/<uuid4 hex>/<nom sûr>.

    Les fichiers sont servis par le reverse proxy sous MEDIA_URL sans contrôle
    d'accès applicatif (convention du projet, cf. README) : l'aléa du segment
    intermédiaire empêche l'énumération.
    """
    return f"{ATTACHMENTS_UPLOAD_PREFIX}/{uuid.uuid4().hex}/{safe_attachment_filename(filename)}"


def delete_stored_files(names: Iterable[str]) -> None:
    """Efface des fichiers du stockage des pièces jointes (silencieux si absents).

    Chaque pièce jointe vit dans son propre dossier `<uuid4 hex>/` : une fois le
    fichier effacé, le dossier (désormais vide) est retiré à son tour.
    """
    storage = MessageAttachmentEntity._meta.get_field("file").storage
    for name in names:
        if not name:
            continue
        storage.delete(name)
        if hasattr(storage, "path"):
            try:
                os.rmdir(os.path.dirname(storage.path(name)))
            except OSError:
                # Dossier non vide ou déjà absent : rien à faire.
                pass


class MessageAttachmentEntity(models.Model):
    """Pièce jointe d'un message.

    Le fichier vit sous MEDIA_ROOT ; il est effacé par le signal `post_delete`
    (émis pour chaque ligne collectée, y compris en cascade depuis le message ou
    la conversation et depuis l'admin), jamais orphelin.
    """

    class Meta:
        app_label = "app"
        db_table = "MESSAGE_ATTACHMENT"
        ordering = ["position", "created_at"]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # CASCADE : la suppression du message emporte ses pièces jointes (l'index
    # implicite de la clé étrangère sert les chargements par message).
    message = models.ForeignKey(
        "app.MessageEntity",
        on_delete=models.CASCADE,
        db_column="message_uuid",
        related_name="attachments",
    )

    file = models.FileField(upload_to=message_attachment_upload_to, max_length=500)

    # Nom d'origine tel que fourni par le client (affiché et proposé au téléchargement).
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=150)
    size = models.PositiveIntegerField()

    # Ordre d'insertion dans le message (0 = première pièce jointe).
    position = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.original_name} @ message {self.message_id}"


@receiver(post_delete, sender=MessageAttachmentEntity)
def _delete_attachment_file(
    sender, instance: MessageAttachmentEntity, **kwargs
) -> None:
    """Efface le fichier disque après suppression de la ligne (cascade incluse)."""
    delete_stored_files([instance.file.name if instance.file else None])
