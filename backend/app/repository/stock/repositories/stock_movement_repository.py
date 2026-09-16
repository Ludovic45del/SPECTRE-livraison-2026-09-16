"""Repository StockMovement — implémentation IStockMovementRepository.

Toutes les opérations qui modifient la quantité du catalog_item sont atomiques
(`@transaction.atomic` + `select_for_update`) pour éviter toute race condition
sous charge.
"""

from datetime import date
from typing import List, Optional

from django.db import transaction

from app.domain.stock.interface.movement_repository import IStockMovementRepository
from app.domain.stock.models.stock_movement_bean import StockMovementBean
from app.mapper.stock.movement_mapper import stock_movement_mapper_entity_to_bean
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity
from app.repository.stock.models.stock_movement_entity import StockMovementEntity


class StockMovementRepository(IStockMovementRepository):
    """Implémentation du repository pour les mouvements de stock."""

    @transaction.atomic
    def create_with_quantity_update(self, bean: StockMovementBean) -> StockMovementBean:
        """Crée un mouvement et met à jour `catalog_item.quantite` atomiquement.

        L'ordre d'opérations :
        1. `select_for_update` sur le catalog_item (verrou exclusif jusqu'au commit).
        2. Calcul de la nouvelle quantité.
        3. Création du mouvement avec `quantite_apres` calculé.
        4. Mise à jour de `catalog_item.quantite`.
        """
        catalog_item = StockCatalogItemEntity.objects.select_for_update().get(
            uuid=bean.catalog_item_uuid
        )

        current_qty = catalog_item.quantite if catalog_item.quantite is not None else 0
        new_qty = current_qty + bean.quantite_delta

        movement_entity = StockMovementEntity(
            catalog_item=catalog_item,
            movement_type=bean.movement_type,
            quantite_delta=bean.quantite_delta,
            quantite_apres=new_qty,
            date=bean.date,
            remarque=bean.remarque,
            auteur_name=bean.auteur_name,
        )
        if bean.uuid:
            movement_entity.uuid = bean.uuid
        movement_entity.save()

        catalog_item.quantite = new_qty
        catalog_item.save(update_fields=["quantite", "updated_at"])

        return stock_movement_mapper_entity_to_bean(movement_entity)

    def get_by_uuid(self, uuid: str) -> Optional[StockMovementBean]:
        """Récupère un mouvement par son UUID."""
        try:
            entity = StockMovementEntity.objects.get(uuid=uuid)
            return stock_movement_mapper_entity_to_bean(entity)
        except StockMovementEntity.DoesNotExist:
            return None

    def _build_filter_queryset(
        self,
        catalog_item_uuid: Optional[str],
        movement_type: Optional[str],
        date_from: Optional[date],
        date_to: Optional[date],
    ):
        qs = StockMovementEntity.objects.all()
        if catalog_item_uuid is not None:
            qs = qs.filter(catalog_item_id=catalog_item_uuid)
        if movement_type is not None:
            qs = qs.filter(movement_type=movement_type)
        if date_from is not None:
            qs = qs.filter(date__gte=date_from)
        if date_to is not None:
            qs = qs.filter(date__lte=date_to)
        return qs.order_by("-date", "-created_at")

    def list_by_filters(
        self,
        catalog_item_uuid: Optional[str] = None,
        movement_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[StockMovementBean]:
        """Liste paginée selon filtres (cf. CDC §5.2)."""
        qs = self._build_filter_queryset(
            catalog_item_uuid, movement_type, date_from, date_to
        )
        if limit is not None:
            entities = qs[offset : offset + limit]
        else:
            entities = qs[offset:]
        return [stock_movement_mapper_entity_to_bean(e) for e in entities]

    def count_by_filters(
        self,
        catalog_item_uuid: Optional[str] = None,
        movement_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> int:
        return self._build_filter_queryset(
            catalog_item_uuid, movement_type, date_from, date_to
        ).count()

    @transaction.atomic
    def delete_and_recompute(self, uuid: str) -> bool:
        """Supprime un mouvement et recalcule la quantité du catalog_item.

        Recalcul = somme de tous les `quantite_delta` restants pour cet item.
        """
        try:
            movement = StockMovementEntity.objects.select_for_update().get(uuid=uuid)
        except StockMovementEntity.DoesNotExist:
            return False

        catalog_item_id = movement.catalog_item_id
        catalog_item = StockCatalogItemEntity.objects.select_for_update().get(
            uuid=catalog_item_id
        )

        movement.delete()

        # Recalcul de la quantité courante = somme des deltas restants.
        from django.db.models import Sum

        agg = StockMovementEntity.objects.filter(
            catalog_item_id=catalog_item_id
        ).aggregate(total=Sum("quantite_delta"))
        new_qty = agg["total"] or 0
        catalog_item.quantite = new_qty
        catalog_item.save(update_fields=["quantite", "updated_at"])
        return True
