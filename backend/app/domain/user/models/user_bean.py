"""
Bean utilisateur — DTO pour la couche domaine.

Definit les roles metier SPECTRE et le mapping vers les groupes de permission Django.

Un membre peut cumuler PLUSIEURS roles metier (ex. metrologue + assembleur).
`UserBean.roles` est la source de verite ; les helpers de ce module en derivent
le role principal (affichage, tri) et le groupe de permission effectif.
"""

import uuid as uuid_lib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, Optional

# --------------------------------------------------------------------------- #
#  Roles metier SPECTRE
# --------------------------------------------------------------------------- #
ROLE_CHEF_LABO = "chef_labo"
ROLE_IEC = "iec"
ROLE_RCE = "rce"
ROLE_STAGIAIRE = "stagiaire"
ROLE_ALTERNANT = "alternant"
ROLE_ASSEMBLEUR = "assembleur"
ROLE_METROLOGUE = "metrologue"
ROLE_CRYOGENIE = "cryogenie"

# L'ORDRE de cette liste fait foi : il definit la hierarchie d'affichage et
# designe le « role principal » d'un membre multi-roles (le premier trouve).
# Le frontend reprend le meme ordre (cf. SPECTRE_ROLES dans user.schema.ts).
ALL_SPECTRE_ROLES = [
    ROLE_CHEF_LABO,
    ROLE_IEC,
    ROLE_RCE,
    ROLE_ASSEMBLEUR,
    ROLE_METROLOGUE,
    ROLE_CRYOGENIE,
    ROLE_STAGIAIRE,
    ROLE_ALTERNANT,
]

_ROLE_RANK = {role: index for index, role in enumerate(ALL_SPECTRE_ROLES)}

# --------------------------------------------------------------------------- #
#  Mapping role metier → groupe de permission Django
# --------------------------------------------------------------------------- #
ROLE_TO_PERMISSION_GROUP: dict[str, str] = {
    ROLE_CHEF_LABO: "admin",
    ROLE_IEC: "operateur",
    ROLE_RCE: "operateur",
    ROLE_ASSEMBLEUR: "operateur",
    ROLE_METROLOGUE: "operateur",
    ROLE_CRYOGENIE: "operateur",
    ROLE_STAGIAIRE: "lecteur",
    ROLE_ALTERNANT: "lecteur",
}

# Du plus privilegie au moins privilegie. Un membre multi-roles herite du
# groupe le PLUS permissif de ses roles (chef_labo + stagiaire -> admin).
PERMISSION_GROUPS_BY_PRIVILEGE = ["admin", "operateur", "lecteur"]


def sort_roles(roles: Optional[Iterable[str]]) -> list[str]:
    """Dedoublonne et ordonne des roles selon la hierarchie ALL_SPECTRE_ROLES.

    Les roles inconnus sont conserves (la validation metier est faite en amont
    par le service) et rejetes en fin de liste, par ordre alphabetique.
    """
    if not roles:
        return []
    unique = set(roles)
    return sorted(
        unique,
        key=lambda role: (_ROLE_RANK.get(role, len(_ROLE_RANK)), role),
    )


def primary_role(roles: Optional[Iterable[str]]) -> Optional[str]:
    """Role principal : le plus haut dans la hierarchie. None si aucun role."""
    ordered = sort_roles(roles)
    return ordered[0] if ordered else None


def permission_group_for_roles(roles: Optional[Iterable[str]]) -> Optional[str]:
    """Groupe de permission effectif : le plus permissif des roles portes."""
    groups = {
        ROLE_TO_PERMISSION_GROUP[role]
        for role in (roles or [])
        if role in ROLE_TO_PERMISSION_GROUP
    }
    for group in PERMISSION_GROUPS_BY_PRIVILEGE:
        if group in groups:
            return group
    return None


@dataclass
class UserBean:
    """DTO utilisateur pour la couche domaine."""

    uuid: Optional[uuid_lib.UUID] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    # Roles metier cumulables, ordonnes par hierarchie (roles[0] = principal).
    roles: list[str] = field(default_factory=list)
    permission_group: Optional[str] = None
    laboratoire: Optional[str] = None
    service: Optional[str] = None
    numero: Optional[str] = None
    bureau: Optional[str] = None
    avatar_url: Optional[str] = None
    signature_url: Optional[str] = None
    is_active: Optional[bool] = True
    force_password_change: Optional[bool] = True
    dashboard_preferences: Optional[dict] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def role(self) -> Optional[str]:
        """Role principal — raccourci lecture seule pour l'affichage et le tri."""
        return primary_role(self.roles)

    def has_role(self, *candidates: str) -> bool:
        """True si le membre porte au moins un des roles demandes."""
        return any(role in self.roles for role in candidates)
