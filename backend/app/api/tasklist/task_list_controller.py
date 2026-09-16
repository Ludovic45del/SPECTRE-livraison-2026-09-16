"""Controller Listes de tâches partagées — API REST /task-lists/.

Toutes les routes exigent un utilisateur authentifié ; le périmètre de
visibilité (propriétaire ou membre invité) est appliqué par les services.
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet

from app.api.tasklist.serializers import (
    TaskCommentSerializer,
    TaskItemCreateSerializer,
    TaskItemUpdateSerializer,
    TaskListCreateSerializer,
    TaskListMembersSerializer,
    TaskListUpdateSerializer,
)
from app.domain.exceptions import InvalidDataException
from app.domain.tasklist.services import (
    task_comment_service,
    task_item_service,
    task_list_service,
)
from app.mapper.tasklist.task_list_api_mapper import (
    task_comment_bean_to_api,
    task_comment_beans_to_api,
    task_item_api_to_bean,
    task_item_bean_to_api,
    task_list_api_to_bean,
    task_list_bean_to_api,
    task_list_beans_to_api,
    task_list_detail_bean_to_api,
)
from app.repository.tasklist.repositories.task_comment_repository import (
    TaskCommentRepository,
)
from app.repository.tasklist.repositories.task_item_repository import TaskItemRepository
from app.repository.tasklist.repositories.task_list_repository import TaskListRepository


def _profile_not_found_response() -> JsonResponse:
    """Réponse 404 quand l'utilisateur connecté n'a pas de profil SPECTRE."""
    return JsonResponse(
        {"error": "Profil utilisateur introuvable", "code": "USER_PROFILE_NOT_FOUND"},
        status=404,
    )


def _validate(serializer_class, data):
    """Valide les données d'entrée, lève InvalidDataException (HTTP 400) sinon."""
    serializer = serializer_class(data=data)
    if not serializer.is_valid():
        raise InvalidDataException(str(serializer.errors))
    return serializer.validated_data


