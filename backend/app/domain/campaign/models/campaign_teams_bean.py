"""Bean CampaignTeams - Équipe de campagne."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CampaignTeamsBean:
    """Bean représentant un membre d'équipe de campagne.

    Pour MOE (rôle 0) : `name` rempli, `user_uuid` None.
    Pour les autres rôles : `user_uuid` rempli, `name` None.
    L'invariant est validé par le service `campaign_teams_service`.
    """

    uuid: str = ""
    campaign_uuid: str = ""
    role_id: Optional[int] = None
    name: Optional[str] = None
    user_uuid: Optional[str] = None
