"""Serializers LabContact — validation des entrées API uniquement.

La sérialisation des réponses est assurée par le mapper
(`app.mapper.labcontact.lab_contact_mapper`).
"""

from rest_framework import serializers

from app.domain.labcontact.services.lab_contact_service import (
    LAB_CONTACT_NAME_MAX_LENGTH,
    LAB_CONTACT_PHONE_MAX_LENGTH,
)

LAB_CONTACT_COMMENT_MAX_LENGTH = 4000


class LabContactSerializer(serializers.Serializer):
    """Création (POST) / remplacement complet (PUT) d'un contact de l'annuaire."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=LAB_CONTACT_NAME_MAX_LENGTH)
    phone = serializers.CharField(
        max_length=LAB_CONTACT_PHONE_MAX_LENGTH,
        required=False,
        allow_blank=True,
        default="",
    )
    comment = serializers.CharField(
        max_length=LAB_CONTACT_COMMENT_MAX_LENGTH,
        required=False,
        allow_blank=True,
        default="",
    )


class LabContactPatchSerializer(serializers.Serializer):
    """Mise à jour partielle (PATCH) : tous les champs optionnels, sans défaut.

    Un champ absent du payload n'apparaît pas dans `validated_data` et n'est
    donc pas modifié. `uuid` n'est volontairement pas déclaré : celui de l'URL
    fait foi (un uuid dans le corps est ignoré).
    """

    name = serializers.CharField(max_length=LAB_CONTACT_NAME_MAX_LENGTH, required=False)
    phone = serializers.CharField(
        max_length=LAB_CONTACT_PHONE_MAX_LENGTH, required=False, allow_blank=True
    )
    comment = serializers.CharField(
        max_length=LAB_CONTACT_COMMENT_MAX_LENGTH, required=False, allow_blank=True
    )
