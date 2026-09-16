"""Tests unitaires du service utilisateur.

Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.user.models.user_bean import (
    ALL_SPECTRE_ROLES,
    ROLE_ALTERNANT,
    ROLE_ASSEMBLEUR,
    ROLE_CHEF_LABO,
    ROLE_CRYOGENIE,
    ROLE_IEC,
    ROLE_METROLOGUE,
    ROLE_RCE,
    ROLE_STAGIAIRE,
    UserBean,
)
from app.domain.user.services import user_service


@pytest.fixture
def mock_user_repository():
    return MagicMock()


@pytest.fixture
def sample_user_bean():
    return UserBean(
        username="jean.dupont",
        first_name="Jean",
        last_name="Dupont",
        roles=[ROLE_IEC],
    )


# ----------------------------------------------------------------------- #
#  Module-level attributes
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestModuleLevelAttributes:
    def test_logger_exists(self):
        assert user_service.logger is not None
        assert isinstance(user_service.logger, logging.Logger)

    def test_all_spectre_roles_contains_all_roles(self):
        """Verify each role constant is in ALL_SPECTRE_ROLES."""
        assert ROLE_CHEF_LABO in ALL_SPECTRE_ROLES
        assert ROLE_IEC in ALL_SPECTRE_ROLES
        assert ROLE_RCE in ALL_SPECTRE_ROLES
        assert ROLE_STAGIAIRE in ALL_SPECTRE_ROLES
        assert ROLE_ALTERNANT in ALL_SPECTRE_ROLES
        assert ROLE_ASSEMBLEUR in ALL_SPECTRE_ROLES
        assert ROLE_METROLOGUE in ALL_SPECTRE_ROLES
        assert ROLE_CRYOGENIE in ALL_SPECTRE_ROLES
        assert len(ALL_SPECTRE_ROLES) == 8


# ----------------------------------------------------------------------- #
#  set_user_avatar / delete_user_avatar
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestAvatarService:
    def test_set_user_avatar_processes_then_persists(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.set_avatar.return_value = sample_user_bean
        upload = MagicMock(name="uploaded_image")

        with patch(
            "app.core.avatar_image.process_avatar", return_value="processed-file"
        ) as proc:
            result = user_service.set_user_avatar(mock_user_repository, uid, upload)

        proc.assert_called_once_with(upload)
        mock_user_repository.set_avatar.assert_called_once_with(uid, "processed-file")
        assert result is sample_user_bean

    def test_set_user_avatar_not_found_raises(self, mock_user_repository):
        mock_user_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            user_service.set_user_avatar(
                mock_user_repository, uuid.uuid4(), MagicMock()
            )
        mock_user_repository.set_avatar.assert_not_called()

    def test_set_user_avatar_unreadable_image_raises_validation(
        self, mock_user_repository, sample_user_bean
    ):
        from django.core.files.uploadedfile import SimpleUploadedFile

        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        bad = SimpleUploadedFile(
            "x.jpg", b"definitely not an image", content_type="image/jpeg"
        )
        with pytest.raises(ValidationException):
            user_service.set_user_avatar(mock_user_repository, uuid.uuid4(), bad)
        mock_user_repository.set_avatar.assert_not_called()

    def test_delete_user_avatar_clears_via_set_avatar_none(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.set_avatar.return_value = sample_user_bean

        user_service.delete_user_avatar(mock_user_repository, uid)

        mock_user_repository.set_avatar.assert_called_once_with(uid, None)

    def test_delete_user_avatar_not_found_raises(self, mock_user_repository):
        mock_user_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            user_service.delete_user_avatar(mock_user_repository, uuid.uuid4())
        mock_user_repository.set_avatar.assert_not_called()


# ----------------------------------------------------------------------- #
#  _validate_roles
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestValidateRoles:
    def test_valid_role_passes(self):
        """Each valid role should not raise."""
        for role in ALL_SPECTRE_ROLES:
            user_service._validate_roles([role])  # should not raise

    def test_multiple_roles_are_normalized(self):
        """Roles cumules : dedoublonnes et tries par hierarchie."""
        assert user_service._validate_roles(
            ["metrologue", "chef_labo", "metrologue"]
        ) == ["chef_labo", "metrologue"]

    def test_one_invalid_role_among_valid_ones_raises(self):
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["iec", "invalid_role"])
        assert exc_info.value.field == "roles"

    def test_invalid_role_raises(self):
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["invalid_role"])
        assert exc_info.value.field == "roles"

    def test_empty_roles_raises(self):
        with pytest.raises(ValidationException):
            user_service._validate_roles([])

    def test_none_roles_raises(self):
        with pytest.raises(ValidationException):
            user_service._validate_roles(None)


# ----------------------------------------------------------------------- #
#  _generate_temporary_password
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestGenerateTemporaryPassword:
    def test_password_length(self):
        password = user_service._generate_temporary_password()
        assert len(password) == 12

    def test_password_custom_length(self):
        password = user_service._generate_temporary_password(length=20)
        assert len(password) == 20

    def test_password_complexity_lower(self):
        password = user_service._generate_temporary_password()
        assert any(c.islower() for c in password)

    def test_password_complexity_upper(self):
        password = user_service._generate_temporary_password()
        assert any(c.isupper() for c in password)

    def test_password_complexity_digit(self):
        password = user_service._generate_temporary_password()
        assert any(c.isdigit() for c in password)

    def test_password_complexity_special(self):
        password = user_service._generate_temporary_password()
        assert any(c in "!@#$%&*" for c in password)

    def test_password_only_uses_allowed_chars(self):
        import string

        allowed = string.ascii_letters + string.digits + "!@#$%&*"
        for _ in range(10):
            password = user_service._generate_temporary_password()
            for c in password:
                assert c in allowed

    def test_password_different_each_call(self):
        passwords = {user_service._generate_temporary_password() for _ in range(20)}
        # Very unlikely to generate 20 identical passwords
        assert len(passwords) > 1


# ----------------------------------------------------------------------- #
#  create_user
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestCreateUser:
    def test_create_user_success(self, mock_user_repository, sample_user_bean):
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        created, password = user_service.create_user(
            mock_user_repository, sample_user_bean
        )

        assert created == sample_user_bean
        assert created is sample_user_bean
        assert len(password) == 12
        mock_user_repository.exists_by_username.assert_called_once_with("jean.dupont")
        mock_user_repository.create.assert_called_once()

    def test_create_user_with_explicit_password(
        self, mock_user_repository, sample_user_bean
    ):
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        created, password = user_service.create_user(
            mock_user_repository, sample_user_bean, password="MyP@ssw0rd!"
        )

        assert password == "MyP@ssw0rd!"
        mock_user_repository.create.assert_called_once_with(
            sample_user_bean, "MyP@ssw0rd!"
        )

    def test_create_user_duplicate_username(
        self, mock_user_repository, sample_user_bean
    ):
        mock_user_repository.exists_by_username.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            user_service.create_user(mock_user_repository, sample_user_bean)

        assert exc_info.value.field == "username"
        assert exc_info.value.value == "jean.dupont"

    def test_create_user_invalid_role(self, mock_user_repository):
        bean = UserBean(username="test.user", roles=["invalid_role"])
        mock_user_repository.exists_by_username.return_value = False

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        assert exc_info.value.field == "roles"

    def test_create_user_username_empty(self, mock_user_repository):
        bean = UserBean(username="", roles=[ROLE_IEC])

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        assert exc_info.value.field == "username"

    def test_create_user_username_none(self, mock_user_repository):
        bean = UserBean(username=None, roles=[ROLE_IEC])

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        assert exc_info.value.field == "username"

    def test_create_user_username_whitespace(self, mock_user_repository):
        bean = UserBean(username="   ", roles=[ROLE_IEC])

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        assert exc_info.value.field == "username"

    def test_create_user_validates_username_before_role(self, mock_user_repository):
        """Username validation should happen before role validation."""
        bean = UserBean(username="", roles=["invalid_role"])

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        # Username error should come first
        assert exc_info.value.field == "username"

    def test_create_user_validates_role_before_duplicate_check(
        self, mock_user_repository
    ):
        """Role validation should happen before the duplicate check."""
        bean = UserBean(username="test.user", roles=["invalid_role"])
        # exists_by_username shouldn't even be called
        mock_user_repository.exists_by_username.return_value = True

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)

        assert exc_info.value.field == "roles"
        mock_user_repository.exists_by_username.assert_not_called()

    def test_create_user_each_valid_role(self, mock_user_repository):
        """Verify that each valid role is accepted."""
        for role in ALL_SPECTRE_ROLES:
            mock_user_repository.exists_by_username.return_value = False
            bean = UserBean(username=f"user_{role}", roles=[role])
            mock_user_repository.create.return_value = bean

            created, _ = user_service.create_user(mock_user_repository, bean)
            assert created.roles == [role]

    def test_create_user_returns_tuple(self, mock_user_repository, sample_user_bean):
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        result = user_service.create_user(mock_user_repository, sample_user_bean)

        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_create_user_rejects_common_password(
        self, mock_user_repository, sample_user_bean
    ):
        """validate_password refuse un mot de passe trop commun."""
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(
                mock_user_repository, sample_user_bean, password="password"
            )

        assert exc_info.value.field == "password"
        mock_user_repository.create.assert_not_called()

    def test_create_user_rejects_numeric_only_password(
        self, mock_user_repository, sample_user_bean
    ):
        """validate_password refuse un mot de passe purement numérique."""
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(
                mock_user_repository, sample_user_bean, password="12345678"
            )

        assert exc_info.value.field == "password"

    def test_create_user_rejects_password_similar_to_username(
        self, mock_user_repository
    ):
        """validate_password refuse un mot de passe trop similaire au username."""
        bean = UserBean(username="jean.dupont.laboratoire", roles=[ROLE_IEC])
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = bean

        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(
                mock_user_repository, bean, password="jean.dupont.labo"
            )

        assert exc_info.value.field == "password"


# ----------------------------------------------------------------------- #
#  get_user_by_uuid
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestGetUserByUuid:
    def test_get_user_found(self, mock_user_repository, sample_user_bean):
        mock_user_repository.get_by_uuid.return_value = sample_user_bean

        result = user_service.get_user_by_uuid(mock_user_repository, "some-uuid")

        assert result is sample_user_bean
        mock_user_repository.get_by_uuid.assert_called_once_with("some-uuid")

    def test_get_user_not_found(self, mock_user_repository):
        mock_user_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            user_service.get_user_by_uuid(mock_user_repository, "unknown-uuid")

        assert exc_info.value.resource == "USER"

    def test_get_user_not_found_identifier(self, mock_user_repository):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            user_service.get_user_by_uuid(mock_user_repository, uid)

        assert exc_info.value.identifier == str(uid)


# ----------------------------------------------------------------------- #
#  list_users
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestListUsers:
    def test_list_users(self, mock_user_repository, sample_user_bean):
        mock_user_repository.get_all.return_value = [sample_user_bean]

        result = user_service.list_users(mock_user_repository)

        assert len(result) == 1
        assert result[0] is sample_user_bean

    def test_list_users_empty(self, mock_user_repository):
        mock_user_repository.get_all.return_value = []

        result = user_service.list_users(mock_user_repository)

        assert result == []

    def test_list_users_default_params(self, mock_user_repository):
        mock_user_repository.get_all.return_value = []

        user_service.list_users(mock_user_repository)

        mock_user_repository.get_all.assert_called_once_with(
            offset=0, limit=50, roles=None, is_active=None
        )

    def test_list_users_with_pagination_params(self, mock_user_repository):
        beans = [UserBean(username=f"user{i}", roles=[ROLE_IEC]) for i in range(3)]
        mock_user_repository.get_all.return_value = beans

        result = user_service.list_users(mock_user_repository, offset=2, limit=5)

        assert result == beans
        mock_user_repository.get_all.assert_called_once_with(
            offset=2, limit=5, roles=None, is_active=None
        )

    def test_list_users_offset_exceeds_length(self, mock_user_repository):
        mock_user_repository.get_all.return_value = []

        result = user_service.list_users(mock_user_repository, offset=100, limit=10)

        assert result == []
        mock_user_repository.get_all.assert_called_once_with(
            offset=100, limit=10, roles=None, is_active=None
        )

    def test_list_users_with_role_filter(self, mock_user_repository):
        mock_user_repository.get_all.return_value = []

        user_service.list_users(
            mock_user_repository, roles=["metrologue", "chef_labo"], is_active=True
        )

        mock_user_repository.get_all.assert_called_once_with(
            offset=0, limit=50, roles=["metrologue", "chef_labo"], is_active=True
        )


# ----------------------------------------------------------------------- #
#  update_user
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestUpdateUser:
    def test_update_user_success(self, mock_user_repository, sample_user_bean):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        updated_bean = UserBean(
            first_name="Pierre",
            last_name="Martin",
            roles=[ROLE_CHEF_LABO],
        )
        mock_user_repository.update.return_value = updated_bean

        result = user_service.update_user(mock_user_repository, uid, updated_bean)

        assert result is updated_bean
        mock_user_repository.get_by_uuid.assert_called_once_with(uid)

    def test_update_user_sets_uuid_on_bean(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        bean = UserBean(roles=[ROLE_IEC])
        mock_user_repository.update.return_value = bean

        user_service.update_user(mock_user_repository, uid, bean)

        assert bean.uuid == uid
        mock_user_repository.update.assert_called_once_with(bean)

    def test_update_user_not_found(self, mock_user_repository):
        mock_user_repository.get_by_uuid.return_value = None
        bean = UserBean(roles=[ROLE_IEC])
        uid = uuid.uuid4()

        with pytest.raises(NotFoundException) as exc_info:
            user_service.update_user(mock_user_repository, uid, bean)

        assert exc_info.value.resource == "USER"
        assert exc_info.value.identifier == str(uid)

    def test_update_user_invalid_role(self, mock_user_repository, sample_user_bean):
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        bean = UserBean(roles=["invalid_role"])

        with pytest.raises(ValidationException) as exc_info:
            user_service.update_user(mock_user_repository, "some-uuid", bean)

        assert exc_info.value.field == "roles"
        mock_user_repository.update.assert_not_called()


# ----------------------------------------------------------------------- #
#  toggle_active
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestToggleActive:
    def test_toggle_active_success(self, mock_user_repository, sample_user_bean):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        toggled_bean = UserBean(
            username=sample_user_bean.username,
            is_active=False,
        )
        mock_user_repository.toggle_active.return_value = toggled_bean

        result = user_service.toggle_active(mock_user_repository, uid)

        assert result.is_active is False
        assert result is toggled_bean
        mock_user_repository.get_by_uuid.assert_called_once_with(uid)
        mock_user_repository.toggle_active.assert_called_once_with(uid)

    def test_toggle_active_user_not_found(self, mock_user_repository):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            user_service.toggle_active(mock_user_repository, uid)

        assert exc_info.value.resource == "USER"
        mock_user_repository.toggle_active.assert_not_called()


# ----------------------------------------------------------------------- #
#  reset_password
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestResetPassword:
    def test_reset_password_success(self, mock_user_repository, sample_user_bean):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean

        bean, new_password = user_service.reset_password(mock_user_repository, uid)

        assert bean is sample_user_bean
        assert isinstance(new_password, str)
        mock_user_repository.get_by_uuid.assert_called_once_with(uid)
        mock_user_repository.reset_password.assert_called_once()

    def test_reset_password_returns_password_set_in_repository(
        self, mock_user_repository, sample_user_bean
    ):
        """Le mot de passe retourné est bien celui posé en base (communicable)."""
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean

        _, new_password = user_service.reset_password(mock_user_repository, uid)

        args, _ = mock_user_repository.reset_password.call_args
        called_uid, stored_password = args
        assert called_uid == uid
        assert stored_password == new_password
        assert len(new_password) >= 12

    def test_reset_password_user_not_found(self, mock_user_repository):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            user_service.reset_password(mock_user_repository, uid)

        assert exc_info.value.resource == "USER"
        mock_user_repository.reset_password.assert_not_called()


# ----------------------------------------------------------------------- #
#  change_password
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestChangePassword:
    def test_change_password_success(self, mock_user_repository, sample_user_bean):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        user_service.change_password(
            mock_user_repository, uid, "OldPass123!", "NewPass456!"
        )

        mock_user_repository.set_password.assert_called_once_with(uid, "NewPass456!")
        mock_user_repository.set_force_password_change.assert_called_once_with(
            uid, False
        )

    def test_change_password_calls_check_password(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        user_service.change_password(
            mock_user_repository, uid, "OldPass123!", "NewPass456!"
        )

        mock_user_repository.check_password.assert_called_once_with(uid, "OldPass123!")

    def test_change_password_wrong_current(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = False

        with pytest.raises(ValidationException) as exc_info:
            user_service.change_password(
                mock_user_repository, uid, "wrong", "NewPass456!"
            )

        assert exc_info.value.field == "current_password"
        mock_user_repository.set_password.assert_not_called()

    def test_change_password_same_as_current(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        with pytest.raises(ValidationException) as exc_info:
            user_service.change_password(
                mock_user_repository, uid, "SamePass1!", "SamePass1!"
            )

        assert exc_info.value.field == "new_password"
        mock_user_repository.set_password.assert_not_called()

    def test_change_password_user_not_found(self, mock_user_repository):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            user_service.change_password(
                mock_user_repository, uid, "old", "NewPass456!"
            )

        assert exc_info.value.resource == "USER"
        mock_user_repository.check_password.assert_not_called()
        mock_user_repository.set_password.assert_not_called()

    def test_change_password_rejects_weak_new_password(
        self, mock_user_repository, sample_user_bean
    ):
        """Le nouveau mot de passe doit passer validate_password."""
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        with pytest.raises(ValidationException) as exc_info:
            user_service.change_password(
                mock_user_repository, uid, "OldPass123!", "password"
            )

        assert exc_info.value.field == "password"
        mock_user_repository.set_password.assert_not_called()

    def test_change_password_returns_none(self, mock_user_repository, sample_user_bean):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        result = user_service.change_password(
            mock_user_repository, uid, "OldPass123!", "NewPass456!"
        )

        assert result is None

    def test_change_password_set_force_change_false(
        self, mock_user_repository, sample_user_bean
    ):
        """Verify that set_force_password_change is called with False specifically."""
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        user_service.change_password(
            mock_user_repository, uid, "OldPass123!", "NewPass456!"
        )

        call_args = mock_user_repository.set_force_password_change.call_args
        assert call_args[0][1] is False


# ----------------------------------------------------------------------- #
#  MUTATION-KILLING: Error message content
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestUserServiceErrorMessages:
    """Kill mutants on error message strings and separators."""

    def test_validate_role_error_contains_role_invalide(self):
        """Verify message contains 'Role invalide'."""
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["bad_role"])
        msg = str(exc_info.value)
        assert "Role invalide" in msg

    def test_validate_role_error_contains_roles_acceptes(self):
        """Verify message contains 'Roles acceptes'."""
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["bad_role"])
        msg = str(exc_info.value)
        assert "Roles acceptes" in msg

    def test_validate_role_error_contains_role_value(self):
        """Verify message contains the invalid role value."""
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["xyzzy"])
        msg = str(exc_info.value)
        assert "xyzzy" in msg

    def test_validate_role_error_contains_join_separator(self):
        """Verify the roles are joined with ', ' separator."""
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["invalid"])
        msg = str(exc_info.value)
        assert ", " in msg

    def test_validate_role_error_lists_all_roles(self):
        """Verify all valid roles appear in the error message."""
        with pytest.raises(ValidationException) as exc_info:
            user_service._validate_roles(["invalid"])
        msg = str(exc_info.value)
        for role in ALL_SPECTRE_ROLES:
            assert role in msg

    def test_create_user_empty_username_error_message(self, mock_user_repository):
        """Verify error message for empty username."""
        bean = UserBean(username="", roles=[ROLE_IEC])
        with pytest.raises(ValidationException) as exc_info:
            user_service.create_user(mock_user_repository, bean)
        assert "requis" in str(exc_info.value)

    def test_change_password_wrong_current_error_message(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = False

        with pytest.raises(ValidationException) as exc_info:
            user_service.change_password(mock_user_repository, uid, "wrong", "New1!")
        assert "incorrect" in str(exc_info.value)

    def test_change_password_same_password_error_message(
        self, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        with pytest.raises(ValidationException) as exc_info:
            user_service.change_password(mock_user_repository, uid, "Same1!", "Same1!")
        assert "different" in str(exc_info.value)


# ----------------------------------------------------------------------- #
#  MUTATION-KILLING: Logger messages
# ----------------------------------------------------------------------- #
@pytest.mark.unit
class TestUserServiceLoggerMessages:
    """Kill mutants on logger format strings."""

    @pytest.fixture
    def mock_user_repository(self):
        return MagicMock()

    @pytest.fixture
    def sample_user_bean(self):
        return UserBean(
            username="jean.dupont",
            first_name="Jean",
            last_name="Dupont",
            roles=[ROLE_IEC],
        )

    @patch("app.domain.user.services.user_service.logger")
    def test_create_user_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        mock_user_repository.exists_by_username.return_value = False
        mock_user_repository.create.return_value = sample_user_bean

        user_service.create_user(mock_user_repository, sample_user_bean)

        mock_logger.debug.assert_called()
        log_msg = mock_logger.debug.call_args[0][0]
        assert "Utilisateur cree" in log_msg

    @patch("app.domain.user.services.user_service.logger")
    def test_update_user_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.update.return_value = sample_user_bean

        user_service.update_user(mock_user_repository, uid, sample_user_bean)

        mock_logger.debug.assert_called()
        log_msg = mock_logger.debug.call_args[0][0]
        assert "Utilisateur modifie" in log_msg

    @patch("app.domain.user.services.user_service.logger")
    def test_toggle_active_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.toggle_active.return_value = sample_user_bean

        user_service.toggle_active(mock_user_repository, uid)

        mock_logger.debug.assert_called()
        log_msg = mock_logger.debug.call_args[0][0]
        assert "is_active" in log_msg

    @patch("app.domain.user.services.user_service.logger")
    def test_reset_password_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean

        user_service.reset_password(mock_user_repository, uid)

        mock_logger.debug.assert_called()
        log_msg = mock_logger.debug.call_args[0][0]
        assert "reinitialise" in log_msg

    @patch("app.domain.user.services.user_service.logger")
    def test_reset_password_no_plaintext_password_in_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        """Le log ne doit pas contenir le mot de passe jetable (anti-leak)."""
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean

        user_service.reset_password(mock_user_repository, uid)

        args, _ = mock_user_repository.reset_password.call_args
        _, throwaway_password = args
        log_msg = mock_logger.debug.call_args[0][0]
        for arg in mock_logger.debug.call_args[0][1:]:
            assert arg != throwaway_password
        assert throwaway_password not in log_msg

    @patch("app.domain.user.services.user_service.logger")
    def test_change_password_logs(
        self, mock_logger, mock_user_repository, sample_user_bean
    ):
        uid = uuid.uuid4()
        mock_user_repository.get_by_uuid.return_value = sample_user_bean
        mock_user_repository.check_password.return_value = True

        user_service.change_password(
            mock_user_repository, uid, "OldPass1!", "NewPass2!"
        )

        mock_logger.debug.assert_called()
        log_msg = mock_logger.debug.call_args[0][0]
        assert "change par" in log_msg
