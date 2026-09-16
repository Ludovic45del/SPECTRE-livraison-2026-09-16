"""Tests unitaires pour le service Etalonnage."""

from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.domain.embase.services import etalonnage_service
from app.domain.embase.services.etalonnage_service import (
    count_etalonnages_by_embase,
    create_etalonnage,
    delete_etalonnage,
    get_etalonnage_by_uuid,
    get_etalonnages_by_embase,
)
from app.domain.exceptions import (
    ConflictException,
    InvalidDataException,
    NotFoundException,
)

# ============================================================================
# GET
# ============================================================================


class TestEtalonnageServiceGet:
    """Tests récupération d'étalonnages."""

    @pytest.mark.unit
    def test_get_etalonnages_by_embase(
        self, sample_etalonnage_bean, mock_etalonnage_repository
    ):
        """Test récupération des étalonnages d'une embase."""
        mock_etalonnage_repository.get_by_embase_uuid_paginated.return_value = [
            sample_etalonnage_bean
        ]

        result = get_etalonnages_by_embase(mock_etalonnage_repository, "some-uuid")

        assert len(result) == 1
        mock_etalonnage_repository.get_by_embase_uuid_paginated.assert_called_once_with(
            "some-uuid", voie=None, limit=None, offset=0
        )

    @pytest.mark.unit
    def test_get_etalonnages_by_embase_with_voie_filter(
        self, mock_etalonnage_repository
    ):
        """Test filtrage par voie."""
        mock_etalonnage_repository.get_by_embase_uuid_paginated.return_value = []

        get_etalonnages_by_embase(mock_etalonnage_repository, "some-uuid", voie=1)

        mock_etalonnage_repository.get_by_embase_uuid_paginated.assert_called_once_with(
            "some-uuid", voie=1, limit=None, offset=0
        )


# ============================================================================
# CREATE
# ============================================================================


class TestEtalonnageServiceCreate:
    """Tests création d'étalonnage."""

    @pytest.mark.unit
    def test_create_etalonnage_success(
        self, sample_etalonnage_bean, mock_etalonnage_repository
    ):
        """Test création réussie."""
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = EmbaseBean(
            uuid=sample_etalonnage_bean.embase_uuid,
            identifier="G01",
            type="jet_de_gaz",
            nombre_voies=1,
        )
        mock_etalonnage_repository.create.return_value = sample_etalonnage_bean
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = (
            sample_etalonnage_bean
        )

        result = create_etalonnage(
            mock_etalonnage_repository, mock_embase_repo, sample_etalonnage_bean
        )

        assert result.voie == 1
        mock_etalonnage_repository.create.assert_called_once()
        mock_embase_repo.update.assert_called_once()

    @pytest.mark.unit
    def test_create_etalonnage_embase_not_found(
        self, sample_etalonnage_bean, mock_etalonnage_repository
    ):
        """Test NotFoundException si embase inexistante."""
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            create_etalonnage(
                mock_etalonnage_repository, mock_embase_repo, sample_etalonnage_bean
            )

    @pytest.mark.unit
    def test_create_etalonnage_voie2_on_single_voie_raises_error(
        self, mock_etalonnage_repository
    ):
        """Test InvalidDataException si voie 2 sur embase 1 voie."""
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            nombre_voies=1,
        )
        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=2, date=date(2025, 3, 1))

        with pytest.raises(InvalidDataException):
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

    @pytest.mark.unit
    def test_create_etalonnage_duplicate_raises_conflict(
        self, mock_etalonnage_repository
    ):
        """Test ConflictException si doublon embase/voie/date."""
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            nombre_voies=2,
        )
        mock_etalonnage_repository.exists_by_embase_voie_date.return_value = True

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1, date=date(2025, 3, 1))

        with pytest.raises(ConflictException):
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)


# ============================================================================
# DELETE
# ============================================================================


class TestEtalonnageServiceDelete:
    """Tests suppression d'étalonnage."""

    @pytest.mark.unit
    def test_delete_etalonnage_success(self, mock_etalonnage_repository):
        """Test suppression réussie."""
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz"
        )
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="some-uuid", embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        result = delete_etalonnage(
            mock_etalonnage_repository, mock_embase_repo, "some-uuid"
        )
        assert result is True

    @pytest.mark.unit
    def test_delete_etalonnage_not_found(self, mock_etalonnage_repository):
        """Test NotFoundException si UUID inexistant."""
        mock_embase_repo = MagicMock()
        mock_etalonnage_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "fake-uuid")