class TaskListController(ViewSet):
    """CRUD des listes partagées, de leurs membres, tâches et commentaires."""

    permission_classes = [IsAuthenticated]
    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.list_repository = TaskListRepository()
        self.item_repository = TaskItemRepository()
        self.comment_repository = TaskCommentRepository()

    def _requester_uuid(self, request):
        """UUID du profil de l'utilisateur connecté, ou None si profil absent."""
        profile = getattr(request.user, "profile", None)
        return str(profile.uuid) if profile is not None else None

    # ------------------------------------------------------------------
    # Listes
    # ------------------------------------------------------------------

    def list(self, request) -> JsonResponse:
        """GET /task-lists/ — listes visibles par l'utilisateur connecté."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        beans = task_list_service.get_task_lists(self.list_repository, requester)
        return JsonResponse(
            task_list_beans_to_api(beans), safe=False, encoder=DjangoJSONEncoder
        )

    def create(self, request) -> JsonResponse:
        """POST /task-lists/ — crée une liste (le demandeur devient propriétaire)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        payload = _validate(TaskListCreateSerializer, request.data)
        bean = task_list_api_to_bean(payload)
        member_uuids = [str(u) for u in payload.get("member_uuids", [])]
        result = task_list_service.create_task_list(
            self.list_repository, requester, bean, member_uuids
        )
        return JsonResponse(
            task_list_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """GET /task-lists/{uuid}/ — détail avec tâches."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        bean = task_list_service.get_task_list_detail(
            self.list_repository, requester, uuid
        )
        return JsonResponse(
            task_list_detail_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    def _apply_list_update(self, request, uuid) -> JsonResponse:
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        changes = _validate(TaskListUpdateSerializer, request.data)
        result = task_list_service.update_task_list(
            self.list_repository, requester, uuid, changes
        )
        return JsonResponse(task_list_bean_to_api(result), encoder=DjangoJSONEncoder)

    def update(self, request, uuid=None) -> JsonResponse:
        """PUT /task-lists/{uuid}/ — mise à jour (propriétaire uniquement)."""
        return self._apply_list_update(request, uuid)

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """PATCH /task-lists/{uuid}/ — mise à jour partielle."""
        return self._apply_list_update(request, uuid)

    def destroy(self, request, uuid=None) -> HttpResponse:
        """DELETE /task-lists/{uuid}/ — suppression (propriétaire uniquement)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        task_list_service.delete_task_list(self.list_repository, requester, uuid)
        return HttpResponse(status=204)

    # ------------------------------------------------------------------
    # Membres
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="members")
    def add_members(self, request, uuid=None) -> JsonResponse:
        """POST /task-lists/{uuid}/members/ — invite des membres (propriétaire)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        payload = _validate(TaskListMembersSerializer, request.data)
        member_uuids = [str(u) for u in payload["user_uuids"]]
        result = task_list_service.add_task_list_members(
            self.list_repository, requester, uuid, member_uuids
        )
        return JsonResponse(task_list_bean_to_api(result), encoder=DjangoJSONEncoder)

    @action(
        detail=True,
        methods=["delete"],
        url_path="members/(?P<member_uuid>[^/.]+)",
    )
    def remove_member(self, request, uuid=None, member_uuid=None) -> HttpResponse:
        """DELETE /task-lists/{uuid}/members/{member_uuid}/ — retire un membre
        (propriétaire) ou quitte la liste (le membre lui-même)."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        task_list_service.remove_task_list_member(
            self.list_repository, requester, uuid, member_uuid
        )
        return HttpResponse(status=204)

    # ------------------------------------------------------------------
    # Tâches
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="tasks")
    def create_task(self, request, uuid=None) -> JsonResponse:
        """POST /task-lists/{uuid}/tasks/ — crée une tâche dans la liste."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        payload = _validate(TaskItemCreateSerializer, request.data)
        bean = task_item_api_to_bean(payload)
        result = task_item_service.create_task(
            self.list_repository, self.item_repository, requester, uuid, bean
        )
        return JsonResponse(
            task_item_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="tasks/(?P<task_uuid>[^/.]+)",
    )
    def task_detail(self, request, uuid=None, task_uuid=None):
        """PATCH/DELETE /task-lists/{uuid}/tasks/{task_uuid}/."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        if request.method == "DELETE":
            task_item_service.delete_task(
                self.list_repository,
                self.item_repository,
                requester,
                uuid,
                task_uuid,
            )
            return HttpResponse(status=204)
        changes = _validate(TaskItemUpdateSerializer, request.data)
        if "assignee_uuid" in changes and changes["assignee_uuid"] is not None:
            changes["assignee_uuid"] = str(changes["assignee_uuid"])
        result = task_item_service.update_task(
            self.list_repository,
            self.item_repository,
            requester,
            uuid,
            task_uuid,
            changes,
        )
        return JsonResponse(task_item_bean_to_api(result), encoder=DjangoJSONEncoder)

    # ------------------------------------------------------------------
    # Commentaires
    # ------------------------------------------------------------------

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="tasks/(?P<task_uuid>[^/.]+)/comments",
    )
    def comments(self, request, uuid=None, task_uuid=None) -> JsonResponse:
        """GET/POST /task-lists/{uuid}/tasks/{task_uuid}/comments/."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        if request.method == "GET":
            beans = task_comment_service.get_task_comments(
                self.list_repository,
                self.item_repository,
                self.comment_repository,
                requester,
                uuid,
                task_uuid,
            )
            return JsonResponse(
                task_comment_beans_to_api(beans), safe=False, encoder=DjangoJSONEncoder
            )
        payload = _validate(TaskCommentSerializer, request.data)
        result = task_comment_service.add_task_comment(
            self.list_repository,
            self.item_repository,
            self.comment_repository,
            requester,
            uuid,
            task_uuid,
            payload["text"],
        )
        return JsonResponse(
            task_comment_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="tasks/(?P<task_uuid>[^/.]+)/comments/(?P<comment_uuid>[^/.]+)",
    )
    def delete_comment(
        self, request, uuid=None, task_uuid=None, comment_uuid=None
    ) -> HttpResponse:
        """DELETE .../comments/{comment_uuid}/ — auteur ou propriétaire."""
        requester = self._requester_uuid(request)
        if requester is None:
            return _profile_not_found_response()
        task_comment_service.delete_task_comment(
            self.list_repository,
            self.item_repository,
            self.comment_repository,
            requester,
            uuid,
            task_uuid,
            comment_uuid,
        )
        return HttpResponse(status=204)
