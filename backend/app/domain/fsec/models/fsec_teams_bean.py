"""Bean FsecTeams - Équipe FSEC."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FsecTeamsBean:
    """Bean représentant un membre d'équipe FSEC.

    Pour MOE/TCI (rôles 1 et 6) : `name` rempli, `user_uuid` None.
    Pour les autres rôles : `user_uuid` rempli, `name` None.
    L'invariant est validé par le service `fsec_teams_service`.
    """

    uuid: str = ""
    fsec_id: str = ""  # Référence vers version_uuid du FSEC
    role_id: Optional[int] = None
    name: Optional[str] = None
    user_uuid: Optional[str] = None
