"""Bean LabContact — contact de l'annuaire des laboratoires."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class LabContactBean:
    """Bean représentant un contact de l'annuaire des laboratoires.

    `name` est le seul champ obligatoire ; `phone` est un texte libre (poste
    interne, numéro complet…) et `comment` une note optionnelle.
    """

    uuid: str = ""
    name: str = ""
    phone: str = ""
    comment: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
