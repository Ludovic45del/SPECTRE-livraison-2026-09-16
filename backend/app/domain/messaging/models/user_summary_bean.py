"""Bean UserSummary — projection annuaire d'un profil utilisateur."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UserSummaryBean:
    """Résumé public d'un utilisateur (membre ou auteur d'un message)."""

    uuid: str = ""
    username: str = ""
    first_name: str = ""
    last_name: str = ""
    avatar_url: Optional[str] = None
    is_active: bool = True
