"""Tests unitaires du module `app.core.password_activation`.

Couvre :
- Signature / vérification du jeton (`TimestampSigner`).
- Expiration (TTL 24h).
- Single-use via `password_token_version`.
- Rejet d'un mot de passe faible via `validate_password`.
- Construction de l'URL d'activation.
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

from app.core import password_activation
from app.core.password_activation import (
    build_activation_url,
    consume_activation_token,
    issue_activation_token,
)
from app.domain.exceptions import ValidationException
from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.fixture
def admin_profile(db):
    user = User.objects.create_user(
        username="activation_target",
        password="OldValidP4ss!word",
    )
    return UserProfileEntity.objects.create(
        user=user, roles=["chef_labo"], force_password_change=True
    )


@pytest.mark.integration
@pytest.mark.django_db
class TestIssueActivationToken:
    def test_issue_returns_non_empty_signed_token(self, admin_profile):
        token = issue_activation_token(admin_profile)
        assert isinstance(token, str)
        assert ":" in token  # TimestampSigner format: payload:timestamp:sig

    def test_issue_increments_token_version(self, admin_profile):
        initial = admin_profile.password_token_version
        issue_activation_token(admin_profile)
        admin_profile.refresh_from_db()
        assert admin_profile.password_token_version == initial + 1

    def test_reissuing_invalidates_previous_token(self, admin_profile):
        token_a = issue_activation_token(admin_profile)
        issue_activation_token(admin_profile)  # invalide token_a
        with pytest.raises(ValidationException) as exc_info:
            consume_activation_token(token_a, "NewValidPassword123!")
        assert exc_info.value.field == "token"


@pytest.mark.integration
@pytest.mark.django_db
class TestConsumeActivationToken:
    def test_consume_sets_new_password_and_clears_force_flag(self, admin_profile):
        token = issue_activation_token(admin_profile)
        user = consume_activation_token(token, "BrandNewP4ss!word")
        admin_profile.refresh_from_db()

        assert user.check_password("BrandNewP4ss!word")
        assert admin_profile.force_password_change is False

    def test_consume_invalidates_token_single_use(self, admin_profile):
        token = issue_activation_token(admin_profile)
        consume_activation_token(token, "BrandNewP4ss!word")

        with pytest.raises(ValidationException):
            consume_activation_token(token, "AnotherP4ss!word")

    def test_consume_empty_token_raises(self):
        with pytest.raises(ValidationException) as exc_info:
            consume_activation_token("", "StrongP4ssw0rd!")
        assert exc_info.value.field == "token"

    def test_consume_malformed_token_raises(self):
        with pytest.raises(ValidationException) as exc_info:
            consume_activation_token("not-a-signed-token", "StrongP4ssw0rd!")
        assert exc_info.value.field == "token"

    def test_consume_expired_token_raises(self, admin_profile):
        token = issue_activation_token(admin_profile)

        # Simule le passage de 25 heures
        future = timezone.now() + timedelta(hours=25)
        with patch("django.core.signing.time.time", return_value=future.timestamp()):
            with pytest.raises(ValidationException) as exc_info:
                consume_activation_token(token, "StrongP4ssw0rd!")
        assert exc_info.value.field == "token"

    def test_consume_weak_password_raises_and_does_not_consume_token(
        self, admin_profile
    ):
        token = issue_activation_token(admin_profile)
        version_before = admin_profile.password_token_version

        with pytest.raises(ValidationException) as exc_info:
            consume_activation_token(token, "password")

        assert exc_info.value.field == "new_password"
        admin_profile.refresh_from_db()
        # Le rollback de la transaction atomique laisse la version intacte.
        assert admin_profile.password_token_version == version_before


@pytest.mark.unit
class TestBuildActivationUrl:
    def test_build_url_with_base(self):
        url = build_activation_url(
            "abc.def.ghi", base_url="https://spectre.example.com"
        )
        assert (
            url
            == "https://spectre.example.com/auth/set-initial-password?token=abc.def.ghi"
        )

    def test_build_url_strips_trailing_slash(self):
        url = build_activation_url("tok", base_url="https://host/")
        assert url == "https://host/auth/set-initial-password?token=tok"

    def test_build_url_without_base_returns_relative(self):
        url = build_activation_url("tok")
        assert url == "/auth/set-initial-password?token=tok"


@pytest.mark.unit
class TestModuleConstants:
    def test_ttl_is_24_hours(self):
        assert password_activation.TOKEN_TTL == timedelta(hours=24)

    def test_activation_path(self):
        assert password_activation.ACTIVATION_PATH == "/auth/set-initial-password"
