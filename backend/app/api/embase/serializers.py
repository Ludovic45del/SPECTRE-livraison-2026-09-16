"""Serializers Embase - Validation des entrées pour les Embases à gaz."""

from rest_framework import serializers

from app.domain.embase.models.embase_constants import VALID_EMBASE_TYPES

EMBASE_TYPE_CHOICES = list(VALID_EMBASE_TYPES)


class EmbaseSerializer(serializers.Serializer):
    """Serializer pour la validation des Embases à gaz."""

    uuid = serializers.UUIDField(required=False, allow_null=True)

    # Identifiant & Type
    identifier = serializers.CharField(max_length=20, required=True)
    type = serializers.ChoiceField(choices=EMBASE_TYPE_CHOICES, required=True)
    nombre_voies = serializers.IntegerField(required=False, default=1)

    # VOIE V1
    soufflet_v1 = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    capteur_v1 = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    offset_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    mesurande_lie_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    sensibilite_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    signal_meteociel_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    capteur_cible_pfeiffer_mbar = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    etendue_v1_mbar = serializers.IntegerField(required=False, allow_null=True)
    test_etancheite_he = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    test_capteur_mrg = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    etalonnage_date = serializers.DateField(required=False, allow_null=True)
    observations_v1 = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, default=""
    )

    # MECA
    operationnelle_aimant = serializers.BooleanField(required=False, default=False)
    operationnelle_broche = serializers.BooleanField(required=False, default=False)
    localisation_actuelle = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    cote_ve = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True
    )
    decalage_angulaire = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    chargement_mcc = serializers.CharField(
        max_length=10, required=False, allow_blank=True, default=""
    )

    # VOIE V2
    soufflet_v2 = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    capteur_v2 = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    offset_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    mesurande_lie_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    sensibilite_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    signal_meteociel_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    capteur_cible_pfeiffer_v2_mbar = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    etendue_v2_mbar = serializers.IntegerField(required=False, allow_null=True)
    test_etancheite_he_v2 = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    test_capteur_mrg_v2 = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    observations_v2 = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, default=""
    )
    electrovanne = serializers.BooleanField(required=False, default=False)

    # Historique FSECs
    fsec_history = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, default=""
    )


class EmbasePatchSerializer(serializers.Serializer):
    """Serializer pour le PATCH partiel des Embases."""

    identifier = serializers.CharField(max_length=20, required=False)
    type = serializers.ChoiceField(choices=EMBASE_TYPE_CHOICES, required=False)
    nombre_voies = serializers.IntegerField(required=False)
    soufflet_v1 = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    capteur_v1 = serializers.CharField(max_length=50, required=False, allow_blank=True)
    offset_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    mesurande_lie_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    sensibilite_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    signal_meteociel_v1_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    capteur_cible_pfeiffer_mbar = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    etendue_v1_mbar = serializers.IntegerField(required=False, allow_null=True)
    test_etancheite_he = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    test_capteur_mrg = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    etalonnage_date = serializers.DateField(required=False, allow_null=True)
    observations_v1 = serializers.CharField(
        max_length=4000, required=False, allow_blank=True
    )
    operationnelle_aimant = serializers.BooleanField(required=False)
    operationnelle_broche = serializers.BooleanField(required=False)
    localisation_actuelle = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    cote_ve = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True
    )
    decalage_angulaire = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    chargement_mcc = serializers.CharField(
        max_length=10, required=False, allow_blank=True
    )
    soufflet_v2 = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    capteur_v2 = serializers.CharField(max_length=50, required=False, allow_blank=True)
    offset_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    mesurande_lie_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    sensibilite_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    signal_meteociel_v2_mv = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    capteur_cible_pfeiffer_v2_mbar = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    etendue_v2_mbar = serializers.IntegerField(required=False, allow_null=True)
    test_etancheite_he_v2 = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    test_capteur_mrg_v2 = serializers.CharField(
        max_length=200, required=False, allow_blank=True
    )
    observations_v2 = serializers.CharField(
        max_length=4000, required=False, allow_blank=True
    )
    electrovanne = serializers.BooleanField(required=False)
    fsec_history = serializers.CharField(
        max_length=4000, required=False, allow_blank=True
    )


class EtalonnageListQuerySerializer(serializers.Serializer):
    """Serializer de validation pour les paramètres de requête de liste des étalonnages."""

    embase_uuid = serializers.UUIDField(required=True)
    voie = serializers.IntegerField(required=False, min_value=1, max_value=2)


class EtalonnageSerializer(serializers.Serializer):
    """Serializer pour la création/validation d'un étalonnage."""

    embase_uuid = serializers.UUIDField(required=True)
    voie = serializers.IntegerField(required=False, default=1, min_value=1, max_value=2)
    offset_0_bar_mv = serializers.DecimalField(
        max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    mesurande_0_bar_lie = serializers.DecimalField(
        max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    signal_etendue_mv = serializers.DecimalField(
        max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    signal_pa_meteociel = serializers.DecimalField(
        max_digits=12, decimal_places=4, required=False, allow_null=True
    )
    date = serializers.DateField(required=False, allow_null=True)
    operateur = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    operateur_user_uuid = serializers.UUIDField(required=False, allow_null=True)
