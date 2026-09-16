"""Interface IStockCatalogRepository — contrat du repository catalogue."""

import abc
from datetime import date
from typing import List, Optional

from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean


class IStockCatalogRepository(abc.ABC):
    """Contrat du repository pour StockCatalogItem."""

    # ---------------------------------------------------------------- CRUD

    @abc.abstractmethod
    def create(self, bean: StockCatalogItemBean) -> StockCatalogItemBean:
        """Crée un nouvel item du catalogue."""
        raise NotImplementedError

    @abc.abstractmethod
    def create_structuration_batch(
        self, template: StockCatalogItemBean, quantity: int
    ) -> List[StockCatalogItemBean]:
        """Crée `quantity` structurations numérotées séquentiellement, atomiquement.

        L'attribution des numéros (lecture du max + insertions) est sérialisée
        contre la concurrence (cf. implémentation). `template` porte les champs
        communs ; seul `name` (numéro de série) varie d'une pièce à l'autre.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[StockCatalogItemBean]:
        """Récupère un item par son UUID. Retourne None si non trouvé."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: StockCatalogItemBean) -> StockCatalogItemBean:
        """Met à jour un item existant (PUT-like)."""
        raise NotImplementedError

    @abc.abstractmethod
    def patch(self, uuid: str, fields: dict) -> StockCatalogItemBean:
        """Met à jour partiellement un item (PATCH)."""
        raise NotImplementedError

    @abc.abstractmethod
    def soft_delete(self, uuid: str) -> bool:
        """Désactive un item (is_active=False). Retourne True si trouvé."""
        raise NotImplementedError

    # ---------------------------------------------------------------- Listing

    @abc.abstractmethod
    def list_by_filters(
        self,
        kind: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        installation: Optional[str] = None,
        is_active: Optional[bool] = True,
        search: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[StockCatalogItemBean]:
        """Liste les items selon les filtres CDC §5.1."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_by_filters(
        self,
        kind: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        installation: Optional[str] = None,
        is_active: Optional[bool] = True,
        search: Optional[str] = None,
    ) -> int:
        """Compte les items selon les filtres."""
        raise NotImplementedError

    # ---------------------------------------------------------------- Specific queries

    @abc.abstractmethod
    def exists_by_kind_name_reference(
        self,
        kind: str,
        name: str,
        reference: Optional[str],
        exclude_uuid: Optional[str] = None,
    ) -> bool:
        """Vérifie l'unicité name+reference par kind (cf. CDC §3.1)."""
        raise NotImplementedError

    @abc.abstractmethod
    def next_structuration_number(self) -> int:
        """Prochain numéro de série global pour une structuration (max + 1).

        Compteur global et continu sur le `name` numérique des structurations.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def is_referenced_by_assembly(self, uuid: str) -> bool:
        """Vérifie si un item est référencé dans un FsecAssemblyItem (anti-suppression)."""
        raise NotImplementedError

    @abc.abstractmethod
    def list_available_for_fsec(
        self,
        fsec_uuid: str,
        kind: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[StockCatalogItemBean]:
        """Items assignables à une FSEC (cf. CDC §5.4) :
        - consumables actifs
        - elements `dispo` OU déjà réservés sur cette même FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def update_status_for_uuids(self, uuids: List[str], new_status: str) -> int:
        """Met à jour `status` en bulk pour les éléments listés. Retourne le nombre de lignes affectées.

        Utilisé par le couplage FSEC ↔ éléments (CDC §4.2). Contrat : le statut
        terminal 'tiree' ne doit jamais être dégradé en bulk (les lignes déjà
        tirées sont ignorées sauf si la cible est 'tiree').
        """
        raise NotImplementedError

    # ---------------------------------------------------------------- Alerts (cf. CDC §5.4)

    @abc.abstractmethod
    def find_low_stock(self) -> List[StockCatalogItemBean]:
        """Consommables sous seuil d'alerte (quantite <= seuil_alerte)."""
        raise NotImplementedError

    @abc.abstractmethod
    def find_expired(self, today: date) -> List[StockCatalogItemBean]:
        """Consommables périmés (date_peremption <= today)."""
        raise NotImplementedError

    @abc.abstractmethod
    def find_expiring_soon(
        self, today: date, days_ahead: int
    ) -> List[StockCatalogItemBean]:
        """Consommables périmant sous `days_ahead` jours (today < date_peremption <= today + days_ahead)."""
        raise NotImplementedError
