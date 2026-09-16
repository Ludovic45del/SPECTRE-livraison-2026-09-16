"""
Tests unitaires pour le service Dashboard.

Teste la logique metier pure sans acces DB.
Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from django.core.cache import cache

from app.domain.dashboard.models.dashboard_bean import (
    CountsByStatusBean,
    DashboardCountsBean,
    FaCountsBean,
    RecentActivityItemBean,
)
from app.domain.dashboard.services import dashboard_service as svc
from app.domain.dashboard.services.dashboard_service import (
    RECENT_ACTIVITY_LIMIT,
    get_dashboard_counts,
    get_dashboard_data,
    get_recent_activity,
)

BASE_DATE = datetime(2026, 3, 20, 10, 0, 0)


@pytest.fixture(autouse=True)
def _clear_dashboard_cache():
    """Le service `get_dashboard_data` met en cache son résultat ; on remet à zéro
    avant chaque test pour garantir l'isolation entre cas (sinon les assertions
    `assert_called_once` deviennent flaky selon l'ordre d'exécution).
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def mock_dashboard_repository():
    """Mock du repository Dashboard."""
    return MagicMock()


@pytest.fixture
def sample_counts():
    """Compteurs de test."""
    return DashboardCountsBean(
        campaigns=CountsByStatusBean(total=5, by_status={"0": 2, "1": 1, "2": 2}),
        fsecs=CountsByStatusBean(total=12, by_status={"1": 5, "5": 7}),
        fas=FaCountsBean(
            total=8,
            by_status={"0": 3, "1": 2, "2": 3},
            by_criticality={"1": 5, "2": 3},
        ),
    )


@pytest.fixture
def sample_activity_items():
    """Elements d'activite recente pour les tests."""
    return [
        RecentActivityItemBean(
            id="aaa-111",
            type="campaign",
            name="Campagne Alpha",
            status_id=2,
            last_updated=BASE_DATE.isoformat(),
        ),
        RecentActivityItemBean(
            id="bbb-222",
            type="fsec",
            name="FSEC-001",
            status_id=1,
            last_updated=(BASE_DATE + timedelta(days=1)).isoformat(),
            campaign_name="Campagne Alpha",
        ),
        RecentActivityItemBean(
            id="ccc-333",
            type="fa",
            name="FA-001",
            status_id=0,
            last_updated=(BASE_DATE - timedelta(days=1)).isoformat(),
            type_id=1,
            criticality_id=2,
        ),
    ]


# ============================================================================
# Module-level attributes
# ============================================================================


@pytest.mark.unit
class TestModuleLevelAttributes:

    def test_logger_exists(self):
        assert svc.logger is not None
        assert isinstance(svc.logger, logging.Logger)

    def test_recent_activity_limit_value(self):
        assert RECENT_ACTIVITY_LIMIT == 10


# ============================================================================
# get_dashboard_counts
# ============================================================================


@pytest.mark.unit
class TestGetDashboardCounts:

    def test_returns_counts_from_repository(
        self, mock_dashboard_repository, sample_counts
    ):
        mock_dashboard_repository.get_counts.return_value = sample_counts

        result = get_dashboard_counts(mock_dashboard_repository)

        assert result is sample_counts
        mock_dashboard_repository.get_counts.assert_called_once()

    def test_returns_empty_counts(self, mock_dashboard_repository):
        empty = DashboardCountsBean()
        mock_dashboard_repository.get_counts.return_value = empty

        result = get_dashboard_counts(mock_dashboard_repository)

        assert result.campaigns.total == 0
        assert result.fsecs.total == 0
        assert result.fas.total == 0

    def test_returns_counts_with_values(self, mock_dashboard_repository, sample_counts):
        mock_dashboard_repository.get_counts.return_value = sample_counts

        result = get_dashboard_counts(mock_dashboard_repository)

        assert result.campaigns.total == 5
        assert result.fsecs.total == 12
        assert result.fas.total == 8
        assert result.campaigns.by_status == {"0": 2, "1": 1, "2": 2}
        assert result.fas.by_criticality == {"1": 5, "2": 3}


