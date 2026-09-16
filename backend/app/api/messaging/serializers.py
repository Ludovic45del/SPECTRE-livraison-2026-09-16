"""Serializers Messagerie interne — validation des entrées API.

Validation d'entrée uniquement : la sérialisation des réponses passe par les
mappers (`app/mapper/messaging/messaging_api_mapper.py`).
"""

from rest_framework import serializers

from app.domain.messaging.models.constants import (
    ENTITY_REF_TYPE_CHOICES,
    KIND_CHOICES,
    MAX_CONVERSATION_NAME_LENGTH,
    MAX_ENTITY_REFS_PER_MESSAGE,
    MAX_MEMBERS_PER_CONVERSATION,
    MAX_MESSAGE_LENGTH,
    MENTIONS_DEFAULT_LIMIT,
    MENTIONS_MAX_LIMIT,
    MESSAGE_PAGE_DEFAULT_LIMIT,
    MESSAGE_PAGE_MAX_LIMIT,
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LENGTH,
    SEARCH_MAX_LIMIT,
)

KIND_VALUES = [value for value, _ in KIND_CHOICES]
ENTITY_REF_TYPE_VALUES = [value for value, _ in ENTITY_REF_TYPE_CHOICES]


class ConversationCreateSerializer(serializers.Serializer):
    """Création d'une conversation privée (`direct`) ou de groupe (`group`)."""

    kind = serializers.ChoiceField(choices=KIND_VALUES)
    name = serializers.CharField(
        max_length=MAX_CONVERSATION_NAME_LENGTH,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )
    member_uuids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        max_length=MAX_MEMBERS_PER_CONVERSATION,
    )


class ConversationUpdateSerializer(serializers.Serializer):
    """Renommage d'un groupe (seul champ modifiable en vague M1)."""

    name = serializers.CharField(max_length=MAX_CONVERSATION_NAME_LENGTH)


class ConversationMembersSerializer(serializers.Serializer):
    """Ajout de membres sur un groupe."""

    member_uuids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=MAX_MEMBERS_PER_CONVERSATION,
    )


class EntityRefSerializer(serializers.Serializer):
    """Référence d'entité attachée à un message (FSEC → fsec_uuid, campagne / FA → uuid)."""

    entity_type = serializers.ChoiceField(choices=ENTITY_REF_TYPE_VALUES)
    entity_uuid = serializers.UUIDField()


class MessageCreateSerializer(serializers.Serializer):
    """Publication d'un message texte, avec références d'entités optionnelles.

    Le corps peut être vide : le service exige alors au moins une pièce jointe
    (fichiers lus dans `request.FILES`, jamais validés par un serializer DRF).
    """

    body = serializers.CharField(
        max_length=MAX_MESSAGE_LENGTH,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )
    entity_refs = serializers.ListField(
        child=EntityRefSerializer(),
        required=False,
        default=list,
        max_length=MAX_ENTITY_REFS_PER_MESSAGE,
    )


class MessageEditSerializer(serializers.Serializer):
    """Édition du corps d'un message texte par son auteur."""

    body = serializers.CharField(
        max_length=MAX_MESSAGE_LENGTH, allow_blank=False, trim_whitespace=True
    )


class MessageSearchQuerySerializer(serializers.Serializer):
    """Paramètres de `GET /conversations/search/` (`request.query_params`).

    La longueur minimale du terme est contrôlée par le service (400 uniforme).
    """

    q = serializers.CharField(
        max_length=SEARCH_MAX_LENGTH, allow_blank=True, trim_whitespace=True
    )
    limit = serializers.IntegerField(
        min_value=1,
        max_value=SEARCH_MAX_LIMIT,
        required=False,
        default=SEARCH_DEFAULT_LIMIT,
    )


class MentionsQuerySerializer(serializers.Serializer):
    """Paramètres de `GET /conversations/mentions/` (`request.query_params`)."""

    entity_type = serializers.ChoiceField(choices=ENTITY_REF_TYPE_VALUES)
    entity_uuid = serializers.UUIDField()
    limit = serializers.IntegerField(
        min_value=1,
        max_value=MENTIONS_MAX_LIMIT,
        required=False,
        default=MENTIONS_DEFAULT_LIMIT,
    )


class MessagePageQuerySerializer(serializers.Serializer):
    """Paramètres de la pagination par curseur des messages (`request.query_params`)."""

    limit = serializers.IntegerField(
        min_value=1,
        max_value=MESSAGE_PAGE_MAX_LIMIT,
        required=False,
        default=MESSAGE_PAGE_DEFAULT_LIMIT,
    )
    before = serializers.UUIDField(required=False)
    after = serializers.UUIDField(required=False)
    # Polling : messages modifiés / supprimés depuis cette date (aware), hors page.
    updated_since = serializers.DateTimeField(required=False)
