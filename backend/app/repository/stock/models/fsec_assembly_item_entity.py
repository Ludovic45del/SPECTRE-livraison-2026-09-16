"""Entité FSEC_ASSEMBLY_ITEM — ligne du tableau récap d'une FSEC.

Voir CAHIER_DES_CHARGES_STOCK.md §3.3.

Note importante : `fsec_uuid` est stocké comme UUIDField simple, sans FK directe
vers FsecEntity, car le tableau récap est partagé entre toutes les versions d'une
même FSEC (FsecEntity utilise `version_uuid` comme PK, et `fsec_uuid` comme
colonne logique partagée). L'intégrité applicative est gérée côté service.
"""

import uuid

from django.db import models

from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity


class FsecAssemblyItemEntity(models.Model):
    """Ligne du tableau récap (Assemblage) liant une FSEC à un item du catalogue."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_ASSEMBLY_ITEM"
        indexes = [
            models.Index(fields=["fsec_uuid"], name="fsec_asm_item_fsec_idx"),
            models.Index(fields=["catalog_item"], name="fsec_asm_item_catalog_idx"),
        ]
        # Pas de contrainte d'unicité (fsec_uuid, catalog_item) : un consommable
        # peut apparaître sur plusieurs lignes du même tableau récap (cf. R20).
        # L'unicité des ÉLÉMENTS sérialisés est garantie côté service
        # (fsec_assembly_service.add_assembly_item + reserve_element).
        ordering = ["sort_order", "created_at"]

    # Clé primaire
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # FSEC "logique" (partagée entre versions) — pas de FK, cf. docstring
    fsec_uuid = models.UUIDField()

    # Item utilisé
    catalog_item = models.ForeignKey(
        StockCatalogItemEntity,
        on_delete=models.PROTECT,
        db_column="catalog_item_uuid",
        related_name="fsec_assembly_items",
    )

    # Ordonnancement et commentaire
    sort_order = models.IntegerField(default=0)
    remarque = models.TextField(max_length=1000, null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
