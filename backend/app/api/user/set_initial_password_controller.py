"""Controller de consommation du jeton d'activation / set-initial-password.

Endpoint public (pas d'authentification requise) : l'utilisateur arrive via un
lien signé généré lors de sa création ou d'un reset admin, et y définit son
mot de passe initial.
"""

import logging

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from app.api.user.serializers import SetInitialPasswordSerializer
from app.core.password_activation import consume_activation_token

logger = logging.getLogger(__name__)


class SetInitialPasswordController(viewsets.ViewSet):
    """Consomme un jeton d'activation et fixe le mot de passe."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "password_reset"

    def create(self, request):
        """POST /api/v1/auth/set-initial-password/"""
        serializer = SetInitialPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = consume_activation_token(
            serializer.validated_data["token"],
            serializer.validated_data["new_password"],
        )

        logger.info("Mot de passe initial défini pour %s", user.username)
        return JsonResponse({"message": "Mot de passe défini avec succès"}, status=200)
