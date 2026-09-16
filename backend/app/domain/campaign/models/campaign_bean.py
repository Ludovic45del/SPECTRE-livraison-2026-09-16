"""Bean Campaign - Campagne principale."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class CampaignBean:
    """Bean représentant une campagne."""

    uuid: str = ""
    type_id: Optional[int] = None
    status_id: Optional[int] = None
    installation_id: Optional[int] = None
    # Label de l'installation (dérivé du référentiel), nécessaire au calcul du
    # slug d'URL. Non persisté : renseigné en lecture par le mapper entity→bean.
    installation_label: Optional[str] = None
    name: str = ""
    year: int = 0
    semester: str = ""
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    dtri_number: Optional[int] = None
    description: Optional[str] = None
