"""Service Dashboard - Logique métier pure."""

import logging
from typing import List, Tuple

from django.core.cache import cache

from app.domain.dashboard.interface.dashboard_repository import IDashboardRepository
from app.domain.dashboard.models.dashboard_bean import (
    DashboardCountsBean,
    RecentActivityItemBean,
)

logger = logging.getLogger(__name__)

RECENT_ACTIVITY_LIMIT = 10

# Le dashboard fait 8 requêtes SQL par GET (3 counts + 5 listes récentes).
# Un cache court (TTL 30 s) absorbe les rafraîchissements navigateur sans périmer
# les compteurs au-delà du raisonnable. Invalidation explicite via
# `invalidate_dashboard_cache()` après une mutation FA / FSEC / Campaign / Embase.
DASHBOARD_CACHE_TTL = 30
_DASHBOARD_CACHE_KEY = "dashboard:data:v1"


def _cache_key(limit: int) -> str:
    return f"{_DASHBOARD_CACHE_KEY}:{limit}"


def get_dashboard_data(
    repository: IDashboardRepository,
    limit: int = RECENT_ACTIVITY_LIMIT,
) -> Tuple[DashboardCountsBean, List[RecentActivityItemBean]]:
    """Récupère les données complètes du dashboard (compteurs + activité récente)."""
    cache_key = _cache_key(limit)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    logger.debug("Recuperation des donnees dashboard (limit=%d)", limit)
    counts = get_dashboard_counts(repository)
    recent_activity = get_recent_activity(repository, limit=limit)
    result = (counts, recent_activity)
    cache.set(cache_key, result, timeout=DASHBOARD_CACHE_TTL)
    return result


def invalidate_dashboard_cache() -> None:
    """À appeler après une mutation susceptible d'affecter le dashboard."""
    # delete_pattern n'existe que pour Redis ; on flush les variantes connues.
    for limit in (10, *range(1, 51)):
        cache.delete(_cache_key(limit))


def get_dashboard_counts(repository: IDashboardRepository) -> DashboardCountsBean:
    """Récupère les compteurs agrégés du dashboard."""
    return repository.get_counts()


def get_recent_activity(
    repository: IDashboardRepository, limit: int = RECENT_ACTIVITY_LIMIT
) -> List[RecentActivityItemBean]:
    """Récupère l'activité récente, triée par date décroissante."""
    items = repository.get_recent_activity(limit=limit)

    # Tri global par date décroissante, prendre les N plus récents
    items.sort(key=lambda x: x.last_updated or "", reverse=True)
    return items[:limit]
