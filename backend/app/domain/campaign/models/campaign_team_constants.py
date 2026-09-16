"""Constantes liees aux roles d'equipe de campagne.

Synchronise avec le seed `app/migrations/0002_seed_campaign_roles.py` :
MOE=0, RCE=1, IEC=2.

Le rôle MOE represente un membre exterieur au labo : son nom est saisi en
texte libre, sans rapprochement vers la table users (decision metier).
"""

CAMPAIGN_ROLE_MOE_ID = 0
CAMPAIGN_ROLE_RCE_ID = 1
CAMPAIGN_ROLE_IEC_ID = 2

# Rôles autorisés à etre saisis en texte libre (membres exterieurs).
CAMPAIGN_FREE_TEXT_ROLE_IDS = frozenset({CAMPAIGN_ROLE_MOE_ID})


def is_free_text_role(role_id) -> bool:
    """True si role autorise le texte libre (membre exterieur au labo)."""
    return role_id in CAMPAIGN_FREE_TEXT_ROLE_IDS