# ============================================================================
# get_recent_activity
# ============================================================================


@pytest.mark.unit
class TestGetRecentActivity:

    def test_returns_sorted_items_by_date_desc(
        self, mock_dashboard_repository, sample_activity_items
    ):
        mock_dashboard_repository.get_recent_activity.return_value = (
            sample_activity_items
        )

        result = get_recent_activity(mock_dashboard_repository, limit=10)

        assert len(result) == 3
        # Most recent first: bbb (2026-03-21) > aaa (2026-03-20) > ccc (2026-03-19)
        assert result[0].id == "bbb-222"
        assert result[1].id == "aaa-111"
        assert result[2].id == "ccc-333"

    def test_limits_results_to_limit(self, mock_dashboard_repository):
        items = [
            RecentActivityItemBean(
                id=f"item-{i}",
                type="campaign",
                name=f"Camp {i}",
                last_updated=(BASE_DATE - timedelta(days=i)).isoformat(),
            )
            for i in range(20)
        ]
        mock_dashboard_repository.get_recent_activity.return_value = items

        result = get_recent_activity(mock_dashboard_repository, limit=5)

        assert len(result) == 5

    def test_limits_results_preserves_most_recent(self, mock_dashboard_repository):
        """After sorting, the limit should keep the most recent items."""
        items = [
            RecentActivityItemBean(
                id=f"item-{i}",
                type="campaign",
                name=f"Camp {i}",
                last_updated=(BASE_DATE - timedelta(days=i)).isoformat(),
            )
            for i in range(20)
        ]
        mock_dashboard_repository.get_recent_activity.return_value = items

        result = get_recent_activity(mock_dashboard_repository, limit=3)

        assert result[0].id == "item-0"  # most recent
        assert result[1].id == "item-1"
        assert result[2].id == "item-2"

    def test_handles_empty_list(self, mock_dashboard_repository):
        mock_dashboard_repository.get_recent_activity.return_value = []

        result = get_recent_activity(mock_dashboard_repository)

        assert result == []

    def test_default_limit(self, mock_dashboard_repository):
        mock_dashboard_repository.get_recent_activity.return_value = []

        get_recent_activity(mock_dashboard_repository)

        mock_dashboard_repository.get_recent_activity.assert_called_once_with(
            limit=RECENT_ACTIVITY_LIMIT
        )

    def test_handles_null_dates(self, mock_dashboard_repository):
        items = [
            RecentActivityItemBean(
                id="a", type="campaign", name="A", last_updated=None
            ),
            RecentActivityItemBean(
                id="b", type="fa", name="B", last_updated="2026-03-20T10:00:00"
            ),
        ]
        mock_dashboard_repository.get_recent_activity.return_value = items

        result = get_recent_activity(mock_dashboard_repository)

        assert result[0].id == "b"  # Non-null date sorts first
        assert result[1].id == "a"

    def test_sorting_is_reverse_chronological(self, mock_dashboard_repository):
        """Explicitly verify sort key lambda uses last_updated in reverse."""
        items = [
            RecentActivityItemBean(
                id="old",
                type="campaign",
                name="Old",
                last_updated="2020-01-01T00:00:00",
            ),
            RecentActivityItemBean(
                id="new", type="fsec", name="New", last_updated="2026-12-31T23:59:59"
            ),
            RecentActivityItemBean(
                id="mid", type="fa", name="Mid", last_updated="2023-06-15T12:00:00"
            ),
        ]
        mock_dashboard_repository.get_recent_activity.return_value = items

        result = get_recent_activity(mock_dashboard_repository, limit=10)

        assert result[0].id == "new"
        assert result[1].id == "mid"
        assert result[2].id == "old"

    def test_passes_limit_to_repository(self, mock_dashboard_repository):
        mock_dashboard_repository.get_recent_activity.return_value = []

        get_recent_activity(mock_dashboard_repository, limit=7)

        mock_dashboard_repository.get_recent_activity.assert_called_once_with(limit=7)


