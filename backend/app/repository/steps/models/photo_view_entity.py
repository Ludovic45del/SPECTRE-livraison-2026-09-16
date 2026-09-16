"""Entité PHOTO_VIEW - Vue/Photo individuelle liée à PicturesStep."""

import uuid

from django.db import models

from app.repository.steps.models.pictures_step_entity import PicturesStepEntity


class PhotoViewEntity(models.Model):
    """Entité représentant une vue/photo individuelle."""

    class Meta:
        app_label = "app"
        db_table = "PHOTO_VIEW"

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pictures_step_id = models.ForeignKey(
        PicturesStepEntity,
        on_delete=models.CASCADE,
        db_column="pictures_step_id",
        related_name="photo_views",
    )
    name = models.CharField(max_length=255)
    link = models.CharField(max_length=1000, null=True, blank=True)
