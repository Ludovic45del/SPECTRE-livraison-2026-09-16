"""Interface IStockMovementRepository — contrat du repository mouvements."""

import abc
from datetime import date
from typing import List, Optional

from app.domain.stock.models.stock_movement_bean import StockMovementBean


class IStockMovementRepository(abc.ABC):
    """Contrat du repository pour StockMovement.

    Tous les mouvements concernent UNIQUEMENT des items kind='consumable'.
    La validation de cohérence est faite côté service avant appel.
    """

    @abc.abstractmethod
    def create_with_quantity_update(self, bean: StockMovementBean) -> StockMovementBean:
        """Crée un mouvement et met à jour `catalog_item.quantite` de façon atomique.

        L'implémentation DOIT :
        - poser un `select_for_update` sur le catalog_item AVANT lecture de la quantité ;
        - calculer `quantite_apres = quantite_courante + quantite_delta` ;
        - écrire le mouvement et mettre à jour le catalog_item dans la même transaction.

        Le bean reçu n'a PAS besoin de `quantite_apres` rempli ; le repository le calcule.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[StockMovementBean]:
        """Récupère un mouvement par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def list_by_filters(
        self,
        catalog_item_uuid: Optional[str] = None,
        movement_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[StockMovementBean]:
        """Liste les mouvements selon les filtres CDC §5.2."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_by_filters(
        self,
        catalog_item_uuid: Optional[str] = None,
        movement_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> int:
        """Compte les mouvements selon les filtres."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete_and_recompute(self, uuid: str) -> bool:
        """Supprime un mouvement et recalcule la quantité du catalog_item associé.

        Réservé aux admins (cf. CDC §5.2). Retourne True si le mouvement a été trouvé et supprimé.
        """
        raise NotImplementedError
