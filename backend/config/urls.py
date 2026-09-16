"""
URL Configuration for SPECTRE project.
"""

import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from app.core.jwt import SpectreTokenObtainPairView


class ThrottledTokenObtainPairView(SpectreTokenObtainPairView):
    """Login endpoint with scoped rate limiting (5/minute)."""

    throttle_scope = "login"


class ThrottledTokenRefreshView(TokenRefreshView):
    """Refresh endpoint with scoped rate limiting (10/minute)."""

    throttle_scope = "refresh"


urlpatterns = [
    path("api/v1/", include("app.api.urls")),  # SPECTRE API
    # JWT Authentication endpoints
    path(
        "api/v1/auth/token/",
        ThrottledTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/v1/auth/token/refresh/",
        ThrottledTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path(
        "api/v1/auth/token/blacklist/",
        TokenBlacklistView.as_view(),
        name="token_blacklist",
    ),
]

# Admin only in DEBUG mode
if os.environ.get("DEBUG", "False").lower() == "true":
    urlpatterns.append(path("admin/", admin.site.urls))

# Sert MEDIA_ROOT directement via Django en DEBUG.
# En production le reverse proxy (nginx) doit exposer MEDIA_URL → MEDIA_ROOT.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
