"""Bean FsecAssemblyItem — représentation domaine d'une ligne du tableau récap FSEC."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean


@dataclass
class FsecAssemblyItemBean:
    """Bean représentant une ligne du tableau récap d'une FSEC.

    Voir CAHIER_DES_CHARGES_STOCK.md §3.3.
    """

    uuid: str = ""
    fsec_uuid: str = ""
    catalog_item_uuid: str = ""

    sort_order: int = 0
    remarque: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class FsecAssemblyItemDetailBean:
    """Variante enrichie incluant les données du catalog_item joint.

    Utilisée par le endpoint GET /api/v1/fsec-assembly-items/fsec/:fsec_uuid/
    pour éviter un N+1 côté frontend (cf. CDC §5.3).
    """

    item: FsecAssemblyItemBean = field(default_factory=FsecAssemblyItemBean)
    catalog_item: StockCatalogItemBean = field(default_factory=StockCatalogItemBean)
