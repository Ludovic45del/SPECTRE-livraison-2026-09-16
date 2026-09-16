"""Controller d'administration des utilisateurs — reserve aux admins (chef de labo)."""

import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action

from app.api.user.serializers import CreateUserSerializer, UpdateUserSerializer
from app.core.permissions import IsAdmin
from app.domain.user.services import user_service
from app.mapper.user.user_mapper import user_mapper_api_to_bean, user_mapper_bean_to_api
from app.repository.user.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


class UserAdminController(viewsets.ViewSet):
    """CRUD utilisateurs — acces admin uniquement."""

    lookup_field = "uuid"
    permission_classes = [IsAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = UserRepository()

    def get_throttles(self):
        # Durcir les endpoints qui émettent un jeton ou créent un compte
        # (anti-spam / brute-force).
        if self.action in ("create", "reset_password"):
            self.throttle_scope = "password_reset"
        return super().get_throttles()

    def list(self, request):
        """GET /api/v1/users/"""
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
            limit = min(max(1, int(request.query_params.get("limit", 50))), 100)
        except (ValueError, TypeError):
            return JsonResponse(
                {"error": "Les parametres offset et limit doivent etre des entiers"},
                status=400,
            )
        beans = user_service.list_users(self.repository, offset=offset, limit=limit)
        data = [user_mapper_bean_to_api(b) for b in beans]
        return JsonResponse(data, safe=False)

    def retrieve(self, request, uuid: str = None):
        """GET /api/v1/users/{uuid}/"""
        bean = user_service.get_user_by_uuid(self.repository, uuid)
        return JsonResponse(user_mapper_bean_to_api(bean))

    def create(self, request):
        """POST /api/v1/users/ — retourne le mot de passe temporaire a communiquer.

        Le mot de passe (fourni par l'admin ou genere aleatoirement) est renvoye
        une seule fois, avec Cache-Control: no-store. L'utilisateur devra le
        changer a sa premiere connexion (force_password_change).
        """
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bean = user_mapper_api_to_bean(serializer.validated_data)
        password = serializer.validated_data.get("password")
        created_bean, generated_password = user_service.create_user(
            self.repository,
            bean,
            password=password,
        )

        logger.info(
            "Admin %s a cree l'utilisateur %s (roles=%s)",
            request.user.username,
            created_bean.username,
            created_bean.roles,
        )

        response_data = user_mapper_bean_to_api(created_bean)
        response_data["generated_password"] = generated_password
        response = JsonResponse(response_data, status=201)
        response["Cache-Control"] = "no-store"
        return response

    def update(self, request, uuid: str = None):
        """PUT /api/v1/users/{uuid}/"""
        serializer = UpdateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bean = user_mapper_api_to_bean(serializer.validated_data)
        updated_bean = user_service.update_user(self.repository, uuid, bean)

        logger.info(
            "Admin %s a modifie l'utilisateur %s",
            request.user.username,
            updated_bean.username,
        )
        return JsonResponse(user_mapper_bean_to_api(updated_bean))

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle_active(self, request, uuid: str = None):
        """PATCH /api/v1/users/{uuid}/toggle/"""
        bean = user_service.toggle_active(self.repository, uuid)

        action_label = "active" if bean.is_active else "desactive"
        logger.info(
            "Admin %s a %s l'utilisateur %s",
            request.user.username,
            action_label,
            bean.username,
        )
        return JsonResponse(user_mapper_bean_to_api(bean))

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, uuid: str = None):
        """POST /api/v1/users/{uuid}/reset-password/ — retourne le mot de passe temporaire.

        L'ancien mot de passe est immediatement invalide ; le nouveau, genere
        aleatoirement, est renvoye une seule fois (Cache-Control: no-store) et
        devra etre change a la premiere connexion (force_password_change).
        """
        target_bean, generated_password = user_service.reset_password(
            self.repository, uuid
        )

        logger.info(
            "Admin %s a reinitialise le mot de passe de %s",
            request.user.username,
            target_bean.username,
        )

        response_data = {
            "message": "Mot de passe temporaire genere avec succes",
            "username": target_bean.username,
            "generated_password": generated_password,
        }
        response = JsonResponse(response_data)
        response["Cache-Control"] = "no-store"
        return response
