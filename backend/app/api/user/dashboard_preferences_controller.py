"""Controller preferences dashboard — GET/PUT pour l'utilisateur connecte."""

import logging

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from app.api.user.serializers import DashboardPreferencesSerializer
from app.domain.user.services import dashboard_preferences_service
from app.mapper.user.dashboard_preferences_mapper import (
    dashboard_preferences_bean_to_dict,
)
from app.repository.user.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


class DashboardPreferencesController(viewsets.ViewSet):
    """Preferences dashboard de l'utilisateur connecte."""

    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = UserRepository()

    def _get_profile(self, request):
        """Récupère le profil utilisateur ou lève une erreur claire."""
        if not hasattr(request.user, "profile"):
            return None
        return request.user.profile

    def list(self, request):
        """GET /api/v1/auth/dashboard-preferences/"""
        profile = self._get_profile(request)
        if profile is None:
            return JsonResponse(
                {
                    "error": "Profil utilisateur introuvable",
                    "code": "USER_PROFILE_NOT_FOUND",
                },
                status=404,
            )
        bean = dashboard_preferences_service.get_preferences(
            self.repository, profile.uuid
        )
        return JsonResponse(dashboard_preferences_bean_to_dict(bean))

    def create(self, request):
        """PUT/POST /api/v1/auth/dashboard-preferences/"""
        serializer = DashboardPreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = self._get_profile(request)
        if profile is None:
            return JsonResponse(
                {
                    "error": "Profil utilisateur introuvable",
                    "code": "USER_PROFILE_NOT_FOUND",
                },
                status=404,
            )
        bean = dashboard_preferences_service.update_preferences(
            self.repository, profile.uuid, serializer.validated_data
        )
        return JsonResponse(
            dashboard_preferences_bean_to_dict(bean), status=status.HTTP_200_OK
        )
