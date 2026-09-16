"""Entite PLANNING_MEMBER_PERIOD - Disponibilites des membres."""

import uuid

from django.db import models

from app.domain.planning.models.planning_constants import PERIOD_TYPE_CHOICES


class PlanningMemberPeriodEntity(models.Model):
    """Represente une periode d'indisponibilite d'un membre (conges, RTT, maladie, etc.)."""

    class Meta:
        app_label = "app"
        db_table = "PLANNING_MEMBER_PERIOD"
        indexes = [
            models.Index(fields=["year"], name="pln_memperiod_year_idx"),
            models.Index(
                fields=["start_date", "end_date"], name="pln_memperiod_dates_idx"
            ),
        ]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_name = models.CharField(max_length=100)
    member_role = models.CharField(max_length=50)
    year = models.IntegerField()
    period_type = models.CharField(
        max_length=20,
        choices=[(c, c) for c in PERIOD_TYPE_CHOICES],
    )
    commentaire = models.TextField(max_length=500, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
