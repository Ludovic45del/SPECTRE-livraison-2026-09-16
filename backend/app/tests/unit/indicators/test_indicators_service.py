"""Tests unitaires pour le service Indicators.

Teste l'orchestration et le calcul du bottleneck sans accès DB.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.core.cache import cache

from app.domain.indicators.models.indicators_bean import (
    CampaignIndicatorsBean,
    FaIndicatorsBean,
    FsecIndicatorsBean,
    StepDurationBean,
)
from app.domain.indicators.services import indicators_service as svc
from app.domain.indicators.services.indicators_service import (
    INDICATORS_CACHE_TTL,
    current_year,
    get_indicators,
    invalidate_indicators_cache,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.get_fa_indicators.return_value = FaIndicatorsBean(total_created_in_year=10)
    repo.get_fsec_indicators.return_value = FsecIndicatorsBean(
        total_created_in_year=20, total_shot_in_year=5
    )
    repo.get_campaign_indicators.return_value = CampaignIndicatorsBean(
        total_in_period=3, total_fsec=20, total_fsec_shot=5
    )
    repo.get_step_durations.return_value = [
        StepDurationBean(
            key="assembly_to_metrology",
            label="A→M",
            count=5,
            avg_days=3.5,
            median_days=3.0,
        ),
        StepDurationBean(
            key="metrology_to_sealing",
            label="M→S",
            count=5,
            avg_days=8.2,
            median_days=8.0,
        ),
        StepDurationBean(
            key="sealing_to_pictures",
            label="S→P",
            count=0,
            avg_days=None,
        ),
    ]
    return repo


def test_returns_bean_with_provided_year(mock_repo):
    bean = get_indicators(mock_repo, year=2024)
    assert bean.year == 2024
    assert bean.campaign.total_in_period == 3
    mock_repo.get_fa_indicators.assert_called_once_with(2024, semester=None)
    mock_repo.get_fsec_indicators.assert_called_once_with(2024, semester=None)
    mock_repo.get_campaign_indicators.assert_called_once_with(
        2024, semester=None, limit=8
    )
    mock_repo.get_step_durations.assert_called_once_with(2024, semester=None)


def test_defaults_to_current_year_when_none(mock_repo):
    with patch.object(svc, "current_year", return_value=2030):
        bean = get_indicators(mock_repo, year=None)
    assert bean.year == 2030
    mock_repo.get_fa_indicators.assert_called_once_with(2030, semester=None)


def test_propagates_semester_when_valid(mock_repo):
    get_indicators(mock_repo, year=2025, semester=1)
    mock_repo.get_fa_indicators.assert_called_once_with(2025, semester=1)
    mock_repo.get_fsec_indicators.assert_called_once_with(2025, semester=1)
    mock_repo.get_campaign_indicators.assert_called_once_with(2025, semester=1, limit=8)
    mock_repo.get_step_durations.assert_called_once_with(2025, semester=1)


def test_invalid_semester_falls_back_to_none(mock_repo):
    get_indicators(mock_repo, year=2025, semester=42)
    mock_repo.get_fa_indicators.assert_called_once_with(2025, semester=None)


def test_semester_is_part_of_cache_key(mock_repo):
    # S1 et S2 doivent être isolés en cache (pas de pollution croisée).
    get_indicators(mock_repo, year=2025, semester=1)
    get_indicators(mock_repo, year=2025, semester=2)
    get_indicators(mock_repo, year=2025, semester=1)  # devrait être en cache
    assert mock_repo.get_fa_indicators.call_count == 2


def test_bottleneck_is_transition_with_max_avg(mock_repo):
    bean = get_indicators(mock_repo, year=2025)
    # avg_days: 3.5 vs 8.2 vs None → 8.2 wins
    assert bean.bottleneck_step_key == "metrology_to_sealing"


def test_bottleneck_is_none_when_all_avgs_null(mock_repo):
    mock_repo.get_step_durations.return_value = [
        StepDurationBean(key="k1", label="l1", count=0, avg_days=None),
        StepDurationBean(key="k2", label="l2", count=0, avg_days=None),
    ]
    bean = get_indicators(mock_repo, year=2025)
    assert bean.bottleneck_step_key is None


def test_result_is_cached_per_year(mock_repo):
    get_indicators(mock_repo, year=2024)
    get_indicators(mock_repo, year=2024)
    # Le second appel doit être servi depuis le cache.
    mock_repo.get_fa_indicators.assert_called_once()
    mock_repo.get_fsec_indicators.assert_called_once()


def test_different_years_have_independent_cache(mock_repo):
    get_indicators(mock_repo, year=2024)
    get_indicators(mock_repo, year=2025)
    assert mock_repo.get_fa_indicators.call_count == 2


def test_invalidate_cache_clears_neighbouring_years(mock_repo):
    with patch.object(svc, "current_year", return_value=2026):
        get_indicators(mock_repo, year=2026)
        invalidate_indicators_cache()
        get_indicators(mock_repo, year=2026)
    assert mock_repo.get_fa_indicators.call_count == 2


def test_cache_ttl_constant_is_short_enough_to_be_safe():
    # 60s : conservé volontairement bas pour limiter les valeurs périmées.
    assert INDICATORS_CACHE_TTL <= 120


def test_current_year_returns_int():
    assert isinstance(current_year(), int)
