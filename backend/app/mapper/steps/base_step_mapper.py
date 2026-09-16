"""Mapper BaseStep - Fonctions utilitaires pour les mappers de steps.

Ce module fournit des fonctions utilitaires de parsing de dates et de
conversion FK <-> uuid pour les mappers de steps.
"""

from datetime import date, datetime
from typing import Any, Optional


def read_operator_user_uuid(entity) -> Optional[str]:
    """Lit l'uuid de l'operator_user FK depuis l'entité (ou None).

    La FK utilise to_field='uuid' donc `entity.operator_user_id` contient
    directement l'uuid (et non l'id auto Django). On centralise cette
    extraction pour les 7+ mappers steps qui héritent d'operator.
    """
    raw = getattr(entity, "operator_user_id", None)
    return str(raw) if raw else None


def normalize_user_uuid(value) -> Optional[str]:
    """Normalise une valeur d'uuid (utilisée pour api_to_bean)."""
    return str(value) if value else None


def parse_date_from_api(value: Any) -> date | None:
    """Parse une date depuis une chaîne ISO envoyée par l'API.

    Args:
        value: La valeur à parser (str, date, ou None)

    Returns:
        Un objet date ou None
    """
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        return date.fromisoformat(value)
    return None


def parse_datetime_from_api(value: Any) -> datetime | None:
    """Parse une datetime depuis une chaîne ISO envoyée par l'API.

    Gère le format ISO 8601 avec timezone 'Z' (UTC).

    Args:
        value: La valeur à parser (str, datetime, ou None)

    Returns:
        Un objet datetime ou None
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return None
