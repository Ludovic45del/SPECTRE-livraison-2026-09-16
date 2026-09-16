"""Service Indicators - Logique métier pure (orchestration + cache court)."""

import logging
from datetime import datetime, timezone
from typing import Optional

from django.core.cache import cache

from app.domain.indicators.interface.indicators_repository import IIndicatorsRepository
from app.domain.indicators.models.indicators_bean import IndicatorsBean

logger = logging.getLogger(__name__)

# Les agrégations Indicators font 10+ requêtes SQL. Un cache court (60 s) absorbe
# les rafraîchissements navigateur sans périmer les valeurs au-delà du raisonnable.
INDICATORS_CACHE_TTL = 60
_INDICATORS_CACHE_KEY = "indicators:data:v1"

_CAMPAIGN_TOP_LIMIT = 8

# Valeurs autorisées pour `semester` côté domaine. None = année entière.
_VALID_SEMESTERS = (None, 1, 2)


def _cache_key(year: int, semester: Optional[int]) -> str:
    suffix = "all" if semester is None else f"s{semester}"
    return f"{_INDICATORS_CACHE_KEY}:{year}:{suffix}"


def current_year() -> int:
    """Année courante (extrait pour faciliter le mock en test)."""
    return datetime.now(timezone.utc).year


def get_indicators(
    repository: IIndicatorsRepository,
    year: Optional[int] = None,
    semester: Optional[int] = None,
) -> IndicatorsBean:
    """Récupère le bundle complet des indicateurs pour une période donnée.

    - `year` : défaut = année courante.
    - `semester` : 1 (janv→juin), 2 (juil→déc) ou None (toute l'année).
      Toute autre valeur est silencieusement ramenée à None.

    Le résultat est mis en cache 60 s par couple (year, semester).
    """
    target_year = year if year is not None else current_year()
    target_semester = semester if semester in _VALID_SEMESTERS else None
    cache_key = _cache_key(target_year, target_semester)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    logger.debug(
        "Récupération des indicateurs (year=%d, semester=%s)",
        target_year,
        target_semester,
    )

    fa = repository.get_fa_indicators(target_year, semester=target_semester)
    fsec = repository.get_fsec_indicators(target_year, semester=target_semester)
    campaign = repository.get_campaign_indicators(
        target_year, semester=target_semester, limit=_CAMPAIGN_TOP_LIMIT
    )
    step_durations = repository.get_step_durations(
        target_year, semester=target_semester
    )

    # Goulot d'étranglement : transition avec la moyenne (avg_days) la plus longue.
    bottleneck_key = None
    bottleneck_value = -1.0
    for sd in step_durations:
        if sd.avg_days is not None and sd.avg_days > bottleneck_value:
            bottleneck_value = sd.avg_days
            bottleneck_key = sd.key

    bean = IndicatorsBean(
        year=target_year,
        fa=fa,
        fsec=fsec,
        campaign=campaign,
        step_durations=step_durations,
        bottleneck_step_key=bottleneck_key,
    )
    cache.set(cache_key, bean, timeout=INDICATORS_CACHE_TTL)
    return bean


def invalidate_indicators_cache() -> None:
    """À appeler après une mutation susceptible d'affecter les indicateurs."""
    current = current_year()
    for offset in range(-5, 2):
        year = current + offset
        for sem in _VALID_SEMESTERS:
            cache.delete(_cache_key(year, sem))
