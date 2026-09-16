"""Tests d'intégration du endpoint `POST /auth/set-initial-password/`.

L'API admin ne renvoie plus de lien d'activation (création/reset renvoient un
mot de passe temporaire), mais l'endpoint public de consommation de jeton
reste en place. Les jetons sont donc émis directement via
`app.core.password_activation.issue_activation_token`.
"""

import json

import pytest
from django.contrib.auth.models import Group, User
from django.test import Client

from app.core.password_activation import issue_activation_token
from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.fixture
def target_profile(db):
    """Utilisateur cible avec profil, mot de passe initial connu."""
    Group.objects.get_or_create(name="operateur")
    user = User.objects.create_user(
        username="activation_target", password="OriginalP4ss!word"
    )
    user.groups.add(Group.objects.get(name="operateur"))
    profile = UserProfileEntity.objects.create(
        user=user, roles=["iec"], force_password_change=True
    )
    return profile


@pytest.mark.integration
@pytest.mark.django_db
class TestSetInitialPasswordFlow:
    """Consommation d'un jeton d'activation émis côté serveur."""

    def test_activate_sets_password_and_clears_force_flag(self, target_profile):
        token = issue_activation_token(target_profile)

        anon = Client()
        activate_resp = anon.post(
            "/api/v1/auth/set-initial-password/",
            data=json.dumps({"token": token, "new_password": "MyBrandNewP4ss!word"}),
            content_type="application/json",
        )
        assert activate_resp.status_code == 200

        user = User.objects.get(username="activation_target")
        assert user.check_password("MyBrandNewP4ss!word")
        assert user.profile.force_password_change is False

    def test_activate_consumes_token_single_use(self, target_profile):
        token = issue_activation_token(target_profile)

        anon = Client()
        r1 = anon.post(
            "/api/v1/auth/set-initial-password/",
            data=json.dumps({"token": token, "new_password": "Str0ngP4ss!word"}),
            content_type="application/json",
        )
        assert r1.status_code == 200

        r2 = anon.post(
            "/api/v1/auth/set-initial-password/",
            data=json.dumps({"token": token, "new_password": "An0therP4ss!word"}),
            content_type="application/json",
        )
        assert r2.status_code == 400

    def test_activate_rejects_weak_password(self, target_profile):
        token = issue_activation_token(target_profile)

        anon = Client()
        resp = anon.post(
            "/api/v1/auth/set-initial-password/",
            data=json.dumps({"token": token, "new_password": "password"}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_activate_rejects_invalid_token(self, db):
        anon = Client()
        resp = anon.post(
            "/api/v1/auth/set-initial-password/",
            data=json.dumps(
                {"token": "not-a-signed-token", "new_password": "Str0ngP4ss!word"}
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400
