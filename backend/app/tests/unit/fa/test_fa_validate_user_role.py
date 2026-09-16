"""Tests : validation stricte du role IEC/chef_labo pour les actions de validation FA.

Couvre les 3 actions soumises a la regle metier :
- validate_open_phase
- validate_progress_phase
- close_fa
"""

from datetime import date
from unittest.mock import Mock

import pytest

from app.domain.exceptions import ValidationException
from app.domain.fa.models.fa_bean import FaBean
from app.domain.fa.models.fa_constants import FaStatus
from app.domain.fa.services.fa_service import (
    close_fa,
    validate_open_phase,
    validate_progress_phase,
)
from app.domain.user.models.user_bean import (
    ROLE_ASSEMBLEUR,
    ROLE_CHEF_LABO,
    ROLE_IEC,
    ROLE_METROLOGUE,
    UserBean,
)


def _make_user(role: str, uuid: str = "u-1"):
    return UserBean(
        uuid=uuid,
        username="alice",
        first_name="Alice",
        last_name="Martin",
        roles=[role],
        is_active=True,
    )


def _make_user_repo(returned_user):
    repo = Mock()
    repo.get_by_uuid.return_value = returned_user
    return repo


def _make_fa_repo(bean):
    repo = Mock()
    repo.get_by_uuid.return_value = bean
    repo.update.side_effect = lambda b: b
    return repo


@pytest.fixture
def fa_open():
    return FaBean(
        uuid="fa-1",
        status_id=FaStatus.OPEN,
        event_date=date(2024, 1, 1),
    )


@pytest.fixture
def fa_in_progress():
    return FaBean(
        uuid="fa-1",
        status_id=FaStatus.IN_PROGRESS,
        iec_validation_open_date=date(2024, 1, 5),
        iec_validation_progress=True,
    )


@pytest.mark.unit
class TestValidateOpenPhaseUserRole:
    def test_iec_role_accepted(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)
        user_repo = _make_user_repo(_make_user(ROLE_IEC))

        result = validate_open_phase(
            fa_repo,
            "fa-1",
            validator_user_uuid="u-1",
            user_repository=user_repo,
        )

        assert result.iec_validation_open is True
        assert result.iec_validation_open_user_uuid == "u-1"
        assert result.iec_validation_open_name == "Alice Martin"

    def test_chef_labo_accepted(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)
        user_repo = _make_user_repo(_make_user(ROLE_CHEF_LABO))

        result = validate_open_phase(
            fa_repo,
            "fa-1",
            validator_user_uuid="u-1",
            user_repository=user_repo,
        )

        assert result.iec_validation_open_user_uuid == "u-1"

    def test_metrologue_rejected(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)
        user_repo = _make_user_repo(_make_user(ROLE_METROLOGUE))

        with pytest.raises(ValidationException) as exc_info:
            validate_open_phase(
                fa_repo,
                "fa-1",
                validator_user_uuid="u-1",
                user_repository=user_repo,
            )
        assert "metrologue" in str(exc_info.value).lower()

    def test_assembleur_rejected(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)
        user_repo = _make_user_repo(_make_user(ROLE_ASSEMBLEUR))

        with pytest.raises(ValidationException):
            validate_open_phase(
                fa_repo,
                "fa-1",
                validator_user_uuid="u-1",
                user_repository=user_repo,
            )

    def test_unknown_user_rejected(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)
        user_repo = _make_user_repo(None)  # user introuvable

        with pytest.raises(ValidationException) as exc_info:
            validate_open_phase(
                fa_repo,
                "fa-1",
                validator_user_uuid="u-unknown",
                user_repository=user_repo,
            )
        assert "introuvable" in str(exc_info.value).lower()

    def test_legacy_name_only_accepted(self, fa_open):
        """Sans validator_user_uuid, validator_name seul fonctionne (transition)."""
        fa_repo = _make_fa_repo(fa_open)

        result = validate_open_phase(
            fa_repo,
            "fa-1",
            validator_name="Mr. Legacy",
        )
        assert result.iec_validation_open_name == "Mr. Legacy"
        assert result.iec_validation_open_user_uuid is None

    def test_no_validator_at_all_rejected(self, fa_open):
        fa_repo = _make_fa_repo(fa_open)

        with pytest.raises(ValidationException):
            validate_open_phase(fa_repo, "fa-1")


@pytest.mark.unit
class TestValidateProgressPhaseUserRole:
    def test_iec_accepted(self, fa_in_progress):
        # Reset progress flags pour simuler IN_PROGRESS sans validation faite
        fa_in_progress.iec_validation_progress = False

        fa_repo = _make_fa_repo(fa_in_progress)
        user_repo = _make_user_repo(_make_user(ROLE_IEC))

        result = validate_progress_phase(
            fa_repo,
            "fa-1",
            validator_user_uuid="u-1",
            user_repository=user_repo,
            validation_date=date(2024, 1, 12),
        )
        assert result.iec_validation_progress is True
        assert result.iec_validation_progress_user_uuid == "u-1"

    def test_assembleur_rejected(self, fa_in_progress):
        fa_in_progress.iec_validation_progress = False

        fa_repo = _make_fa_repo(fa_in_progress)
        user_repo = _make_user_repo(_make_user(ROLE_ASSEMBLEUR))

        with pytest.raises(ValidationException):
            validate_progress_phase(
                fa_repo,
                "fa-1",
                validator_user_uuid="u-1",
                user_repository=user_repo,
                validation_date=date(2024, 1, 12),
            )


@pytest.mark.unit
class TestCloseFaUserRole:
    def test_iec_accepted(self, fa_in_progress):
        fa_repo = _make_fa_repo(fa_in_progress)
        user_repo = _make_user_repo(_make_user(ROLE_IEC))

        result = close_fa(
            fa_repo,
            "fa-1",
            closure_validation="OK",
            validator_user_uuid="u-1",
            user_repository=user_repo,
            closure_date=date(2024, 2, 1),
        )
        assert result.status_id == FaStatus.CLOSED
        assert result.closure_validator_user_uuid == "u-1"

    def test_chef_labo_accepted(self, fa_in_progress):
        fa_repo = _make_fa_repo(fa_in_progress)
        user_repo = _make_user_repo(_make_user(ROLE_CHEF_LABO))

        result = close_fa(
            fa_repo,
            "fa-1",
            closure_validation="OK",
            validator_user_uuid="u-1",
            user_repository=user_repo,
            closure_date=date(2024, 2, 1),
        )
        assert result.closure_validator_user_uuid == "u-1"

    def test_assembleur_rejected(self, fa_in_progress):
        fa_repo = _make_fa_repo(fa_in_progress)
        user_repo = _make_user_repo(_make_user(ROLE_ASSEMBLEUR))

        with pytest.raises(ValidationException):
            close_fa(
                fa_repo,
                "fa-1",
                closure_validation="OK",
                validator_user_uuid="u-1",
                user_repository=user_repo,
                closure_date=date(2024, 2, 1),
            )
