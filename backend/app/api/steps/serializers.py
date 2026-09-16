"""Serializers pour les Steps - Validation des entrées."""

from rest_framework import serializers


class AssemblyStepSerializer(serializers.Serializer):
    """Serializer pour les étapes d'assemblage."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    # Champ singulier conservé pour la rétro-compat (= premier assembleur).
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    # Liste des assembleurs : une étape peut être réalisée à plusieurs.
    operator_user_uuids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
    # UUIDs de MachineEntity (salle B1) liées à cette étape d'assemblage.
    machine_uuids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )


class MetrologyStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de métrologie."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    # Les racks sont seedés à partir de l'id 0 (cf. data/fsec/fsec_racks.csv).
    rack_id = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    metrologist_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, allow_null=True
    )
    # Champ singulier conservé pour la rétro-compat (= premier métrologue).
    metrologist_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    # Liste des métrologues : une étape peut être réalisée à plusieurs.
    metrologist_user_uuids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    date = serializers.DateField(required=False, allow_null=True)
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
    # UUIDs de MachineEntity (salle B2) liées à cette étape de métrologie.
    machine_uuids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )
    # Liens fichiers (URL HTTP ou chemin UNC) : fichier métro .txt et Visrad réalisé.
    metro_file_link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )
    visrad_link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )


class SealingStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de scellement."""

    uuid = serializers.UUIDField(required=False)
    metrology_step_id = serializers.UUIDField(required=True)
    date = serializers.DateField(required=False, allow_null=True)
    metrologist_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, allow_null=True
    )
    metrologist_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    # Les racks sont seedés à partir de l'id 0 (cf. data/fsec/fsec_racks.csv).
    rack_id = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    interface_io = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
    # Vérification du scellement : 'OK' / 'NOK', null = non vérifié.
    verification_status = serializers.ChoiceField(
        choices=["OK", "NOK"], required=False, allow_null=True
    )
    verification_remark = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class PicturesStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de photos."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=255, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    date = serializers.DateField(required=False, allow_null=True)
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class PhotoViewSerializer(serializers.Serializer):
    """Serializer pour les vues photo."""

    uuid = serializers.UUIDField(required=False)
    pictures_step_id = serializers.UUIDField(required=True)
    name = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class AirtightnessTestLpStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de test d'étanchéité LP."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    embase_id = serializers.UUIDField(required=False, allow_null=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    leak_rate_dtri = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    gas_type = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    experiment_pressure = serializers.FloatField(required=False, allow_null=True)
    airtightness_test_duration = serializers.FloatField(required=False, allow_null=True)
    date_of_fulfilment = serializers.DateField(required=False, allow_null=True)
    phase = serializers.ChoiceField(choices=["BP", "HP"], required=False, default="BP")


class GasFillingBpStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de remplissage gaz BP."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    embase_id = serializers.UUIDField(required=False, allow_null=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    leak_rate_dtri = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    gas_type = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    experiment_pressure = serializers.FloatField(required=False, allow_null=True)
    leak_test_duration = serializers.FloatField(required=False, allow_null=True)
    date_of_fulfilment = serializers.DateField(required=False, allow_null=True)
    gas_base = serializers.IntegerField(required=False, allow_null=True)
    gas_container = serializers.IntegerField(required=False, allow_null=True)
    observations = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class GasFillingHpStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de remplissage gaz HP."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    embase_id = serializers.UUIDField(required=False, allow_null=True)
    leak_rate_dtri = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    gas_type = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    experiment_pressure = serializers.FloatField(required=False, allow_null=True)
    date_of_fulfilment = serializers.DateField(required=False, allow_null=True)
    gas_base = serializers.IntegerField(required=False, allow_null=True)
    gas_container = serializers.IntegerField(required=False, allow_null=True)
    observations = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )


class PermeationStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de perméation."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    gas_type = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    target_pressure = serializers.FloatField(required=False, allow_null=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    estimated_end_date = serializers.DateTimeField(required=False, allow_null=True)
    sensor_pressure = serializers.FloatField(required=False, allow_null=True)
    computed_shot_pressure = serializers.FloatField(required=False, allow_null=True)


class DepressurizationStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de dépressurisation."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    date_of_fulfilment = serializers.DateField(required=False, allow_null=True)
    pressure_gauge = serializers.FloatField(required=False, allow_null=True)
    enclosure_pressure_measured = serializers.FloatField(
        required=False, allow_null=True
    )
    start_time = serializers.DateTimeField(required=False, allow_null=True)
    end_time = serializers.DateTimeField(required=False, allow_null=True)
    observations = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
    depressurization_time_before_firing = serializers.FloatField(
        required=False, allow_null=True
    )
    computed_pressure_before_firing = serializers.FloatField(
        required=False, allow_null=True
    )


class RepressurizationStepSerializer(serializers.Serializer):
    """Serializer pour les étapes de repressurisation."""

    uuid = serializers.UUIDField(required=False)
    fsec_version_id = serializers.UUIDField(required=True)
    operator = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    operator_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    gas_type = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    estimated_end_date = serializers.DateTimeField(required=False, allow_null=True)
    sensor_pressure = serializers.FloatField(required=False, allow_null=True)
    computed_pressure = serializers.FloatField(required=False, allow_null=True)
