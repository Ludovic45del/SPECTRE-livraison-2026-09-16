"""Tests unitaires du mapper utilisateur."""

import uuid
from datetime import datetime
from unittest.mock import MagicMock

import pytest

from app.domain.user.models.user_bean import UserBean
from app.mapper.user.user_mapper import (
    user_mapper_api_to_bean,
    user_mapper_bean_to_api,
    user_mapper_entity_to_bean,
)

# ============================================================================
# entity_to_bean
# ============================================================================


@pytest.mark.unit
class TestEntityToBean:
    def _make_user(self, **overrides):
        user = MagicMock()
        user.username = overrides.get("username", "jdupont")
        user.first_name = overrides.get("first_name", "Jean")
        user.last_name = overrides.get("last_name", "Dupont")
        user.is_active = overrides.get("is_active", True)
        user.last_login = overrides.get("last_login", None)
        return user

    def _make_profile(self, **overrides):
        profile = MagicMock()
        profile.uuid = overrides.get("uuid", uuid.uuid4())
        profile.roles = overrides.get("roles", ["iec"])
        profile.laboratoire = overrides.get("laboratoire", "Labo A")
        profile.service = overrides.get("service", "Service X")
        profile.numero = overrides.get("numero", "001")
        profile.bureau = overrides.get("bureau", "B12")
        profile.force_password_change = overrides.get("force_password_change", False)
        profile.avatar = overrides.get("avatar", None)
        profile.created_at = overrides.get("created_at", datetime(2025, 1, 1, 12, 0))
        profile.updated_at = overrides.get("updated_at", datetime(2025, 6, 1, 12, 0))
        return profile

    def test_maps_all_fields(self):
        user = self._make_user()
        profile = self._make_profile()

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.uuid == profile.uuid
        assert bean.username == "jdupont"
        assert bean.first_name == "Jean"
        assert bean.last_name == "Dupont"
        assert bean.role == "iec"
        assert bean.permission_group == "operateur"
        assert bean.laboratoire == "Labo A"
        assert bean.service == "Service X"
        assert bean.numero == "001"
        assert bean.bureau == "B12"
        assert bean.is_active is True
        assert bean.force_password_change is False
        assert bean.avatar_url is None
        assert bean.last_login is None
        assert bean.created_at == datetime(2025, 1, 1, 12, 0)
        assert bean.updated_at == datetime(2025, 6, 1, 12, 0)

    def test_permission_group_admin(self):
        user = self._make_user()
        profile = self._make_profile(roles=["chef_labo"])

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.permission_group == "admin"

    def test_permission_group_lecteur(self):
        user = self._make_user()
        profile = self._make_profile(roles=["stagiaire"])

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.permission_group == "lecteur"

    def test_last_login_set(self):
        login_time = datetime(2025, 3, 15, 10, 30)
        user = self._make_user(last_login=login_time)
        profile = self._make_profile()

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.last_login == login_time

    def test_inactive_user(self):
        user = self._make_user(is_active=False)
        profile = self._make_profile()

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.is_active is False

    def test_avatar_url_from_image_field(self):
        avatar = MagicMock()
        avatar.url = "/api/media/users/avatars/abc.jpg"
        user = self._make_user()
        profile = self._make_profile(avatar=avatar)

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.avatar_url == "/api/media/users/avatars/abc.jpg"

    def test_avatar_url_none_when_no_avatar(self):
        user = self._make_user()
        profile = self._make_profile(avatar=None)

        bean = user_mapper_entity_to_bean(user, profile)

        assert bean.avatar_url is None


# ============================================================================
# bean_to_api
# ============================================================================


@pytest.mark.unit
class TestBeanToApi:
    def _make_bean(self, **overrides):
        defaults = dict(
            uuid=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            username="jdupont",
            first_name="Jean",
            last_name="Dupont",
            roles=["iec"],
            permission_group="operateur",
            laboratoire="Labo A",
            service="Service X",
            numero="001",
            bureau="B12",
            is_active=True,
            force_password_change=False,
            last_login=datetime(2025, 3, 15, 10, 30),
            created_at=datetime(2025, 1, 1, 12, 0),
            updated_at=datetime(2025, 6, 1, 12, 0),
        )
        defaults.update(overrides)
        return UserBean(**defaults)

    def test_maps_all_fields(self):
        bean = self._make_bean()

        result = user_mapper_bean_to_api(bean)

        assert result["uuid"] == "11111111-1111-1111-1111-111111111111"
        assert result["username"] == "jdupont"
        assert result["first_name"] == "Jean"
        assert result["last_name"] == "Dupont"
        assert result["role"] == "iec"
        assert result["permission_group"] == "operateur"
        assert result["laboratoire"] == "Labo A"
        assert result["service"] == "Service X"
        assert result["numero"] == "001"
        assert result["bureau"] == "B12"
        assert result["is_active"] is True
        assert result["force_password_change"] is False

    def test_datetime_iso_format(self):
        bean = self._make_bean(
            last_login=datetime(2025, 3, 15, 10, 30),
            created_at=datetime(2025, 1, 1, 12, 0),
            updated_at=datetime(2025, 6, 1, 12, 0),
        )

        result = user_mapper_bean_to_api(bean)

        assert result["last_login"] == "2025-03-15T10:30:00"
        assert result["created_at"] == "2025-01-01T12:00:00"
        assert result["updated_at"] == "2025-06-01T12:00:00"

    def test_nullable_datetimes(self):
        bean = self._make_bean(last_login=None, created_at=None, updated_at=None)

        result = user_mapper_bean_to_api(bean)

        assert result["last_login"] is None
        assert result["created_at"] is None
        assert result["updated_at"] is None

    def test_empty_optional_fields(self):
        bean = self._make_bean(laboratoire=None, service=None, numero=None, bureau=None)

        result = user_mapper_bean_to_api(bean)

        assert result["laboratoire"] == ""
        assert result["service"] == ""
        assert result["numero"] == ""
        assert result["bureau"] == ""

    def test_avatar_url_passthrough(self):
        bean = self._make_bean(avatar_url="/api/media/users/avatars/abc.jpg")

        result = user_mapper_bean_to_api(bean)

        assert result["avatar_url"] == "/api/media/users/avatars/abc.jpg"

    def test_avatar_url_none(self):
        result = user_mapper_bean_to_api(self._make_bean())

        assert result["avatar_url"] is None


# ============================================================================
# api_to_bean
# ============================================================================


@pytest.mark.unit
class TestApiToBean:
    def test_maps_full_payload(self):
        data = {
            "username": "jdupont",
            "first_name": "Jean",
            "last_name": "Dupont",
            "roles": ["iec"],
            "laboratoire": "Labo A",
            "service": "Service X",
            "numero": "001",
            "bureau": "B12",
        }

        bean = user_mapper_api_to_bean(data)

        assert bean.username == "jdupont"
        assert bean.first_name == "Jean"
        assert bean.last_name == "Dupont"
        assert bean.role == "iec"
        assert bean.laboratoire == "Labo A"

    def test_missing_optional_fields(self):
        data = {"username": "jdupont", "roles": ["iec"]}

        bean = user_mapper_api_to_bean(data)

        assert bean.username == "jdupont"
        assert bean.role == "iec"
        assert bean.first_name is None
        assert bean.last_name is None
        assert bean.laboratoire is None

    def test_empty_dict(self):
        bean = user_mapper_api_to_bean({})

        assert bean.username is None
        assert bean.role is None
