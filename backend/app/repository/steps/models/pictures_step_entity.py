"""Entite PICTURES_STEP - Etape de photos."""

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.base_step_entity import BaseStepEntity


class PicturesStepEntity(BaseStepEntity):
    """Entite representant une etape de photos."""

    class Meta:
        app_label = "app"
        db_table = "PICTURES_STEP"

    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="pictures_steps",
        to_field="version_uuid",
    )
    date = models.DateField(null=True, blank=True)
    comments = models.TextField(max_length=4000, null=True, blank=True)
