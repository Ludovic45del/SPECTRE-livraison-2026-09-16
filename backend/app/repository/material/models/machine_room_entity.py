"""Référentiel MACHINE_ROOM — salles abritant le parc machines (B1, B2, A13)."""

from django.db import models


class MachineRoomEntity(models.Model):
    """Salle physique dans laquelle se trouvent des machines."""

    class Meta:
        app_label = "app"
        db_table = "MACHINE_ROOM"
        ordering = ["sort_order", "code"]

    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=10, unique=True)
    label = models.CharField(max_length=100)
    color = models.CharField(max_length=20, blank=True, default="")
    sort_order = models.IntegerField(default=0)

    def __str__(self) -> str:
        return self.code
