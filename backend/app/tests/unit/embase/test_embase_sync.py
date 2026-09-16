"""Tests unitaires pour le module embase_sync."""

from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.domain.embase.services import embase_sync
from app.domain.embase.services.embase_sync import sync_embase_mesures

# ============================================================================
# LOGGER EXISTS
# ============================================================================


class TestEmbaseSyncLogger:
    """Vérifie que le logger est défini."""

    @pytest.mark.unit
    def test_logger_is_not_none(self):
        assert embase_sync.logger is not None


# ============================================================================
# sync_embase_mesures - VOIE 1
# ============================================================================


class TestSyncEmbaseMesuresVoie1:
    """Tests sync_embase_mesures pour voie 1."""

    @pytest.mark.unit
    def test_sync_voie1_with_latest_etalonnage(self):
        """Sync updates V1 fields from latest etalonnage."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v1_mv=None,
            mesurande_lie_v1_mv=None,
            sensibilite_v1_mv=None,
            signal_meteociel_v1_mv=None,
        )
        embase_repo.get_by_uuid.return_value = embase

        latest = EtalonnageBean(
            embase_uuid="embase-uuid",
            voie=1,
            offset_0_bar_mv=Decimal("1.5"),
            mesurande_0_bar_lie=Decimal("2.5"),
            signal_etendue_mv=Decimal("3.5"),
            signal_pa_meteociel=Decimal("4.5"),
        )
        etal_repo.get_latest_by_embase_voie.return_value = latest

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 1)

        assert embase.offset_v1_mv == Decimal("1.5")
        assert embase.mesurande_lie_v1_mv == Decimal("2.5")
        assert embase.sensibilite_v1_mv == Decimal("3.5")
        assert embase.signal_meteociel_v1_mv == Decimal("4.5")
        embase_repo.update.assert_called_once_with(embase)

    @pytest.mark.unit
    def test_sync_voie1_no_latest_sets_none(self):
        """If no latest etalonnage, V1 fields are set to None."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v1_mv=Decimal("10"),
            mesurande_lie_v1_mv=Decimal("20"),
            sensibilite_v1_mv=Decimal("30"),
            signal_meteociel_v1_mv=Decimal("40"),
        )
        embase_repo.get_by_uuid.return_value = embase
        etal_repo.get_latest_by_embase_voie.return_value = None

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 1)

        assert embase.offset_v1_mv is None
        assert embase.mesurande_lie_v1_mv is None
        assert embase.sensibilite_v1_mv is None
        assert embase.signal_meteociel_v1_mv is None
        embase_repo.update.assert_called_once_with(embase)

    @pytest.mark.unit
    def test_sync_voie1_does_not_touch_v2_fields(self):
        """Syncing voie 1 should not modify V2 fields."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v2_mv=Decimal("99"),
            mesurande_lie_v2_mv=Decimal("88"),
            sensibilite_v2_mv=Decimal("77"),
            signal_meteociel_v2_mv=Decimal("66"),
        )
        embase_repo.get_by_uuid.return_value = embase

        latest = EtalonnageBean(
            embase_uuid="embase-uuid",
            voie=1,
            offset_0_bar_mv=Decimal("1"),
            mesurande_0_bar_lie=Decimal("2"),
            signal_etendue_mv=Decimal("3"),
            signal_pa_meteociel=Decimal("4"),
        )
        etal_repo.get_latest_by_embase_voie.return_value = latest

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 1)

        assert embase.offset_v2_mv == Decimal("99")
        assert embase.mesurande_lie_v2_mv == Decimal("88")
        assert embase.sensibilite_v2_mv == Decimal("77")
        assert embase.signal_meteociel_v2_mv == Decimal("66")


# ============================================================================
# sync_embase_mesures - VOIE 2
# ============================================================================


class TestSyncEmbaseMesuresVoie2:
    """Tests sync_embase_mesures pour voie 2."""

    @pytest.mark.unit
    def test_sync_voie2_with_latest_etalonnage(self):
        """Sync updates V2 fields from latest etalonnage."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v2_mv=None,
            mesurande_lie_v2_mv=None,
            sensibilite_v2_mv=None,
            signal_meteociel_v2_mv=None,
        )
        embase_repo.get_by_uuid.return_value = embase

        latest = EtalonnageBean(
            embase_uuid="embase-uuid",
            voie=2,
            offset_0_bar_mv=Decimal("10.1"),
            mesurande_0_bar_lie=Decimal("20.2"),
            signal_etendue_mv=Decimal("30.3"),
            signal_pa_meteociel=Decimal("40.4"),
        )
        etal_repo.get_latest_by_embase_voie.return_value = latest

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 2)

        assert embase.offset_v2_mv == Decimal("10.1")
        assert embase.mesurande_lie_v2_mv == Decimal("20.2")
        assert embase.sensibilite_v2_mv == Decimal("30.3")
        assert embase.signal_meteociel_v2_mv == Decimal("40.4")
        embase_repo.update.assert_called_once_with(embase)

    @pytest.mark.unit
    def test_sync_voie2_no_latest_sets_none(self):
        """If no latest etalonnage, V2 fields are set to None."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v2_mv=Decimal("10"),
            mesurande_lie_v2_mv=Decimal("20"),
            sensibilite_v2_mv=Decimal("30"),
            signal_meteociel_v2_mv=Decimal("40"),
        )
        embase_repo.get_by_uuid.return_value = embase
        etal_repo.get_latest_by_embase_voie.return_value = None

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 2)

        assert embase.offset_v2_mv is None
        assert embase.mesurande_lie_v2_mv is None
        assert embase.sensibilite_v2_mv is None
        assert embase.signal_meteociel_v2_mv is None
        embase_repo.update.assert_called_once_with(embase)

    @pytest.mark.unit
    def test_sync_voie2_does_not_touch_v1_fields(self):
        """Syncing voie 2 should not modify V1 fields."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()

        embase = EmbaseBean(
            uuid="embase-uuid",
            identifier="G01",
            type="jet_de_gaz",
            offset_v1_mv=Decimal("99"),
            mesurande_lie_v1_mv=Decimal("88"),
            sensibilite_v1_mv=Decimal("77"),
            signal_meteociel_v1_mv=Decimal("66"),
        )
        embase_repo.get_by_uuid.return_value = embase

        latest = EtalonnageBean(
            embase_uuid="embase-uuid",
            voie=2,
            offset_0_bar_mv=Decimal("1"),
            mesurande_0_bar_lie=Decimal("2"),
            signal_etendue_mv=Decimal("3"),
            signal_pa_meteociel=Decimal("4"),
        )
        etal_repo.get_latest_by_embase_voie.return_value = latest

        sync_embase_mesures(etal_repo, embase_repo, "embase-uuid", 2)

        assert embase.offset_v1_mv == Decimal("99")
        assert embase.mesurande_lie_v1_mv == Decimal("88")
        assert embase.sensibilite_v1_mv == Decimal("77")
        assert embase.signal_meteociel_v1_mv == Decimal("66")


