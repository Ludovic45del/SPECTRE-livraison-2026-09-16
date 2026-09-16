"""Bean StockCatalogItem — représentation domaine d'un item du catalogue Stock."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class StockCatalogItemBean:
    """Bean représentant un item du catalogue Stock (élément ou consommable).

    Voir CAHIER_DES_CHARGES_STOCK.md §3.1 pour la sémantique des champs et
    les règles de cohérence kind ↔ category ↔ champs spécifiques.
    """

    uuid: str = ""

    # Discriminant + rubrique
    kind: str = ""
    category: str = ""
    # Sous-type de structuration — requis si category=structuration, None sinon
    structuration_type: Optional[str] = None

    # Identification
    # Pour une structuration créée par lot, `name` porte le numéro de série
    # global auto-incrémenté ("1", "2", ...) — seul identifiant distinctif.
    name: str = ""
    reference: Optional[str] = None

    # Caractéristiques génériques
    caracteristique: Optional[str] = None
    type_de_colle: Optional[str] = None
    fournisseur: Optional[str] = None
    remarques: Optional[str] = None

    # Champs consumable uniquement
    unite: Optional[str] = None
    quantite: Optional[int] = None
    seuil_alerte: Optional[int] = None
    date_peremption: Optional[date] = None
    type_d_achat: Optional[str] = None

    # Champs element uniquement
    # FSEC de destination (lien déclaratif optionnel, par nom)
    fsec_name: Optional[str] = None
    installation: Optional[str] = None
    status: Optional[str] = None
    materiaux_mat: Optional[str] = None
    # Matière générique (≠ materiaux_mat, réservé aux structurations spéciales)
    matiere: Optional[str] = None
    # Masse en milligrammes
    masse_mg: Optional[float] = None

    # --- Champs calculés, lecture seule (jamais persistés — cf. R01) ---
    # FSEC réellement réservée via le tableau récap (FSEC_ASSEMBLY_ITEM) et sa
    # campagne. Renseignés par StockCatalogRepository._attach_assignments ;
    # exposés par bean_to_api mais jamais lus par api_to_bean ni écrits en base.
    assigned_fsec_name: Optional[str] = None
    assigned_campaign_name: Optional[str] = None
    assigned_fsec_slug: Optional[str] = None

    # Placement physique
    boite: Optional[str] = None
    emplacement: Optional[str] = None

    # Metadata
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
