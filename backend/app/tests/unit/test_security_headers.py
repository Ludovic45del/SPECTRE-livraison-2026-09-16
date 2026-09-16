"""Tests unitaires du `SecurityHeadersMiddleware`.

Vérifie :
- En DEBUG : middleware inactif, pas de CSP/Permissions-Policy ajouté.
- Hors DEBUG : ajout de CSP, Permissions-Policy, COOP, CORP.
- Les entêtes existants ne sont pas écrasés (setdefault).
"""

from unittest.mock import patch

import pytest
from django.http import HttpResponse

from app.core.middleware import SecurityHeadersMiddleware


def _fake_get_response(_request):
    return HttpResponse("ok")


@pytest.mark.unit
class TestSecurityHeadersMiddleware:
    def test_in_debug_middleware_is_inactive(self):
        with patch("app.core.middleware.settings.DEBUG", True):
            mw = SecurityHeadersMiddleware(_fake_get_response)
            response = mw(None)
        assert "Content-Security-Policy" not in response
        assert "Permissions-Policy" not in response

    def test_production_sets_csp(self):
        with patch("app.core.middleware.settings.DEBUG", False):
            mw = SecurityHeadersMiddleware(_fake_get_response)
            response = mw(None)
        csp = response["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "object-src 'none'" in csp
        assert "form-action 'self'" in csp

    def test_production_sets_permissions_policy(self):
        with patch("app.core.middleware.settings.DEBUG", False):
            mw = SecurityHeadersMiddleware(_fake_get_response)
            response = mw(None)
        pp = response["Permissions-Policy"]
        assert "geolocation=()" in pp
        assert "camera=()" in pp
        assert "microphone=()" in pp

    def test_production_sets_cross_origin_headers(self):
        with patch("app.core.middleware.settings.DEBUG", False):
            mw = SecurityHeadersMiddleware(_fake_get_response)
            response = mw(None)
        assert response["Cross-Origin-Opener-Policy"] == "same-origin"
        assert response["Cross-Origin-Resource-Policy"] == "same-origin"

    def test_setdefault_respects_existing_header(self):
        def _get_response_with_custom_csp(_request):
            response = HttpResponse("ok")
            response["Content-Security-Policy"] = "custom-policy"
            return response

        with patch("app.core.middleware.settings.DEBUG", False):
            mw = SecurityHeadersMiddleware(_get_response_with_custom_csp)
            response = mw(None)
        assert response["Content-Security-Policy"] == "custom-policy"
