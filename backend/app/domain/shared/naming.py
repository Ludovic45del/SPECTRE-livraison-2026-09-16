"""Util naming - Noms complets (affichage) des campagnes et des FSEC.

Convention métier :

- campagne : ``{année}-{installation}_{nom}`` (ex. ``2026-LMJ_gorfou``) ;
- FSEC : ``{nom complet campagne}_{nom FSEC}`` (ex. ``2026-LMJ_gorfou_2``).

Ces noms sont **calculés** (jamais stockés) : le nom court de la FSEC reste la
donnée persistée (unicité ``(campaign_id, name)``, identifiants FA, lien
déclaratif ``fsec_name`` du stock). Le backend est la source de vérité : le
frontend consomme le ``display_name`` exposé par l'API sans le recomposer.
"""

from typing import Optional

# Valeur de repli quand l'installation de la campagne est inconnue.
UNKNOWN_INSTALLATION_LABEL = "UNK"


def build_campaign_display_name(
    year: Optional[int],
    installation_label: Optional[str],
    name: Optional[str],
) -> str:
    """Nom complet d'une campagne : ``{année}-{installation}_{nom}``."""
    label = installation_label or UNKNOWN_INSTALLATION_LABEL
    return f"{year or ''}-{label}_{name or ''}"


def build_fsec_display_name(
    year: Optional[int],
    installation_label: Optional[str],
    campaign_name: Optional[str],
    fsec_name: Optional[str],
) -> str:
    """Nom complet d'une FSEC : ``{nom complet campagne}_{nom FSEC}``.

    Si le nom court commence déjà par le préfixe campagne (FSEC historiques
    nommées avec le nom complet de la cible, cf. R13), il est renvoyé tel quel
    pour ne pas dupliquer le préfixe.
    """
    short_name = fsec_name or ""
    prefix = build_campaign_display_name(year, installation_label, campaign_name)
    if short_name.startswith(prefix):
        return short_name
    return f"{prefix}_{short_name}"