# ============================================================================
# sync_embase_mesures - embase not found
# ============================================================================


class TestSyncEmbaseMesuresNotFound:
    """Tests sync_embase_mesures quand l'embase n'existe pas."""

    @pytest.mark.unit
    def test_sync_embase_not_found_returns_early(self):
        """If embase not found, function returns without error."""
        etal_repo = MagicMock()
        embase_repo = MagicMock()
        embase_repo.get_by_uuid.return_value = None

        sync_embase_mesures(etal_repo, embase_repo, "nonexistent-uuid", 1)

        etal_repo.get_latest_by_embase_voie.assert_not_called()
        embase_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_sync_calls_get_by_uuid_with_correct_uuid(self):
        etal_repo = MagicMock()
        embase_repo = MagicMock()
        embase_repo.get_by_uuid.return_value = None

        sync_embase_mesures(etal_repo, embase_repo, "test-uuid-123", 2)

        embase_repo.get_by_uuid.assert_called_once_with("test-uuid-123")

    @pytest.mark.unit
    def test_sync_calls_get_latest_with_correct_args(self):
        etal_repo = MagicMock()
        embase_repo = MagicMock()
        embase = EmbaseBean(uuid="uuid-1", identifier="G01", type="jet_de_gaz")
        embase_repo.get_by_uuid.return_value = embase
        etal_repo.get_latest_by_embase_voie.return_value = None

        sync_embase_mesures(etal_repo, embase_repo, "uuid-1", 2)

        etal_repo.get_latest_by_embase_voie.assert_called_once_with("uuid-1", 2)


# ============================================================================
# MUTATION-KILLING: Logger message verification
# ============================================================================


class TestSyncEmbaseMesuresLoggerMessage:
    """Kill mutant on logger message in sync_embase_mesures."""

    @pytest.mark.unit
    def test_sync_logs_mesures_synchronisees(self):
        """Verify logger.info is called with 'Mesures embase synchronisées'."""
        from unittest.mock import patch

        etal_repo = MagicMock()
        embase_repo = MagicMock()
        embase = EmbaseBean(uuid="uuid-1", identifier="G01", type="jet_de_gaz")
        embase_repo.get_by_uuid.return_value = embase
        etal_repo.get_latest_by_embase_voie.return_value = None

        with patch("app.domain.embase.services.embase_sync.logger") as mock_logger:
            sync_embase_mesures(etal_repo, embase_repo, "uuid-1", 1)
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Mesures embase synchronisées" in log_msg