# ============================================================================
# LOGGER
# ============================================================================


class TestEtalonnageServiceLogger:
    """Vérifie que le logger est défini."""

    @pytest.mark.unit
    def test_logger_is_not_none(self):
        assert etalonnage_service.logger is not None


# ============================================================================
# GET BY UUID
# ============================================================================


class TestEtalonnageServiceGetByUuid:
    """Tests get_etalonnage_by_uuid."""

    @pytest.mark.unit
    def test_get_by_uuid_success(
        self, sample_etalonnage_bean, mock_etalonnage_repository
    ):
        mock_etalonnage_repository.get_by_uuid.return_value = sample_etalonnage_bean

        result = get_etalonnage_by_uuid(
            mock_etalonnage_repository, sample_etalonnage_bean.uuid
        )

        assert result is sample_etalonnage_bean
        mock_etalonnage_repository.get_by_uuid.assert_called_once_with(
            sample_etalonnage_bean.uuid
        )

    @pytest.mark.unit
    def test_get_by_uuid_not_found(self, mock_etalonnage_repository):
        mock_etalonnage_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_etalonnage_by_uuid(mock_etalonnage_repository, "fake-uuid")

        assert exc_info.value.resource == "Etalonnage"
        assert exc_info.value.identifier == "fake-uuid"


# ============================================================================
# GET - additional
# ============================================================================


class TestEtalonnageServiceGetExtra:
    """Tests supplémentaires get_etalonnages_by_embase."""

    @pytest.mark.unit
    def test_get_with_pagination(self, mock_etalonnage_repository):
        mock_etalonnage_repository.get_by_embase_uuid_paginated.return_value = []

        get_etalonnages_by_embase(
            mock_etalonnage_repository, "uuid", voie=1, limit=10, offset=5
        )

        mock_etalonnage_repository.get_by_embase_uuid_paginated.assert_called_once_with(
            "uuid", voie=1, limit=10, offset=5
        )

    @pytest.mark.unit
    def test_get_returns_repository_result(self, mock_etalonnage_repository):
        expected = [EtalonnageBean(embase_uuid="uuid-1")]
        mock_etalonnage_repository.get_by_embase_uuid_paginated.return_value = expected

        result = get_etalonnages_by_embase(mock_etalonnage_repository, "uuid-1")

        assert result is expected


# ============================================================================
# COUNT
# ============================================================================


class TestEtalonnageServiceCount:
    """Tests count_etalonnages_by_embase."""

    @pytest.mark.unit
    def test_count_without_voie(self, mock_etalonnage_repository):
        mock_etalonnage_repository.count_by_embase_uuid.return_value = 5

        result = count_etalonnages_by_embase(mock_etalonnage_repository, "uuid-1")

        assert result == 5
        mock_etalonnage_repository.count_by_embase_uuid.assert_called_once_with(
            "uuid-1", voie=None
        )

    @pytest.mark.unit
    def test_count_with_voie(self, mock_etalonnage_repository):
        mock_etalonnage_repository.count_by_embase_uuid.return_value = 3

        result = count_etalonnages_by_embase(
            mock_etalonnage_repository, "uuid-1", voie=2
        )

        assert result == 3
        mock_etalonnage_repository.count_by_embase_uuid.assert_called_once_with(
            "uuid-1", voie=2
        )

    @pytest.mark.unit
    def test_count_returns_zero(self, mock_etalonnage_repository):
        mock_etalonnage_repository.count_by_embase_uuid.return_value = 0

        result = count_etalonnages_by_embase(mock_etalonnage_repository, "uuid-1")

        assert result == 0


# ============================================================================
# CREATE - additional mutation-killing tests
# ============================================================================


