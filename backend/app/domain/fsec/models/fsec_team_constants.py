"""Constantes liees aux roles d'equipe FSEC.

Synchronise avec le seed `app/data/fsec/fsec_roles.csv` :
RCE=0, MOE=1, IEC=2, ASSEMBLEUR=3, METROLOGUE=4, OPERATEUR_PHOTOS=5, TCI=6.

MOE et TCI representent des intervenants exterieurs au labo (decision metier) :
leur nom est saisi en texte libre, sans rapprochement vers la table users.
"""

FSEC_ROLE_RCE_ID = 0
FSEC_ROLE_MOE_ID = 1
FSEC_ROLE_IEC_ID = 2
FSEC_ROLE_ASSEMBLEUR_ID = 3
FSEC_ROLE_METROLOGUE_ID = 4
FSEC_ROLE_OPERATEUR_PHOTOS_ID = 5
FSEC_ROLE_TCI_ID = 6

# Rôles autorisés à etre saisis en texte libre (membres exterieurs au labo).
FSEC_FREE_TEXT_ROLE_IDS = frozenset({FSEC_ROLE_MOE_ID, FSEC_ROLE_TCI_ID})


def is_free_text_role(role_id) -> bool:
    """True si role autorise le texte libre (membre exterieur au labo)."""
    return role_id in FSEC_FREE_TEXT_ROLE_IDS
