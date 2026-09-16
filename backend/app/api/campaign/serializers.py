"""Serializers pour la validation des Campagnes."""

from rest_framework import serializers


class CampaignSerializer(serializers.Serializer):
    """Serializer pour la validation des données Campaign."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    type_id = serializers.IntegerField(required=False, allow_null=True)
    status_id = serializers.IntegerField(required=False, allow_null=True)
    installation_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=50, required=True)
    year = serializers.IntegerField(required=True, min_value=2000, max_value=2100)
    semester = serializers.ChoiceField(choices=["S1", "S2"], required=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    dtri_number = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=999999
    )
    description = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class CampaignDocumentsSerializer(serializers.Serializer):
    """Serializer pour la validation des documents de campagne."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    campaign_uuid = serializers.UUIDField(required=True)
    # Les sous-types de documents et les file types sont seedés à partir de
    # l'id 0 (cf. migration 0003_seed_campaign_referential pour les subtypes
    # et 0005_seed_campaign_file_types pour les file types), donc min_value=0.
    subtype_id = serializers.IntegerField(required=True, min_value=0)
    file_type_id = serializers.IntegerField(
        required=False, allow_null=True, min_value=0
    )
    name = serializers.CharField(max_length=100, required=True)
    path = serializers.CharField(max_length=500, required=True)
    date = serializers.DateField(required=True)


class CampaignTeamsSerializer(serializers.Serializer):
    """Serializer pour la validation des membres d'équipe de campagne.

    name OU user_uuid est requis selon le rôle (MOE → name, autres → user_uuid).
    Le service `campaign_teams_service` valide la cohérence et renvoie 400 sinon.
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)
    campaign_uuid = serializers.UUIDField(required=True)
    # Les rôles sont seedés avec des id ∈ {0 (MOE), 1 (RCE), 2 (IEC)} (cf.
    # migration 0002_seed_campaign_roles), donc min_value=0.
    role_id = serializers.IntegerField(required=True, min_value=0)
    # Optionnels au niveau serializer : la coherence (name pour MOE, user_uuid
    # sinon) est validee dans le service.
    name = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    user_uuid = serializers.UUIDField(required=False, allow_null=True)


class CampaignPatchSerializer(serializers.Serializer):
    """Serializer pour le PATCH partiel des Campagnes."""

    type_id = serializers.IntegerField(required=False, allow_null=True)
    status_id = serializers.IntegerField(required=False, allow_null=True)
    installation_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=50, required=False)
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    semester = serializers.ChoiceField(choices=["S1", "S2"], required=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    dtri_number = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=999999
    )
    description = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
