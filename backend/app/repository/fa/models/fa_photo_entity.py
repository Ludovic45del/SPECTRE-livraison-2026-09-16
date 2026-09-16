"""Entité FaPhoto - Photo de la galerie d'une Fiche d'Anomalie (phase Ouvert)."""

import uuid

from django.db import models

from app.repository.fa.models.fa_entity import FaEntity


class FaPhotoEntity(models.Model):
    """Photo rattachée à une FA.

    Galerie 1-N : une FA peut porter plusieurs photos (phase Ouvert). Le fichier
    est stocké sous MEDIA_ROOT/fa/photos/ (même mécanisme que la photo de vue
    d'ensemble FSEC). La FK est en CASCADE : supprimer la FA supprime ses photos
    (les fichiers disque sont nettoyés par FaRepository.delete).
    """

    class Meta:
        app_label = "app"
        db_table = "FA_PHOTO"
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["fa", "order"], name="fa_photo_fa_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fa = models.ForeignKey(
        FaEntity,
        on_delete=models.CASCADE,
        db_column="fa_uuid",
        related_name="photos",
    )
    image = models.ImageField(upload_to="fa/photos/", max_length=500)
    caption = models.CharField(max_length=255, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
