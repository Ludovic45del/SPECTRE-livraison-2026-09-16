"""Serializers Planning - Validation DRF des donnees entrantes."""

from rest_framework import serializers

from app.domain.planning.models.planning_constants import (
    LAB_EVENT_CATEGORY_CHOICES,
    PERIOD_TYPE_CHOICES,
    WEEK_STATE_CHOICES,
)


class DateRangeValidationMixin:
    """Mixin pour valider que end_date >= start_date."""

    def validate(self, data):
        data = super().validate(data)
        start = data.get("start_date")
        end = data.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "La date de fin doit etre >= a la date de debut."}
            )
        return data


class StepLabelValidationMixin:
    """Mixin validant step_label contre le referentiel PLANNING_STEP.

    Remplace une liste de choix figee : les etapes sont desormais
    configurables via l'admin Django.
    """

    def validate_step_label(self, value):
        from app.repository.planning.models.planning_step_entity import (
            PlanningStepEntity,
        )

        if not PlanningStepEntity.objects.filter(label=value).exists():
            raise serializers.ValidationError(f"Etape de planning inconnue: '{value}'.")
        return value


class PlanningWeekStateSerializer(serializers.Serializer):
    """Validation pour les etats de semaine (vacances/fermeture)."""

    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    week_num = serializers.IntegerField(required=True, min_value=1, max_value=53)
    state = serializers.ChoiceField(required=True, choices=WEEK_STATE_CHOICES)


class PlanningMemberPeriodSerializer(DateRangeValidationMixin, serializers.Serializer):
    """Validation pour les disponibilites des membres."""

    member_name = serializers.CharField(required=True, max_length=100)
    member_role = serializers.CharField(required=True, max_length=50)
    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    period_type = serializers.ChoiceField(required=True, choices=PERIOD_TYPE_CHOICES)
    commentaire = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=500
    )
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)


class PlanningCellAnnotationSerializer(
    StepLabelValidationMixin, serializers.Serializer
):
    """Validation pour les annotations de cellules campagne."""

    campaign_uuid = serializers.UUIDField(required=True)
    step_label = serializers.CharField(required=True, max_length=50)
    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    week_num = serializers.IntegerField(required=True, min_value=1, max_value=53)
    text = serializers.CharField(required=True, max_length=1000)


class PlanningFsecCellLinkSerializer(StepLabelValidationMixin, serializers.Serializer):
    """Validation pour les liens FSEC -> cellule/etape planning.
    week_num=0 signifie un lien au niveau de l'etape (pas une semaine specifique).
    """

    campaign_uuid = serializers.UUIDField(required=True)
    step_label = serializers.CharField(required=True, max_length=50)
    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    week_num = serializers.IntegerField(required=True, min_value=0, max_value=53)
    fsec_uuid = serializers.UUIDField(required=True)


# ====================== CAMPAIGN STEP ======================


class PlanningCampaignStepSerializer(
    StepLabelValidationMixin, DateRangeValidationMixin, serializers.Serializer
):
    """Validation pour les etapes programmees des campagnes."""

    campaign_uuid = serializers.UUIDField(required=True)
    fsec_uuid = serializers.UUIDField(required=True)
    step_label = serializers.CharField(required=True, max_length=50)
    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)


# ====================== LAB EVENT ======================


class LabEventSerializer(DateRangeValidationMixin, serializers.Serializer):
    """Validation pour la creation/mise a jour d'un evenement labo."""

    machine_uuid = serializers.UUIDField(required=True)
    category = serializers.ChoiceField(
        required=True, choices=LAB_EVENT_CATEGORY_CHOICES
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
