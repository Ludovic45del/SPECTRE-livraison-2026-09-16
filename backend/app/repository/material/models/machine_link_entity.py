"""Entité MACHINE_LINK — lien documentaire rattaché à une machine."""

import uuid

from django.db import models


class MachineLinkEntity(models.Model):
    """Lien externe (procédure, doc, intranet) associé à une machine.

    Ordonné via `position` pour permettre à l'utilisateur de réordonner ses liens.
    """

    class Meta:
        app_label = "app"
        db_table = "MACHINE_LINK"
        ordering = ["position", "created_at"]
        indexes = [
            models.Index(fields=["machine", "position"], name="machine_link_pos_idx"),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    machine = models.ForeignKey(
        "app.MachineEntity",
        on_delete=models.CASCADE,
        related_name="links",
        db_column="machine_uuid",
    )
    label = models.CharField(max_length=200)
    # URL libre : on stocke en TextField car certaines URL intranet/SharePoint
    # peuvent dépasser largement 200 caractères.
    url = models.TextField()
    position = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
