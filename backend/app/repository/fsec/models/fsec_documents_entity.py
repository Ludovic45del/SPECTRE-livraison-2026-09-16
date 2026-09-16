"""Entité FSEC_DOCUMENTS - Documents FSEC."""

import uuid

from django.db import models

from app.repository.fsec.models.fsec_document_subtypes_entity import (
    FsecDocumentSubtypesEntity,
)
from app.repository.fsec.models.fsec_entity import FsecEntity


class FsecDocumentsEntity(models.Model):
    """Entité représentant les documents FSEC."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_DOCUMENTS"

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fsec_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_id",
        related_name="documents",
        to_field="version_uuid",
    )
    subtype_id = models.ForeignKey(
        FsecDocumentSubtypesEntity,
        on_delete=models.PROTECT,
        db_column="subtype_id",
        related_name="documents",
    )
    name = models.CharField(max_length=100)
    path = models.CharField(max_length=500)
    date = models.DateField()
