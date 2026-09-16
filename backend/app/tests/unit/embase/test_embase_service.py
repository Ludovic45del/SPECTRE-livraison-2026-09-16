"""Tests unitaires pour le service Embase."""

from unittest.mock import MagicMock

import pytest

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.embase_constants import PROTECTED_FIELDS
from app.domain.embase.models.fsec_history_bean import FsecHistoryEntryBean
from app.domain.embase.services import embase_service
from app.domain.embase.services.embase_service import (
    ALLOWED_PATCH_FIELDS,
    _validate_embase_type,
    count_all_embases,
    create_embase,
    delete_embase,
    get_all_embases,
    get_embase_by_uuid,
    get_fsec_history,
    patch_embase,
    update_embase,
)
from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)

# ============================================================================
# CREATE
# ============================================================================


class TestEmbaseServiceCreate:
    """Tests création d'Embase."""

    @pytest.mark.unit
    def test_create_embase_success(self, sample_embase_bean, mock_embase_repository):
        """Test création réussie d'une embase."""
        mock_embase_repository.create.return_value = sample_embase_bean

        result = create_embase(mock_embase_repository, sample_embase_bean)

        assert result.uuid == sample_embase_bean.uuid
        assert result.identifier == "G01"
        mock_embase_repository.exists_by_identifier.assert_called_once_with("G01")
        mock_embase_repository.create.assert_called_once_with(sample_embase_bean)

    @pytest.mark.unit
    def test_create_embase_duplicate_raises_conflict(self, sample_embase_bean):
        """Test qu'un doublon lève ConflictException."""
        mock_repo = MagicMock()
        mock_repo.exists_by_identifier.return_value = True

        with pytest.raises(ConflictException):
            create_embase(mock_repo, sample_embase_bean)

        mock_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_embase_invalid_type_raises_validation(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test qu'un type invalide lève ValidationException."""
        sample_embase_bean.type = "invalid_type"

        with pytest.raises(ValidationException):
            create_embase(mock_embase_repository, sample_embase_bean)

        mock_embase_repository.create.assert_not_called()


# ============================================================================
# GET
# ============================================================================


class TestEmbaseServiceGet:
    """Tests récupération d'Embase."""

    @pytest.mark.unit
    def test_get_embase_by_uuid_success(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test récupération par UUID."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        result = get_embase_by_uuid(mock_embase_repository, sample_embase_bean.uuid)

        assert result.identifier == "G01"
        mock_embase_repository.get_by_uuid.assert_called_once_with(
            sample_embase_bean.uuid
        )

    @pytest.mark.unit
    def test_get_embase_by_uuid_not_found(self, mock_embase_repository):
        """Test NotFoundException si UUID inexistant."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            get_embase_by_uuid(mock_embase_repository, "fake-uuid")

    @pytest.mark.unit
    def test_get_all_embases(self, sample_embase_bean, mock_embase_repository):
        """Test récupération de la liste."""
        mock_embase_repository.get_all.return_value = [
            sample_embase_bean,
            sample_embase_bean,
        ]

        result = get_all_embases(mock_embase_repository)

        assert len(result) == 2
        mock_embase_repository.get_all.assert_called_once()

    @pytest.mark.unit
    def test_count_all_embases(self, mock_embase_repository):
        """Test comptage du nombre total d'embases."""
        mock_embase_repository.count_all.return_value = 42

        result = count_all_embases(mock_embase_repository)

        assert result == 42
        mock_embase_repository.count_all.assert_called_once()


# ============================================================================
# FSEC HISTORY
# ============================================================================


class TestGetFsecHistory:
    """Tests récupération de l'historique FSEC d'une embase."""

    @pytest.mark.unit
    def test_get_fsec_history_success(self, sample_embase_bean, mock_embase_repository):
        """Test récupération réussie de l'historique FSEC."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.get_fsec_history.return_value = [
            FsecHistoryEntryBean(
                fsec_uuid="fsec-uuid-1",
                fsec_version_uuid="version-uuid-1",
                fsec_name="FSEC-001",
                campaign_name="Campagne Test",
                campaign_uuid="campaign-uuid-1",
                date_of_fulfilment="2025-03-01",
                gas_type="Helium",
            )
        ]

        result = get_fsec_history(mock_embase_repository, sample_embase_bean.uuid)

        assert len(result) == 1
        assert result[0].fsec_name == "FSEC-001"
        mock_embase_repository.get_by_uuid.assert_called_once_with(
            sample_embase_bean.uuid
        )
        mock_embase_repository.get_fsec_history.assert_called_once_with(
            sample_embase_bean.uuid
        )

    @pytest.mark.unit
    def test_get_fsec_history_embase_not_found(self, mock_embase_repository):
        """Test NotFoundException si embase inexistante."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            get_fsec_history(mock_embase_repository, "nonexistent-uuid")

        mock_embase_repository.get_fsec_history.assert_not_called()


# ============================================================================
# UPDATE
# ============================================================================


class TestEmbaseServiceUpdate:
    """Tests mise à jour d'Embase."""

    @pytest.mark.unit
    def test_update_embase_success_same_identifier(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test update sans changement d'identifiant."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        result = update_embase(mock_embase_repository, sample_embase_bean)

        assert result.identifier == "G01"
        mock_embase_repository.exists_duplicate.assert_not_called()
        mock_embase_repository.update.assert_called_once()

    @pytest.mark.unit
    def test_update_embase_success_changed_identifier(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test update avec changement d'identifiant, pas de conflit."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        updated_bean = EmbaseBean(
            uuid=sample_embase_bean.uuid,
            identifier="G99",
            type="jet_de_gaz",
        )
        mock_embase_repository.update.return_value = updated_bean

        result = update_embase(mock_embase_repository, updated_bean)

        assert result.identifier == "G99"
        mock_embase_repository.exists_duplicate.assert_called_once_with(
            updated_bean.uuid, "G99"
        )
        mock_embase_repository.update.assert_called_once()

    @pytest.mark.unit
    def test_update_embase_conflict_on_identifier_change(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test ConflictException si identifiant déjà pris."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.exists_duplicate.return_value = True

        updated_bean = EmbaseBean(
            uuid=sample_embase_bean.uuid,
            identifier="G99",
            type="jet_de_gaz",
        )

        with pytest.raises(ConflictException):
            update_embase(mock_embase_repository, updated_bean)

        mock_embase_repository.update.assert_not_called()

    @pytest.mark.unit
    def test_update_embase_not_found(self, mock_embase_repository):
        """Test NotFoundException si UUID inexistant."""
        mock_embase_repository.get_by_uuid.return_value = None
        bean = EmbaseBean(uuid="fake-uuid", identifier="G01", type="jet_de_gaz")

        with pytest.raises(NotFoundException):
            update_embase(mock_embase_repository, bean)


# ============================================================================
# PATCH
# ============================================================================


class TestEmbaseServicePatch:
    """Tests mise à jour partielle d'Embase."""

    @pytest.mark.unit
    def test_patch_embase_success(self, sample_embase_bean, mock_embase_repository):
        """Test patch sans changement d'identifiant."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        result = patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"localisation_actuelle": "Labo 2"},
        )

        assert result is not None
        mock_embase_repository.update.assert_called_once()

    @pytest.mark.unit
    def test_patch_embase_conflict_on_identifier_change(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test ConflictException si patch change l'identifiant vers un existant."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.exists_duplicate.return_value = True

        with pytest.raises(ConflictException):
            patch_embase(
                mock_embase_repository,
                sample_embase_bean.uuid,
                {"identifier": "G99"},
            )

        mock_embase_repository.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_embase_not_found(self, mock_embase_repository):
        """Test NotFoundException si UUID inexistant."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            patch_embase(mock_embase_repository, "fake-uuid", {"type": "hp"})

    @pytest.mark.unit
    def test_patch_embase_ignores_protected_fields(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test que les champs protégés sont ignorés."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"uuid": "hacked", "created_at": "hacked"},
        )

        # L'UUID du bean passé à update ne doit pas être modifié
        call_args = mock_embase_repository.update.call_args[0][0]
        assert call_args.uuid == sample_embase_bean.uuid


# ============================================================================
# DELETE
# ============================================================================


class TestEmbaseServiceDelete:
    """Tests suppression d'Embase."""

    @pytest.mark.unit
    def test_delete_embase_success(self, sample_embase_bean, mock_embase_repository):
        """Test suppression réussie."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        result = delete_embase(mock_embase_repository, sample_embase_bean.uuid)
        assert result is True
        mock_embase_repository.delete.assert_called_once_with(sample_embase_bean.uuid)

    @pytest.mark.unit
    def test_delete_embase_not_found(self, mock_embase_repository):
        """Test NotFoundException si UUID inexistant."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            delete_embase(mock_embase_repository, "fake-uuid")


# ============================================================================
# LOGGER
# ============================================================================


class TestEmbaseServiceLogger:
    """Vérifie que le logger est défini."""

    @pytest.mark.unit
    def test_logger_is_not_none(self):
        assert embase_service.logger is not None


# ============================================================================
# _validate_embase_type
# ============================================================================


class TestValidateEmbaseType:
    """Tests de la validation du type d'embase."""

    @pytest.mark.unit
    def test_valid_type_jet_de_gaz(self):
        """Type jet_de_gaz ne lève pas d'exception."""
        _validate_embase_type("jet_de_gaz")  # Should not raise

    @pytest.mark.unit
    def test_valid_type_hp(self):
        _validate_embase_type("hp")

    @pytest.mark.unit
    def test_valid_type_bp(self):
        _validate_embase_type("bp")

    @pytest.mark.unit
    def test_empty_string_does_not_raise(self):
        """Un type vide est valide (falsy => skip validation)."""
        _validate_embase_type("")

    @pytest.mark.unit
    def test_invalid_type_raises_validation_exception(self):
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("invalid")
        assert "type" in str(exc_info.value)
        assert "invalid" in str(exc_info.value)

    @pytest.mark.unit
    def test_invalid_type_message_lists_valid_types(self):
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("foo")
        msg = str(exc_info.value)
        assert "bp" in msg
        assert "hp" in msg
        assert "jet_de_gaz" in msg


# ============================================================================
# CREATE - additional mutation-killing tests
# ============================================================================


class TestEmbaseServiceCreateExtra:
    """Tests supplémentaires pour create_embase."""

    @pytest.mark.unit
    def test_create_embase_with_type_hp(self, mock_embase_repository):
        """Test création avec type hp."""
        bean = EmbaseBean(identifier="H01", type="hp")
        mock_embase_repository.create.return_value = bean

        result = create_embase(mock_embase_repository, bean)

        assert result.type == "hp"

    @pytest.mark.unit
    def test_create_embase_with_type_bp(self, mock_embase_repository):
        """Test création avec type bp."""
        bean = EmbaseBean(identifier="B01", type="bp")
        mock_embase_repository.create.return_value = bean

        result = create_embase(mock_embase_repository, bean)

        assert result.type == "bp"

    @pytest.mark.unit
    def test_create_embase_returns_repository_result(self, mock_embase_repository):
        """Verify create returns exactly what repository returns."""
        bean = EmbaseBean(identifier="G01", type="jet_de_gaz")
        expected = EmbaseBean(uuid="new-uuid", identifier="G01", type="jet_de_gaz")
        mock_embase_repository.create.return_value = expected

        result = create_embase(mock_embase_repository, bean)

        assert result is expected

    @pytest.mark.unit
    def test_create_validates_type_before_checking_duplicate(
        self, mock_embase_repository
    ):
        """If type is invalid, ConflictException check is not reached."""
        bean = EmbaseBean(identifier="G01", type="invalid")

        with pytest.raises(ValidationException):
            create_embase(mock_embase_repository, bean)

        mock_embase_repository.exists_by_identifier.assert_not_called()

    @pytest.mark.unit
    def test_create_conflict_exception_contains_identifier(self):
        """ConflictException includes the conflicting identifier."""
        mock_repo = MagicMock()
        mock_repo.exists_by_identifier.return_value = True
        bean = EmbaseBean(identifier="G42", type="jet_de_gaz")

        with pytest.raises(ConflictException) as exc_info:
            create_embase(mock_repo, bean)

        assert exc_info.value.field == "identifier"
        assert exc_info.value.value == "G42"


# ============================================================================
# GET - additional mutation-killing tests
# ============================================================================


class TestEmbaseServiceGetExtra:
    """Tests supplémentaires pour les fonctions de récupération."""

    @pytest.mark.unit
    def test_get_embase_by_uuid_returns_bean(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify returned value is the exact bean from repository."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        result = get_embase_by_uuid(mock_embase_repository, sample_embase_bean.uuid)

        assert result is sample_embase_bean

    @pytest.mark.unit
    def test_get_embase_not_found_exception_contains_uuid(self, mock_embase_repository):
        """NotFoundException includes the UUID searched."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_embase_by_uuid(mock_embase_repository, "test-uuid-123")

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "test-uuid-123"

    @pytest.mark.unit
    def test_get_all_embases_passes_limit_and_offset(self, mock_embase_repository):
        """Verify limit and offset are forwarded to repository."""
        mock_embase_repository.get_all.return_value = []

        get_all_embases(mock_embase_repository, limit=10, offset=20)

        mock_embase_repository.get_all.assert_called_once_with(limit=10, offset=20)

    @pytest.mark.unit
    def test_get_all_embases_default_params(self, mock_embase_repository):
        """Verify default params: limit=None, offset=0."""
        mock_embase_repository.get_all.return_value = []

        get_all_embases(mock_embase_repository)

        mock_embase_repository.get_all.assert_called_once_with(limit=None, offset=0)

    @pytest.mark.unit
    def test_get_all_embases_returns_repository_result(self, mock_embase_repository):
        expected = [EmbaseBean(identifier="G01"), EmbaseBean(identifier="G02")]
        mock_embase_repository.get_all.return_value = expected

        result = get_all_embases(mock_embase_repository)

        assert result is expected

    @pytest.mark.unit
    def test_get_all_embases_empty_list(self, mock_embase_repository):
        mock_embase_repository.get_all.return_value = []

        result = get_all_embases(mock_embase_repository)

        assert result == []

    @pytest.mark.unit
    def test_count_all_embases_returns_repo_value(self, mock_embase_repository):
        """Verify the count value is directly from repository."""
        mock_embase_repository.count_all.return_value = 0

        result = count_all_embases(mock_embase_repository)

        assert result == 0


# ============================================================================
# FSEC HISTORY - additional
# ============================================================================


class TestGetFsecHistoryExtra:
    """Tests supplémentaires pour get_fsec_history."""

    @pytest.mark.unit
    def test_get_fsec_history_returns_empty_list(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test returned list can be empty."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.get_fsec_history.return_value = []

        result = get_fsec_history(mock_embase_repository, sample_embase_bean.uuid)

        assert result == []

    @pytest.mark.unit
    def test_get_fsec_history_not_found_exception_details(self, mock_embase_repository):
        """NotFoundException details for fsec history."""
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fsec_history(mock_embase_repository, "test-uuid")

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "test-uuid"

    @pytest.mark.unit
    def test_get_fsec_history_returns_repository_result(
        self, sample_embase_bean, mock_embase_repository
    ):
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        expected = [
            FsecHistoryEntryBean(
                fsec_uuid="f1",
                fsec_version_uuid="v1",
                fsec_name="FSEC-1",
                campaign_name="Camp-1",
                campaign_uuid="c1",
            )
        ]
        mock_embase_repository.get_fsec_history.return_value = expected

        result = get_fsec_history(mock_embase_repository, sample_embase_bean.uuid)

        assert result is expected


# ============================================================================
# UPDATE - additional mutation-killing tests
# ============================================================================


class TestEmbaseServiceUpdateExtra:
    """Tests supplémentaires pour update_embase."""

    @pytest.mark.unit
    def test_update_embase_invalid_type_raises_validation(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Test that invalid type on update raises ValidationException."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        updated = EmbaseBean(
            uuid=sample_embase_bean.uuid, identifier="G01", type="bad_type"
        )

        with pytest.raises(ValidationException):
            update_embase(mock_embase_repository, updated)

        mock_embase_repository.update.assert_not_called()

    @pytest.mark.unit
    def test_update_embase_not_found_exception_details(self, mock_embase_repository):
        mock_embase_repository.get_by_uuid.return_value = None
        bean = EmbaseBean(uuid="uuid-xyz", identifier="G01", type="jet_de_gaz")

        with pytest.raises(NotFoundException) as exc_info:
            update_embase(mock_embase_repository, bean)

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "uuid-xyz"

    @pytest.mark.unit
    def test_update_embase_returns_repository_result(
        self, sample_embase_bean, mock_embase_repository
    ):
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        expected = EmbaseBean(
            uuid=sample_embase_bean.uuid, identifier="G01", type="jet_de_gaz"
        )
        mock_embase_repository.update.return_value = expected

        result = update_embase(mock_embase_repository, sample_embase_bean)

        assert result is expected

    @pytest.mark.unit
    def test_update_embase_duplicate_check_with_correct_args(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Duplicate check passes correct uuid and new identifier."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        updated = EmbaseBean(
            uuid=sample_embase_bean.uuid, identifier="G_NEW", type="hp"
        )
        mock_embase_repository.update.return_value = updated

        update_embase(mock_embase_repository, updated)

        mock_embase_repository.exists_duplicate.assert_called_once_with(
            sample_embase_bean.uuid, "G_NEW"
        )

    @pytest.mark.unit
    def test_update_embase_conflict_exception_details(
        self, sample_embase_bean, mock_embase_repository
    ):
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.exists_duplicate.return_value = True
        updated = EmbaseBean(
            uuid=sample_embase_bean.uuid, identifier="TAKEN", type="jet_de_gaz"
        )

        with pytest.raises(ConflictException) as exc_info:
            update_embase(mock_embase_repository, updated)

        assert exc_info.value.field == "identifier"
        assert exc_info.value.value == "TAKEN"


# ============================================================================
# PATCH - additional mutation-killing tests
# ============================================================================


class TestEmbaseServicePatchExtra:
    """Tests supplémentaires pour patch_embase."""

    @pytest.mark.unit
    def test_patch_updates_localisation(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify the field is actually set on the bean."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"localisation_actuelle": "Labo X"},
        )

        call_args = mock_embase_repository.update.call_args[0][0]
        assert call_args.localisation_actuelle == "Labo X"

    @pytest.mark.unit
    def test_patch_updates_type(self, sample_embase_bean, mock_embase_repository):
        """Verify type field is updated on patch."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"type": "hp"},
        )

        call_args = mock_embase_repository.update.call_args[0][0]
        assert call_args.type == "hp"

    @pytest.mark.unit
    def test_patch_invalid_type_raises_validation(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Patching with invalid type raises ValidationException."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        with pytest.raises(ValidationException):
            patch_embase(
                mock_embase_repository,
                sample_embase_bean.uuid,
                {"type": "invalid_type"},
            )

        mock_embase_repository.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_ignores_fields_not_in_allowed(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Fields not in ALLOWED_PATCH_FIELDS are silently ignored."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"nonexistent_field": "value"},
        )

        mock_embase_repository.update.assert_called_once()

    @pytest.mark.unit
    def test_patch_multiple_fields(self, sample_embase_bean, mock_embase_repository):
        """Patch with multiple fields at once."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {
                "localisation_actuelle": "Labo 5",
                "soufflet_v1": "New Soufflet",
                "capteur_v1": "New Capteur",
            },
        )

        call_args = mock_embase_repository.update.call_args[0][0]
        assert call_args.localisation_actuelle == "Labo 5"
        assert call_args.soufflet_v1 == "New Soufflet"
        assert call_args.capteur_v1 == "New Capteur"

    @pytest.mark.unit
    def test_patch_identifier_no_conflict(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Patch identifier when no conflict exists."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"identifier": "G99"},
        )

        call_args = mock_embase_repository.update.call_args[0][0]
        assert call_args.identifier == "G99"
        mock_embase_repository.exists_duplicate.assert_called_once()

    @pytest.mark.unit
    def test_patch_identifier_unchanged_no_duplicate_check(
        self, sample_embase_bean, mock_embase_repository
    ):
        """If identifier is patched to the same value, no duplicate check."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"identifier": "G01"},  # Same as original
        )

        mock_embase_repository.exists_duplicate.assert_not_called()

    @pytest.mark.unit
    def test_patch_returns_repository_result(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify patch returns the result from repository.update."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        expected = EmbaseBean(identifier="G01", type="hp")
        mock_embase_repository.update.return_value = expected

        result = patch_embase(
            mock_embase_repository,
            sample_embase_bean.uuid,
            {"type": "hp"},
        )

        assert result is expected

    @pytest.mark.unit
    def test_patch_not_found_exception_details(self, mock_embase_repository):
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            patch_embase(mock_embase_repository, "uuid-abc", {"type": "hp"})

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "uuid-abc"

    @pytest.mark.unit
    def test_patch_conflict_exception_details(
        self, sample_embase_bean, mock_embase_repository
    ):
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_embase(
                mock_embase_repository,
                sample_embase_bean.uuid,
                {"identifier": "TAKEN"},
            )

        assert exc_info.value.field == "identifier"
        assert exc_info.value.value == "TAKEN"


# ============================================================================
# ALLOWED_PATCH_FIELDS
# ============================================================================


class TestAllowedPatchFields:
    """Tests du set ALLOWED_PATCH_FIELDS."""

    @pytest.mark.unit
    def test_protected_fields_not_in_allowed(self):
        """No protected field should be patchable."""
        for field in PROTECTED_FIELDS:
            assert field not in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_identifier_in_allowed(self):
        assert "identifier" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_type_in_allowed(self):
        assert "type" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_localisation_in_allowed(self):
        assert "localisation_actuelle" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_v1_fields_in_allowed(self):
        v1_fields = [
            "soufflet_v1",
            "capteur_v1",
            "offset_v1_mv",
            "mesurande_lie_v1_mv",
            "sensibilite_v1_mv",
            "signal_meteociel_v1_mv",
            "capteur_cible_pfeiffer_mbar",
            "etendue_v1_mbar",
            "test_etancheite_he",
            "test_capteur_mrg",
            "etalonnage_date",
            "observations_v1",
        ]
        for field in v1_fields:
            assert field in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_v2_fields_in_allowed(self):
        v2_fields = [
            "soufflet_v2",
            "capteur_v2",
            "offset_v2_mv",
            "mesurande_lie_v2_mv",
            "sensibilite_v2_mv",
            "signal_meteociel_v2_mv",
            "capteur_cible_pfeiffer_v2_mbar",
            "etendue_v2_mbar",
            "test_etancheite_he_v2",
            "test_capteur_mrg_v2",
            "observations_v2",
        ]
        for field in v2_fields:
            assert field in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_meca_fields_in_allowed(self):
        meca_fields = [
            "operationnelle_aimant",
            "operationnelle_broche",
            "cote_ve",
            "decalage_angulaire",
            "chargement_mcc",
        ]
        for field in meca_fields:
            assert field in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_electrovanne_in_allowed(self):
        assert "electrovanne" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_fsec_history_in_allowed(self):
        assert "fsec_history" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_nombre_voies_in_allowed(self):
        assert "nombre_voies" in ALLOWED_PATCH_FIELDS


# ============================================================================
# DELETE - additional
# ============================================================================


class TestEmbaseServiceDeleteExtra:
    """Tests supplémentaires pour delete_embase."""

    @pytest.mark.unit
    def test_delete_returns_true(self, sample_embase_bean, mock_embase_repository):
        """Verify delete always returns True on success."""
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        result = delete_embase(mock_embase_repository, sample_embase_bean.uuid)

        assert result is True

    @pytest.mark.unit
    def test_delete_not_found_exception_details(self, mock_embase_repository):
        mock_embase_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            delete_embase(mock_embase_repository, "uuid-del")

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "uuid-del"

    @pytest.mark.unit
    def test_delete_calls_repo_delete_with_uuid(
        self, sample_embase_bean, mock_embase_repository
    ):
        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        delete_embase(mock_embase_repository, "test-uuid")

        mock_embase_repository.delete.assert_called_once_with("test-uuid")


# ============================================================================
# MUTATION-KILLING: Exception field names and error message content
# ============================================================================


class TestEmbaseServiceMutationKilling:
    """Kill mutants on exception field names and error messages."""

    @pytest.mark.unit
    def test_validate_embase_type_exception_field_is_type(self):
        """Verify ValidationException field is exactly 'type' (not 'XXtypeXX')."""
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("invalid_type")
        assert exc_info.value.field == "type"

    @pytest.mark.unit
    def test_validate_embase_type_message_contains_type_word(self):
        """Verify message contains 'Type' or type value."""
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("unknown")
        msg = str(exc_info.value)
        assert "unknown" in msg

    @pytest.mark.unit
    def test_validate_embase_type_message_contains_invalide(self):
        """Verify message contains 'invalide'."""
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("bad")
        msg = str(exc_info.value)
        assert "invalide" in msg

    @pytest.mark.unit
    def test_validate_embase_type_message_contains_types_valides(self):
        """Verify message contains 'Types valides'."""
        with pytest.raises(ValidationException) as exc_info:
            _validate_embase_type("wrong")
        msg = str(exc_info.value)
        assert "Types valides" in msg

    @pytest.mark.unit
    def test_create_embase_logger_message(self, mock_embase_repository):
        """Verify logger.info is called with 'Embase créée'."""
        from unittest.mock import patch

        bean = EmbaseBean(identifier="G01", type="jet_de_gaz")
        mock_embase_repository.create.return_value = bean

        with patch("app.domain.embase.services.embase_service.logger") as mock_logger:
            create_embase(mock_embase_repository, bean)
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Embase créée" in log_msg

    @pytest.mark.unit
    def test_update_embase_logger_message(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify logger.info is called with 'Embase mise à jour'."""
        from unittest.mock import patch

        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        with patch("app.domain.embase.services.embase_service.logger") as mock_logger:
            update_embase(mock_embase_repository, sample_embase_bean)
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "mise à jour" in log_msg

    @pytest.mark.unit
    def test_patch_embase_logger_message(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify logger.info is called with 'Embase patchée'."""
        from unittest.mock import patch

        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean
        mock_embase_repository.update.return_value = sample_embase_bean

        with patch("app.domain.embase.services.embase_service.logger") as mock_logger:
            patch_embase(
                mock_embase_repository,
                sample_embase_bean.uuid,
                {"localisation_actuelle": "L1"},
            )
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "patchée" in log_msg

    @pytest.mark.unit
    def test_delete_embase_logger_message(
        self, sample_embase_bean, mock_embase_repository
    ):
        """Verify logger.info is called with 'Embase supprimée'."""
        from unittest.mock import patch

        mock_embase_repository.get_by_uuid.return_value = sample_embase_bean

        with patch("app.domain.embase.services.embase_service.logger") as mock_logger:
            delete_embase(mock_embase_repository, sample_embase_bean.uuid)
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "supprimée" in log_msg
