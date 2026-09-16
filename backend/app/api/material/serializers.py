"""Serializers Matériel — validation des entrées API."""

from rest_framework import serializers

from app.domain.material.models.constants import (
    MACHINE_STATUS_CHOICES,
    MAINTENANCE_TYPE_CHOICES,
)

MACHINE_STATUS_VALUES = [value for value, _ in MACHINE_STATUS_CHOICES]
MAINTENANCE_TYPE_VALUES = [value for value, _ in MAINTENANCE_TYPE_CHOICES]


class MachineLinkInputSerializer(serializers.Serializer):
    """Lien documentaire (sous-élément d'une machine)."""

    label = serializers.CharField(max_length=200)
    url = serializers.CharField(max_length=2000)
    position = serializers.IntegerField(required=False, default=0, min_value=0)


class MachineSerializer(serializers.Serializer):
    """Création / mise à jour d'une machine.

    Les liens sont envoyés avec la machine en un seul appel : un PUT remplace
    l'intégralité de cette collection.
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)

    name = serializers.CharField(max_length=200)
    room_id = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    manufacturer = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    model = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    commissioning_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=MACHINE_STATUS_VALUES, required=False, default="in_service"
    )
    responsible_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, default=""
    )

    links = MachineLinkInputSerializer(many=True, required=False, default=list)


class MachineMaintenanceSerializer(serializers.Serializer):
    """Création / mise à jour d'une intervention de maintenance."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    machine_uuid = serializers.UUIDField(required=True)
    date = serializers.DateField(required=True)
    type = serializers.ChoiceField(
        choices=MAINTENANCE_TYPE_VALUES, required=False, default="preventive"
    )
    performed_by_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    performed_by_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    description = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, default=""
    )
    next_maintenance_date = serializers.DateField(required=False, allow_null=True)


class MachineListQuerySerializer(serializers.Serializer):
    """Query params pour la liste des machines."""

    room_id = serializers.IntegerField(required=False, min_value=1)
