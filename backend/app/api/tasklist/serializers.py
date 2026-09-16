"""Serializers Listes de tâches partagées — validation des entrées API."""

from rest_framework import serializers

from app.domain.tasklist.models.constants import (
    LIST_COLOR_CHOICES,
    LIST_COLOR_DEFAULT,
    MAX_COMMENT_LENGTH,
    MAX_LIST_DESCRIPTION_LENGTH,
    MAX_LIST_NAME_LENGTH,
    MAX_MEMBERS_PER_LIST,
    MAX_TASK_NOTE_LENGTH,
    MAX_TASK_TITLE_LENGTH,
    PRIORITY_CHOICES,
    PRIORITY_NORMAL,
)

LIST_COLOR_VALUES = [value for value, _ in LIST_COLOR_CHOICES]
PRIORITY_VALUES = [value for value, _ in PRIORITY_CHOICES]


class TaskListCreateSerializer(serializers.Serializer):
    """Création d'une liste partagée."""

    name = serializers.CharField(max_length=MAX_LIST_NAME_LENGTH)
    description = serializers.CharField(
        max_length=MAX_LIST_DESCRIPTION_LENGTH,
        required=False,
        allow_blank=True,
        default="",
    )
    color = serializers.ChoiceField(
        choices=LIST_COLOR_VALUES, required=False, default=LIST_COLOR_DEFAULT
    )
    member_uuids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        max_length=MAX_MEMBERS_PER_LIST,
    )


class TaskListUpdateSerializer(serializers.Serializer):
    """Mise à jour partielle d'une liste (nom / description / couleur)."""

    name = serializers.CharField(max_length=MAX_LIST_NAME_LENGTH, required=False)
    description = serializers.CharField(
        max_length=MAX_LIST_DESCRIPTION_LENGTH, required=False, allow_blank=True
    )
    color = serializers.ChoiceField(choices=LIST_COLOR_VALUES, required=False)


class TaskListMembersSerializer(serializers.Serializer):
    """Invitation de membres sur une liste."""

    user_uuids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=MAX_MEMBERS_PER_LIST,
    )


class TaskItemCreateSerializer(serializers.Serializer):
    """Création d'une tâche."""

    title = serializers.CharField(max_length=MAX_TASK_TITLE_LENGTH)
    note = serializers.CharField(
        max_length=MAX_TASK_NOTE_LENGTH, required=False, allow_blank=True, default=""
    )
    priority = serializers.ChoiceField(
        choices=PRIORITY_VALUES, required=False, default=PRIORITY_NORMAL
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    assignee_uuid = serializers.UUIDField(required=False, allow_null=True)


class TaskItemUpdateSerializer(serializers.Serializer):
    """Mise à jour partielle d'une tâche (seuls les champs fournis changent)."""

    title = serializers.CharField(max_length=MAX_TASK_TITLE_LENGTH, required=False)
    note = serializers.CharField(
        max_length=MAX_TASK_NOTE_LENGTH, required=False, allow_blank=True
    )
    priority = serializers.ChoiceField(choices=PRIORITY_VALUES, required=False)
    done = serializers.BooleanField(required=False)
    due_date = serializers.DateField(required=False, allow_null=True)
    assignee_uuid = serializers.UUIDField(required=False, allow_null=True)
    position = serializers.IntegerField(required=False, min_value=0)


class TaskCommentSerializer(serializers.Serializer):
    """Ajout d'un commentaire sur une tâche."""

    text = serializers.CharField(max_length=MAX_COMMENT_LENGTH)
