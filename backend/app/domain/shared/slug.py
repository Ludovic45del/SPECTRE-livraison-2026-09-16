"""Util slug - Génération de slugs lisibles pour les URLs.

Les slugs sont **calculés** (jamais stockés en base) à partir des champs
existants des entités. La source de vérité est le backend : le frontend ne fait
que consommer le `slug` exposé par l'API (cf. labels d'installation dupliqués
côté front, qui divergeraient sinon).
"""

from typing import Optional

from django.utils.text import slugify

# Valeur de repli quand l'installation est inconnue (installation_id null).
_NO_INSTALLATION = "sans-installation"


def extract_leading_year(slug: Optional[str]) -> Optional[int]:
    """Extrait l'année en tête de slug (``2024-...``), ou None si absente.

    Sert à restreindre la résolution slug → entité aux candidats de l'année,
    le slug n'étant pas stocké en base.
    """
    if not slug:
        return None
    head = slug.split("-", 1)[0]
    return int(head) if head.isdigit() else None


def slugify_text(value: Optional[str]) -> str:
    """Slugifie une chaîne : minuscules, accents translittérés, tirets.

    Retourne "" pour une entrée vide ou None.
    """
    if not value:
        return ""
    return slugify(value, allow_unicode=False)


def build_campaign_slug(
    year: Optional[int],
    semester: Optional[str],
    installation_label: Optional[str],
    name: Optional[str],
) -> str:
    """Slug campagne : ``<année>-<semestre>-<installation>-<nom>`` slugifié.

    Le semestre est inclus car la contrainte d'unicité porte sur
    ``(name, year, semester)`` : deux campagnes homonymes de la même année
    peuvent ne différer que par le semestre. Sans lui, la résolution
    slug → entité serait ambiguë.

    ``installation_label`` absent → ``sans-installation``.
    """
    parts = [
        str(year) if year else "",
        semester or "",
        installation_label or _NO_INSTALLATION,
        name or "",
    ]
    return slugify_text("-".join(part for part in parts if part))


def build_fsec_slug(
    year: Optional[int],
    semester: Optional[str],
    installation_label: Optional[str],
    campaign_name: Optional[str],
    fsec_name: Optional[str],
) -> str:
    """Slug FSEC : slug de la campagne parente + nom du FSEC.

    Le nom de FSEC n'est unique que ``(campaign_id, name)`` ; on le préfixe donc
    par le slug campagne pour garantir l'unicité globale.
    """
    campaign_part = build_campaign_slug(
        year, semester, installation_label, campaign_name
    )
    return slugify_text(f"{campaign_part}-{fsec_name or ''}")
