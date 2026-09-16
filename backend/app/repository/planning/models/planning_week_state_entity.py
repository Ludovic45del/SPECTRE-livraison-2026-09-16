"""Entite PLANNING_WEEK_STATE - Semaines grisees du planning."""

import uuid

from django.db import models

from app.domain.planning.models.planning_constants import WEEK_STATE_CHOICES


class PlanningWeekStateEntity(models.Model):
    """Represente l'etat d'une semaine (vacances/fermeture) dans le planning."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_WEEK_STATE"
        constraints = [
            models.UniqueConstraint(
                fields=["year", "week_num"], name="uq_planning_week_state_year_week"
            ),
        ]
        indexes = [models.Index(fields=["year"], name="planning_week_state_year_idx")]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year = models.IntegerField()
    week_num = models.IntegerField()
    state = models.CharField(
        max_length=20,
        choices=[(c, c) for c in WEEK_STATE_CHOICES],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
