"""Controller changement de mot de passe — self-service, tout utilisateur connecte."""

import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from app.api.user.serializers import ChangePasswordSerializer
from app.domain.user.services import user_service
from app.repository.user.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


class ChangePasswordController(viewsets.ViewSet):
    """Changement de mot de passe self-service."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "password_reset"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = UserRepository()

    def create(self, request):
        """POST /api/v1/auth/change-password/"""
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = request.user.profile
        user_service.change_password(
            self.repository,
            profile.uuid,
            serializer.validated_data["current_password"],
            serializer.validated_data["new_password"],
        )

        logger.info("Utilisateur %s a change son mot de passe", request.user.username)
        return JsonResponse({"message": "Mot de passe modifie avec succes"}, status=200)
