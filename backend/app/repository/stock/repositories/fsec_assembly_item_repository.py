"""Repository FsecAssemblyItem — implémentation IFsecAssemblyItemRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.stock.interface.fsec_assembly_repository import (
    IFsecAssemblyItemRepository,
)
from app.domain.stock.models.fsec_assembly_item_bean import (
    FsecAssemblyItemBean,
    FsecAssemblyItemDetailBean,
)
from app.domain.stock.models.stock_constants import ITEM_KIND_ELEMENT
from app.mapper.stock.catalog_mapper import stock_catalog_mapper_entity_to_bean
from app.mapper.stock.fsec_assembly_mapper import (
    fsec_assembly_mapper_bean_to_entity,
    fsec_assembly_mapper_entity_to_bean,
)
from app.repository.stock.models.fsec_assembly_item_entity import FsecAssemblyItemEntity


class FsecAssemblyItemRepository(IFsecAssemblyItemRepository):
    """Implémentation du repository pour le tableau récap FSEC."""

    SELECT_RELATED = ("catalog_item",)

    # ---------------------------------------------------------------- CRUD

    @transaction.atomic
    def create(self, bean: FsecAssemblyItemBean) -> FsecAssemblyItemBean:
        """Crée une nouvelle ligne du tableau récap."""
        entity = fsec_assembly_mapper_bean_to_entity(bean)
        entity.save()
        return fsec_assembly_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[FsecAssemblyItemBean]:
        """Récupère une ligne par son UUID."""
        try:
            entity = FsecAssemblyItemEntity.objects.get(uuid=uuid)
            return fsec_assembly_mapper_entity_to_bean(entity)
        except FsecAssemblyItemEntity.DoesNotExist:
            return None

    @transaction.atomic
    def patch(self, uuid: str, fields: dict) -> FsecAssemblyItemBean:
        """Met à jour partiellement (sort_order, remarque uniquement)."""
        entity = FsecAssemblyItemEntity.objects.get(uuid=uuid)
        allowed_fields = {"sort_order", "remarque"}
        for key, value in fields.items():
            if key in allowed_fields:
                setattr(entity, key, value)
        entity.save()
        return fsec_assembly_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une ligne du tableau récap."""
        try:
            entity = FsecAssemblyItemEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except FsecAssemblyItemEntity.DoesNotExist:
            return False

    # ---------------------------------------------------------------- Listing

    def list_by_fsec(self, fsec_uuid: str) -> List[FsecAssemblyItemDetailBean]:
        """Liste enrichie (catalog_item joint) pour éviter N+1 côté frontend."""
        entities = (
            FsecAssemblyItemEntity.objects.select_related(*self.SELECT_RELATED)
            .filter(fsec_uuid=fsec_uuid)
            .order_by("sort_order", "created_at")
        )
        return [
            FsecAssemblyItemDetailBean(
                item=fsec_assembly_mapper_entity_to_bean(e),
                catalog_item=stock_catalog_mapper_entity_to_bean(e.catalog_item),
            )
            for e in entities
        ]

    def list_catalog_uuids_by_fsec(self, fsec_uuid: str) -> List[str]:
        """UUIDs des catalog_items associés à une FSEC."""
        return [
            str(uuid)
            for uuid in FsecAssemblyItemEntity.objects.filter(
                fsec_uuid=fsec_uuid
            ).values_list("catalog_item_id", flat=True)
        ]

    # ---------------------------------------------------------------- Specific queries

    def find_active_assignment_for_element(
        self, catalog_item_uuid: str
    ) -> Optional[FsecAssemblyItemBean]:
        """Cherche une assignation pour un élément sérialisé (au plus une — cf. CDC §3.3)."""
        try:
            entity = FsecAssemblyItemEntity.objects.select_related("catalog_item").get(
                catalog_item_id=catalog_item_uuid, catalog_item__kind=ITEM_KIND_ELEMENT
            )
            return fsec_assembly_mapper_entity_to_bean(entity)
        except FsecAssemblyItemEntity.DoesNotExist:
            return None
        except FsecAssemblyItemEntity.MultipleObjectsReturned:
            # Ne devrait jamais se produire vu la règle d'unicité applicative.
            # On retourne le premier pour ne pas crasher, mais c'est un signal d'incident.
            entity = (
                FsecAssemblyItemEntity.objects.select_related("catalog_item")
                .filter(
                    catalog_item_id=catalog_item_uuid,
                    catalog_item__kind=ITEM_KIND_ELEMENT,
                )
                .order_by("created_at")
                .first()
            )
            return fsec_assembly_mapper_entity_to_bean(entity) if entity else None

    def exists_by_fsec_and_catalog(
        self, fsec_uuid: str, catalog_item_uuid: str
    ) -> bool:
        """Vrai si une ligne (fsec_uuid, catalog_item) existe déjà."""
        return FsecAssemblyItemEntity.objects.filter(
            fsec_uuid=fsec_uuid, catalog_item_id=catalog_item_uuid
        ).exists()
