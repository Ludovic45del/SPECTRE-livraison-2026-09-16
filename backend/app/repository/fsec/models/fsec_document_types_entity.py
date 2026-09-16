"""Référentiel FSEC_DOCUMENT_TYPES - Types de documents FSEC."""

from django.db import models


class FsecDocumentTypesEntity(models.Model):
    """Entité représentant les types de documents FSEC."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_DOCUMENT_TYPES"

    id = models.AutoField(primary_key=True)
    label = models.CharField(max_length=40, unique=True)
