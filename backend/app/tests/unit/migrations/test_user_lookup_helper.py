"""Tests du helper de matching texte -> UserProfile.

Le helper est invoque depuis les RunPython des data migrations. Il s'appuie
sur apps.get_model() : on teste avec le vrai ORM via @pytest.mark.unit +
django_db pour creer quelques User/UserProfile en in-memory.
"""

import pytest
from django.apps import apps as django_apps
from django.contrib.auth.models import User

from app.migrations._user_lookup_helper import _normalize, match_user_profile
from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.mark.unit
class TestNormalize:
    def test_strip_and_lower(self):
        assert _normalize("  Alice  ") == "alice"

    def test_collapse_whitespace(self):
        assert _normalize("Jean   Pierre") == "jean pierre"

    def test_already_normalized(self):
        assert _normalize("bob martin") == "bob martin"


@pytest.mark.unit
@pytest.mark.django_db
class TestMatchUserProfile:
    def _create(self, username, first_name="", last_name=""):
        user = User.objects.create(
            username=username, first_name=first_name, last_name=last_name
        )
        return UserProfileEntity.objects.create(user=user, roles=["metrologue"])

    def test_returns_none_for_empty(self):
        assert match_user_profile(django_apps, "") is None
        assert match_user_profile(django_apps, None) is None
        assert match_user_profile(django_apps, "   ") is None

    def test_match_username_exact_insensitive(self):
        profile = self._create("alice", "Alice", "Martin")
        result = match_user_profile(django_apps, "ALICE")
        assert result == profile.uuid

    def test_match_full_name(self):
        profile = self._create("bobsmith", "Bob", "Smith")
        result = match_user_profile(django_apps, "Bob Smith")
        assert result == profile.uuid

    def test_match_full_name_case_insensitive(self):
        profile = self._create("bobsmith", "Bob", "Smith")
        result = match_user_profile(django_apps, "  bob   SMITH  ")
        assert result == profile.uuid

    def test_match_initial_then_last_name(self):
        profile = self._create("jdupont", "Jean", "Dupont")
        result = match_user_profile(django_apps, "J. Dupont")
        assert result == profile.uuid

    def test_match_initial_dash_form(self):
        profile = self._create("jmpetit", "Jean-Marie", "Petit")
        result = match_user_profile(django_apps, "J Petit")
        assert result == profile.uuid

    def test_no_match_returns_none(self):
        self._create("alice", "Alice", "Martin")
        assert match_user_profile(django_apps, "Inconnu Personne") is None

    def test_ambiguous_full_name_returns_none(self):
        self._create("dupont1", "Jean", "Dupont")
        self._create("dupont2", "Jean", "Dupont")
        # Deux Jean Dupont -> ambiguite -> None.
        assert match_user_profile(django_apps, "Jean Dupont") is None

    def test_ambiguous_initial_returns_none(self):
        self._create("user1", "Jean", "Petit")
        self._create("user2", "Julie", "Petit")
        # "J. Petit" matche les deux -> ambiguite -> None.
        assert match_user_profile(django_apps, "J. Petit") is None

    def test_username_takes_priority_over_full_name(self):
        # Si quelqu'un s'appelle "alice" en username ET un autre user a
        # first_name="Alice" last_name="Quelque chose", le username gagne.
        priority_profile = self._create("alice", "X", "Y")
        self._create("other", "Alice", "Quelque chose")
        result = match_user_profile(django_apps, "alice")
        assert result == priority_profile.uuid
