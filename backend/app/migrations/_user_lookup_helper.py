"""Helper de matching texte libre -> UserProfile pour les data migrations.

Utilise dans les RunPython qui backfillent les FK *_user a partir des
CharField legacy (operator, metrologist_name, discoverer, name...).

Strategie :
1. Normalise (strip, lower, espaces multiples).
2. Match exact sur username (case-insensitive).
3. Match exact sur "first_name last_name".
4. Match initiale + nom (style "J. Dupont", "j-m petit").
5. Renvoie None si aucun match certain (ou si plusieurs candidats).

Ne leve jamais : la FK reste NULL et l'admin corrigera via l'UI.
"""

import logging
import re

logger = logging.getLogger(__name__)

_WHITESPACE_RE = re.compile(r"\s+")
_INITIAL_RE = re.compile(r"^([a-zA-Z])[\.\-]?\s+(.+)$")


def _normalize(value: str) -> str:
    """Trim, lowercase, espaces multiples -> 1 espace."""
    return _WHITESPACE_RE.sub(" ", value.strip().lower())


def _profile_uuid_for_user(UserProfile, user_id):
    """Retourne l'uuid du profil associe a un user_id (ou None)."""
    profile = UserProfile.objects.filter(user_id=user_id).first()
    return profile.uuid if profile else None


def match_user_profile(apps, raw_name):
    """Cherche un UserProfile correspondant au texte legacy.

    Args:
        apps: registre de modeles fourni par RunPython (apps.get_model).
        raw_name: texte saisi (peut etre None, vide, partiel).

    Returns:
        L'uuid du UserProfileEntity matche, ou None.
    """
    if not raw_name or not raw_name.strip():
        return None

    UserProfile = apps.get_model("app", "UserProfileEntity")
    User = apps.get_model("auth", "User")

    needle = _normalize(raw_name)

    # 1) Match username (insensitive).
    user = User.objects.filter(username__iexact=needle).first()
    if user:
        uuid = _profile_uuid_for_user(UserProfile, user.id)
        if uuid:
            return uuid

    # 2) Match "first last" complet. Volume <100 users, operation ponctuelle :
    #    parcours en memoire, pas besoin d'index full-text.
    matched = [
        u
        for u in User.objects.all()
        if _normalize(f"{u.first_name} {u.last_name}") == needle
    ]
    if len(matched) == 1:
        uuid = _profile_uuid_for_user(UserProfile, matched[0].id)
        if uuid:
            return uuid
    if len(matched) > 1:
        logger.warning(
            "match_user_profile: ambiguite full name pour '%s' - laisse NULL",
            raw_name,
        )
        return None

    # 3) Match initiale + nom : "J. Dupont", "J-M Petit", "j dupont".
    m = _INITIAL_RE.match(needle)
    if m:
        initial, last = m.group(1).lower(), _normalize(m.group(2))
        partial = [
            u
            for u in User.objects.all()
            if u.first_name
            and u.last_name
            and u.first_name.lower().startswith(initial)
            and _normalize(u.last_name) == last
        ]
        if len(partial) == 1:
            uuid = _profile_uuid_for_user(UserProfile, partial[0].id)
            if uuid:
                return uuid
        if len(partial) > 1:
            logger.warning(
                "match_user_profile: ambiguite initiale+nom pour '%s' - laisse NULL",
                raw_name,
            )

    return None