# ============================================================================
# get_dashboard_data
# ============================================================================


@pytest.mark.unit
class TestGetDashboardData:

    def test_returns_tuple_of_counts_and_activity(
        self, mock_dashboard_repository, sample_counts, sample_activity_items
    ):
        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.return_value = (
            sample_activity_items
        )

        counts, activity = get_dashboard_data(mock_dashboard_repository)

        assert counts is sample_counts
        assert len(activity) == 3
        mock_dashboard_repository.get_counts.assert_called_once()
        mock_dashboard_repository.get_recent_activity.assert_called_once_with(
            limit=RECENT_ACTIVITY_LIMIT
        )

    def test_uses_default_limit(self, mock_dashboard_repository, sample_counts):
        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.return_value = []

        get_dashboard_data(mock_dashboard_repository)

        mock_dashboard_repository.get_recent_activity.assert_called_once_with(
            limit=RECENT_ACTIVITY_LIMIT
        )

    def test_uses_custom_limit(self, mock_dashboard_repository, sample_counts):
        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.return_value = []

        get_dashboard_data(mock_dashboard_repository, limit=5)

        mock_dashboard_repository.get_recent_activity.assert_called_once_with(limit=5)

    def test_returns_sorted_activity(
        self, mock_dashboard_repository, sample_counts, sample_activity_items
    ):
        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.return_value = (
            sample_activity_items
        )

        _, activity = get_dashboard_data(mock_dashboard_repository)

        # bbb is most recent
        assert activity[0].id == "bbb-222"


# ============================================================================
# Cas d'erreur
# ============================================================================


@pytest.mark.unit
class TestDashboardServiceErrors:

    def test_get_counts_propagates_repository_exception(
        self, mock_dashboard_repository
    ):
        mock_dashboard_repository.get_counts.side_effect = Exception("DB error")

        with pytest.raises(Exception, match="DB error"):
            get_dashboard_counts(mock_dashboard_repository)

    def test_get_recent_activity_propagates_repository_exception(
        self, mock_dashboard_repository
    ):
        mock_dashboard_repository.get_recent_activity.side_effect = Exception(
            "DB error"
        )

        with pytest.raises(Exception, match="DB error"):
            get_recent_activity(mock_dashboard_repository)

    def test_get_dashboard_data_propagates_counts_exception(
        self, mock_dashboard_repository
    ):
        mock_dashboard_repository.get_counts.side_effect = Exception("Counts error")

        with pytest.raises(Exception, match="Counts error"):
            get_dashboard_data(mock_dashboard_repository)

    def test_get_dashboard_data_propagates_activity_exception(
        self, mock_dashboard_repository, sample_counts
    ):
        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.side_effect = Exception(
            "Activity error"
        )

        with pytest.raises(Exception, match="Activity error"):
            get_dashboard_data(mock_dashboard_repository)


# ============================================================================
# MUTATION-KILLING: Logger message verification
# ============================================================================


@pytest.mark.unit
class TestDashboardServiceLoggerMessages:
    """Kill mutant on logger message in get_dashboard_data."""

    def test_get_dashboard_data_logs_message(
        self, mock_dashboard_repository, sample_counts
    ):
        """Verify logger.debug is called with 'Recuperation des donnees'."""
        from unittest.mock import patch

        mock_dashboard_repository.get_counts.return_value = sample_counts
        mock_dashboard_repository.get_recent_activity.return_value = []

        with patch(
            "app.domain.dashboard.services.dashboard_service.logger"
        ) as mock_logger:
            get_dashboard_data(mock_dashboard_repository)
            mock_logger.debug.assert_called()
            log_msg = mock_logger.debug.call_args[0][0]
            assert "Recuperation des donnees" in log_msg