class TestEtalonnageServiceCreateExtra:
    """Tests supplémentaires pour create_etalonnage."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self, mock_etalonnage_repository):
        """Verify create returns exactly what repository returns."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=2
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        expected = EtalonnageBean(uuid="new-uuid", embase_uuid="embase-uuid", voie=1)
        mock_etalonnage_repository.create.return_value = expected
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1)
        result = create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert result is expected

    @pytest.mark.unit
    def test_create_voie1_on_2voie_embase_succeeds(self, mock_etalonnage_repository):
        """Voie 1 is always valid regardless of nombre_voies."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="hp", nombre_voies=2
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.create.return_value = EtalonnageBean(
            embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1, date=date(2025, 1, 1))
        result = create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert result.voie == 1

    @pytest.mark.unit
    def test_create_voie2_on_2voie_embase_succeeds(self, mock_etalonnage_repository):
        """Voie 2 is valid when embase has 2 voies."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="hp", nombre_voies=2
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.create.return_value = EtalonnageBean(
            embase_uuid="embase-uuid", voie=2
        )
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=2)
        result = create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert result.voie == 2

    @pytest.mark.unit
    def test_create_without_date_skips_duplicate_check(
        self, mock_etalonnage_repository
    ):
        """If bean.date is None, no duplicate check is performed."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.create.return_value = EtalonnageBean(
            embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1, date=None)
        create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        mock_etalonnage_repository.exists_by_embase_voie_date.assert_not_called()

    @pytest.mark.unit
    def test_create_not_found_exception_details(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = None

        bean = EtalonnageBean(embase_uuid="missing-uuid", voie=1)
        with pytest.raises(NotFoundException) as exc_info:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert exc_info.value.resource == "Embase"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_create_invalid_data_message_for_voie2(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G42", type="bp", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=2)
        with pytest.raises(InvalidDataException) as exc_info:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert "G42" in str(exc_info.value)
        assert "1 voie" in str(exc_info.value)

    @pytest.mark.unit
    def test_create_conflict_exception_details(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.exists_by_embase_voie_date.return_value = True

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1, date=date(2025, 6, 15))
        with pytest.raises(ConflictException) as exc_info:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert exc_info.value.field == "embase/voie/date"
        assert "G01" in exc_info.value.value
        assert "V1" in exc_info.value.value
        assert "2025-06-15" in exc_info.value.value

    @pytest.mark.unit
    def test_create_calls_sync_after_create(self, mock_etalonnage_repository):
        """Verify sync_embase_mesures is called after successful creation."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.create.return_value = EtalonnageBean(
            embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1)
        create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        # sync_embase_mesures calls embase_repo.update
        mock_embase_repo.update.assert_called_once()

    @pytest.mark.unit
    def test_create_sync_sets_v1_fields_from_latest(self, mock_etalonnage_repository):
        """After create, sync should update embase V1 fields from latest etal."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            nombre_voies=1,
            offset_v1_mv=None,
        )
        mock_embase_repo.get_by_uuid.return_value = embase

        latest = EtalonnageBean(
            embase_uuid="embase-uuid",
            voie=1,
            offset_0_bar_mv=Decimal("5.5"),
            mesurande_0_bar_lie=Decimal("6.6"),
            signal_etendue_mv=Decimal("7.7"),
            signal_pa_meteociel=Decimal("8.8"),
        )
        mock_etalonnage_repository.create.return_value = latest
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = latest

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1)
        create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert embase.offset_v1_mv == Decimal("5.5")
        assert embase.mesurande_lie_v1_mv == Decimal("6.6")
        assert embase.sensibilite_v1_mv == Decimal("7.7")
        assert embase.signal_meteociel_v1_mv == Decimal("8.8")


# ============================================================================
# DELETE - additional mutation-killing tests
# ============================================================================


class TestEtalonnageServiceDeleteExtra:
    """Tests supplémentaires pour delete_etalonnage."""

    @pytest.mark.unit
    def test_delete_returns_true(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(uuid="embase-uuid", identifier="G01", type="jet_de_gaz")
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="etal-uuid", embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        result = delete_etalonnage(
            mock_etalonnage_repository, mock_embase_repo, "etal-uuid"
        )

        assert result is True

    @pytest.mark.unit
    def test_delete_not_found_exception_details(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        mock_etalonnage_repository.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "uuid-xyz")

        assert exc_info.value.resource == "Etalonnage"
        assert exc_info.value.identifier == "uuid-xyz"

    @pytest.mark.unit
    def test_delete_repo_returns_false_raises_not_found(
        self, mock_etalonnage_repository
    ):
        """If repo.delete returns False, a second NotFoundException is raised."""
        mock_embase_repo = MagicMock()
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="etal-uuid", embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.delete.return_value = False

        with pytest.raises(NotFoundException):
            delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "etal-uuid")

    @pytest.mark.unit
    def test_delete_calls_sync_after_deletion(self, mock_etalonnage_repository):
        """After delete, sync should be called to update embase."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(uuid="embase-uuid", identifier="G01", type="jet_de_gaz")
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="etal-uuid", embase_uuid="embase-uuid", voie=2
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "etal-uuid")

        # sync called with voie=2
        mock_etalonnage_repository.get_latest_by_embase_voie.assert_called_once_with(
            "embase-uuid", 2
        )
        mock_embase_repo.update.assert_called_once()

    @pytest.mark.unit
    def test_delete_sync_clears_v2_fields_when_no_latest(
        self, mock_etalonnage_repository
    ):
        """After deleting last etal for voie 2, V2 fields should be None."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v2_mv=Decimal("1"),
            mesurande_lie_v2_mv=Decimal("2"),
            sensibilite_v2_mv=Decimal("3"),
            signal_meteociel_v2_mv=Decimal("4"),
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="etal-uuid", embase_uuid="embase-uuid", voie=2
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "etal-uuid")

        assert embase.offset_v2_mv is None
        assert embase.mesurande_lie_v2_mv is None
        assert embase.sensibilite_v2_mv is None
        assert embase.signal_meteociel_v2_mv is None

    @pytest.mark.unit
    def test_delete_calls_repo_delete_with_uuid(self, mock_etalonnage_repository):
        mock_embase_repo = MagicMock()
        mock_embase_repo.get_by_uuid.return_value = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz"
        )
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="target-uuid", embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "target-uuid")

        mock_etalonnage_repository.delete.assert_called_once_with("target-uuid")


# ============================================================================
# MUTATION-KILLING: Error message content and logger messages
# ============================================================================


class TestEtalonnageServiceMutationKilling:
    """Kill mutants on error message content and logger messages."""

    @pytest.mark.unit
    def test_create_voie2_error_contains_voie_2_non_disponible(
        self, mock_etalonnage_repository
    ):
        """Verify InvalidDataException message contains 'Voie 2 non disponible'."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="bp", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=2)
        with pytest.raises(InvalidDataException) as exc_info:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        msg = str(exc_info.value)
        assert "Voie 2 non disponible" in msg

    @pytest.mark.unit
    def test_create_etalonnage_logger_message(self, mock_etalonnage_repository):
        """Verify logger.info is called with 'Étalonnage créé'."""
        from unittest.mock import patch

        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.create.return_value = EtalonnageBean(
            embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1)

        with patch(
            "app.domain.embase.services.etalonnage_service.logger"
        ) as mock_logger:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "créé" in log_msg

    @pytest.mark.unit
    def test_delete_etalonnage_logger_message(self, mock_etalonnage_repository):
        """Verify logger.info is called with 'Étalonnage supprimé'."""
        from unittest.mock import patch

        mock_embase_repo = MagicMock()
        embase = EmbaseBean(uuid="embase-uuid", identifier="G01", type="jet_de_gaz")
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.get_by_uuid.return_value = EtalonnageBean(
            uuid="etal-uuid", embase_uuid="embase-uuid", voie=1
        )
        mock_etalonnage_repository.delete.return_value = True
        mock_etalonnage_repository.get_latest_by_embase_voie.return_value = None

        with patch(
            "app.domain.embase.services.etalonnage_service.logger"
        ) as mock_logger:
            delete_etalonnage(mock_etalonnage_repository, mock_embase_repo, "etal-uuid")
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "supprimé" in log_msg

    @pytest.mark.unit
    def test_create_conflict_field_is_embase_voie_date(
        self, mock_etalonnage_repository
    ):
        """Verify ConflictException field is 'embase/voie/date'."""
        mock_embase_repo = MagicMock()
        embase = EmbaseBean(
            uuid="embase-uuid", identifier="G01", type="jet_de_gaz", nombre_voies=1
        )
        mock_embase_repo.get_by_uuid.return_value = embase
        mock_etalonnage_repository.exists_by_embase_voie_date.return_value = True

        bean = EtalonnageBean(embase_uuid="embase-uuid", voie=1, date=date(2025, 1, 1))
        with pytest.raises(ConflictException) as exc_info:
            create_etalonnage(mock_etalonnage_repository, mock_embase_repo, bean)

        assert exc_info.value.field == "embase/voie/date"
