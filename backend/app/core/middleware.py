"""
Middleware centralisé pour la gestion des erreurs et le tracing des requêtes.

Ce module contient:
- RequestIDMiddleware: Génère un request ID unique pour chaque requête HTTP
  et l'injecte dans le LogContext pour la traçabilité bout-en-bout.
- ErrorHandlerMiddleware: Capture toutes les exceptions métier et les convertit
  en réponses JSON standardisées avec les bons codes HTTP.
"""

import json
import uuid

from django.conf import settings
from django.http import JsonResponse

from app.core.logging import LogContext, api_logger
from app.domain.exceptions import (
    ConflictException,
    DomainException,
    ForbiddenException,
    InvalidDataException,
    NotFoundException,
    ValidationException,
)


class RequestIDMiddleware:
    """Middleware qui génère un request ID unique pour chaque requête.

    Le request ID est:
    - Injecté dans LogContext pour la traçabilité des logs
    - Ajouté dans le header de réponse X-Request-ID
    - Réutilisé si un header X-Request-ID est déjà présent (proxy/LB)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Réutiliser le request ID du proxy/LB ou en générer un nouveau
        request_id = request.META.get("HTTP_X_REQUEST_ID", str(uuid.uuid4())[:8])

        # Injecter dans le contexte de logging
        LogContext.set(
            request_id=request_id,
            user_id=(
                getattr(request.user, "id", None) if hasattr(request, "user") else None
            ),
        )

        try:
            response = self.get_response(request)
            # Ajouter le request ID dans le header de réponse
            response["X-Request-ID"] = request_id
            return response
        finally:
            # GARANTIR le nettoyage du contexte même en cas d'Exception serveur
            # pour éviter les fuites de données entre les requêtes (Thread/Async leak).
            LogContext.clear()


class ErrorHandlerMiddleware:
    """Middleware centralisant la gestion des erreurs API.

    Retourne des réponses JSON standardisées avec:
    - error: Message d'erreur lisible
    - type: Type d'exception (pour debug)
    - code: Code d'erreur machine-readable (pour le client)
    - status: Code HTTP
    """

    # Mapping exception -> (HTTP status, error code)
    EXCEPTION_CONFIG = {
        NotFoundException: (404, "NOT_FOUND"),
        ConflictException: (409, "CONFLICT"),
        ValidationException: (400, "VALIDATION_ERROR"),
        InvalidDataException: (400, "INVALID_DATA"),
        ForbiddenException: (403, "FORBIDDEN"),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def _build_error_response(
        self, message: str, error_type: str, code: str, status: int
    ) -> JsonResponse:
        """Construit une réponse d'erreur JSON standardisée."""
        return JsonResponse(
            {
                "error": message,
                "type": error_type,
                "code": code,
                "status": status,
            },
            status=status,
        )

    def process_exception(self, request, exception):
        """Traite les exceptions non gérées et retourne une réponse JSON."""

        # Gérer les erreurs de parsing JSON
        if isinstance(exception, json.JSONDecodeError):
            api_logger.warning("Invalid JSON in request: %s", exception)
            return self._build_error_response(
                message="Invalid JSON format",
                error_type="JSONDecodeError",
                code="INVALID_JSON",
                status=400,
            )

        # Gérer les exceptions métier
        if isinstance(exception, DomainException):
            # Trouver la configuration pour ce type d'exception
            status = 500
            code = "DOMAIN_ERROR"

            for exc_type, (exc_status, exc_code) in self.EXCEPTION_CONFIG.items():
                if isinstance(exception, exc_type):
                    status = exc_status
                    code = exc_code
                    break

            api_logger.warning("Domain error (%s): %s - %s", status, code, exception)

            # Enrichir le code d'erreur avec le contexte si disponible
            # En production, utiliser des codes génériques pour ne pas exposer le schéma
            enriched_code = (
                self._enrich_error_code(exception, code) if settings.DEBUG else code
            )

            return self._build_error_response(
                message=str(exception),
                error_type=type(exception).__name__,
                code=enriched_code,
                status=status,
            )

        # Erreurs inattendues (500)
        api_logger.exception("Unhandled error: %s", exception)
        return self._build_error_response(
            message="Internal server error",
            error_type="InternalError",
            code="INTERNAL_SERVER_ERROR",
            status=500,
        )

    def _enrich_error_code(self, exception: DomainException, base_code: str) -> str:
        """Enrichit le code d'erreur avec le contexte de l'exception.

        Exemples:
        - NotFoundException("Campaign", "123") -> "CAMPAIGN_NOT_FOUND"
        - ConflictException("name/year", "...") -> "CONFLICT_NAME_YEAR"
        """
        if isinstance(exception, NotFoundException):
            resource = getattr(exception, "resource", "").upper().replace(" ", "_")
            if resource:
                return f"{resource}_NOT_FOUND"

        if isinstance(exception, ConflictException):
            field = (
                getattr(exception, "field", "")
                .upper()
                .replace("/", "_")
                .replace(" ", "_")
            )
            if field:
                return f"CONFLICT_{field}"

        if isinstance(exception, ValidationException):
            field = getattr(exception, "field", "").upper().replace(" ", "_")
            if field:
                return f"VALIDATION_ERROR_{field}"

        return base_code


class SecurityHeadersMiddleware:
    """Ajoute les en-têtes de sécurité non fournis par django.middleware.security.

    - `Content-Security-Policy` : défense en profondeur XSS/clickjacking.
    - `Permissions-Policy` : restreint les APIs navigateurs sensibles.
    - `Referrer-Policy` est couvert par SECURE_REFERRER_POLICY (Django natif).

    Désactivé en DEBUG pour ne pas bloquer les outils de dev (React DevTools,
    Vite HMR, source maps inline). En production uniquement.
    """

    CSP_DIRECTIVES = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "base-uri 'self'; "
        "object-src 'none'"
    )

    PERMISSIONS_POLICY = (
        "geolocation=(), "
        "camera=(), "
        "microphone=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=(), "
        "fullscreen=(self)"
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = not settings.DEBUG

    def __call__(self, request):
        response = self.get_response(request)
        if self.enabled:
            response.setdefault("Content-Security-Policy", self.CSP_DIRECTIVES)
            response.setdefault("Permissions-Policy", self.PERMISSIONS_POLICY)
            response.setdefault("Cross-Origin-Opener-Policy", "same-origin")
            response.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        return response


class ForcePasswordChangeMiddleware:
    """Bloque l'acces a l'API si l'utilisateur doit changer son mot de passe.

    Endpoints autorises meme avec force_password_change=True :
    - /api/v1/auth/* (login, refresh, verify, blacklist, change-password, me)
    """

    ALLOWED_PREFIXES = [
        "/api/v1/auth/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ne jamais bloquer les requêtes preflight CORS
        # Sinon le front-end React recevra une erreur réseau opaque au lieu du JSON 403
        if request.method == "OPTIONS":
            return self.get_response(request)

        if (
            hasattr(request, "user")
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.force_password_change
            and not any(request.path.startswith(p) for p in self.ALLOWED_PREFIXES)
        ):
            return JsonResponse(
                {
                    "error": "Changement de mot de passe requis",
                    "code": "FORCE_PASSWORD_CHANGE",
                    "status": 403,
                },
                status=403,
            )
        return self.get_response(request)
