"""
Utilitaires partagés pour les mappers.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Union


def format_date_for_api(value: date | datetime | str | None) -> str | None:
    """Formate une date en string ISO pour l'API.

    Gère les objets date, datetime, et les strings déjà formatées.

    Args:
        value: La date à formater (date, datetime, str, ou None)

    Returns:
        La date au format ISO string ou None
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return value.isoformat()


def parse_date_string(value: Optional[Union[str, date]]) -> Optional[date]:
    """
    Parse une date depuis une chaîne ISO ou retourne l'objet date tel quel.
    Gère les formats 'YYYY-MM-DD' et 'YYYY-MM-DDTHH:MM:SS'.
    """
    if value is None:
        return None

    # Si c'est déjà un objet date (mais pas datetime car datetime hérite de date)
    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    # Si c'est un datetime, on extrait la date
    if isinstance(value, datetime):
        return value.date()

    # Si c'est une string, on tente le parsing
    if isinstance(value, str):
        try:
            # fromisoformat gère le format YYYY-MM-DD et T...
            # On remplace Z par +00:00 pour la compatibilité
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None

    return None


def decimal_to_float(val: Decimal | None) -> float | None:
    """Convertit un Decimal en float pour la sérialisation JSON.

    Args:
        val: Valeur Decimal ou None

    Returns:
        La valeur en float ou None
    """
    if val is None:
        return None
    return float(val)
