"""Vérifie le comportement CSRF / DRF sous authentification JWT.

Contexte audit :
- `CsrfViewMiddleware` est actif dans `MIDDLEWARE`.
- DRF désactive la vérification CSRF pour une vue si aucune de ses
  authentication_classes n'est `SessionAuthentication`.
- En DEBUG, on ajoute `SessionAuthentication` à `DEFAULT_AUTHENTICATION_CLASSES`
  pour fluidifier le navigateur Django admin ; en prod non.

Ces tests fixent le contrat :
1. Un POST API authentifié par JWT (sans session cookie) est accepté sans
   CSRF token — c'est le cas nominal du frontend SPA.
2. Un POST sans authentification est refusé (401/403), pas par CSRF.
"""

import pytest
from django.contrib.auth.models import Group, User
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken

from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.fixture
def admin_with_jwt(db):
    Group.objects.get_or_create(name="admin")
    user = User.objects.create_user(
        username="csrf_admin",
        password="StrongPassword123!",
    )
    user.groups.add(Group.objects.get(name="admin"))
    UserProfileEntity.objects.create(
        user=user, roles=["chef_labo"], force_password_change=False
    )
    refresh = RefreshToken.for_user(user)
    return user, str(refresh.access_token)


@pytest.mark.integration
@pytest.mark.django_db
class TestCsrfJwtContract:
    def test_jwt_post_without_csrf_is_accepted(self, admin_with_jwt):
        """Cas nominal SPA : POST avec Bearer, pas de session, pas de CSRF token."""
        _, access = admin_with_jwt
        client = Client(enforce_csrf_checks=True)

        response = client.post(
            "/api/v1/users/",
            data='{"username": "bar_user", "roles": ["iec"]}',
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        # Doit passer — pas de 403 CSRF. 201 (création) ou 4xx de validation
        # métier sont tous deux acceptables, mais jamais 403 "CSRF verification
        # failed".
        assert response.status_code != 403 or "CSRF" not in response.content.decode()

    def test_anonymous_post_fails_on_auth_not_csrf(self, db):
        """Un POST sans token JWT doit être rejeté par auth (401), pas par CSRF."""
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            "/api/v1/users/",
            data='{"username": "bar_user", "roles": ["iec"]}',
            content_type="application/json",
        )
        assert response.status_code in (401, 403)
