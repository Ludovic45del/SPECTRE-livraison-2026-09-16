"""Entité STOCK_MOVEMENT — historique des mouvements de stock (consommables).

Voir CAHIER_DES_CHARGES_STOCK.md §3.2.
"""

import uuid

from django.db import models

from app.domain.stock.models.stock_constants import MOVEMENT_TYPE_CHOICES
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity


class StockMovementEntity(models.Model):
    """Entité représentant un mouvement de stock (entrée / sortie / ajustement).

    Exclusivement pour les items de kind='consumable'. Les éléments sérialisés
    ont leur historique implicite via le champ `status`.
    """

    class Meta:
        app_label = "app"
        db_table = "STOCK_MOVEMENT"
        indexes = [
            models.Index(
                fields=["catalog_item", "-date"], name="stock_mvmt_item_date_idx"
            ),
            models.Index(fields=["movement_type"], name="stock_mvmt_type_idx"),
        ]
        ordering = ["-date", "-created_at"]

    # Clé primaire
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Item concerné
    catalog_item = models.ForeignKey(
        StockCatalogItemEntity,
        on_delete=models.PROTECT,
        db_column="catalog_item_uuid",
        related_name="movements",
    )

    # Type et impact
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantite_delta = models.IntegerField()
    quantite_apres = models.IntegerField()

    # Contexte
    date = models.DateField()
    remarque = models.TextField(max_length=1000, null=True, blank=True)
    auteur_name = models.CharField(max_length=100, null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
