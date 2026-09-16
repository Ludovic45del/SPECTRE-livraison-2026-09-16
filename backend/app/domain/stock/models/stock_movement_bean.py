"""Bean StockMovement — représentation domaine d'un mouvement de stock."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class StockMovementBean:
    """Bean représentant un mouvement de stock (entrée / sortie / ajustement).

    Voir CAHIER_DES_CHARGES_STOCK.md §3.2.
    """

    uuid: str = ""

    # Référence à l'item du catalogue
    catalog_item_uuid: str = ""

    # Type et impact
    movement_type: str = ""
    quantite_delta: int = 0
    quantite_apres: int = 0

    # Contexte
    date: Optional[date] = None
    remarque: Optional[str] = None
    auteur_name: Optional[str] = None

    # Metadata
    created_at: Optional[datetime] = None
