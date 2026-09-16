"""Entité STOCK_CATALOG_ITEM — catalogue unifié des éléments et consommables.

Voir CAHIER_DES_CHARGES_STOCK.md §3.1.
"""

import uuid

from django.db import models

from app.domain.stock.models.stock_constants import (
    CATEGORY_CHOICES,
    ELEMENT_STATUS_CHOICES,
    ELEMENT_STATUS_DISPO,
    INSTALLATION_CHOICES,
    ITEM_KIND_CHOICES,
    STRUCTURATION_TYPE_CHOICES,
)


class StockCatalogItemEntity(models.Model):
    """Entité représentant un item du catalogue Stock (élément ou consommable)."""

    class Meta:
        app_label = "app"
        db_table = "STOCK_CATALOG_ITEM"
        indexes = [
            models.Index(fields=["kind"], name="stock_item_kind_idx"),
            models.Index(fields=["category"], name="stock_item_category_idx"),
            models.Index(fields=["status"], name="stock_item_status_idx"),
            models.Index(fields=["is_active"], name="stock_item_active_idx"),
            models.Index(fields=["date_peremption"], name="stock_item_perem_idx"),
        ]
        constraints = [
            # Interdit la quantité négative côté DB (en plus de la validation service).
            # `quantite` est nullable pour les éléments sérialisés ; on accepte donc NULL.
            models.CheckConstraint(
                condition=models.Q(quantite__gte=0) | models.Q(quantite__isnull=True),
                name="stock_item_quantite_non_negative",
            ),
        ]

    # Clé primaire
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Discriminant principal
    kind = models.CharField(max_length=20, choices=ITEM_KIND_CHOICES)

    # Rubrique métier (enum strict des 4 valeurs, cf. CDC §4.6)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)

    # Sous-type de structuration — requis si category=structuration, NULL sinon
    structuration_type = models.CharField(
        max_length=20, choices=STRUCTURATION_TYPE_CHOICES, null=True, blank=True
    )

    # Identification
    # Pour une structuration créée par lot, `name` porte le numéro de série
    # global auto-incrémenté — seul identifiant distinctif.
    name = models.CharField(max_length=200)
    reference = models.CharField(max_length=200, null=True, blank=True)

    # Caractéristiques génériques
    caracteristique = models.CharField(max_length=200, null=True, blank=True)
    type_de_colle = models.CharField(max_length=100, null=True, blank=True)
    fournisseur = models.CharField(max_length=100, null=True, blank=True)
    remarques = models.TextField(max_length=4000, null=True, blank=True)

    # --- Champs consumable uniquement (null pour kind=element) ---
    unite = models.CharField(max_length=50, null=True, blank=True)
    quantite = models.IntegerField(null=True, blank=True, default=0)
    seuil_alerte = models.IntegerField(null=True, blank=True)
    date_peremption = models.DateField(null=True, blank=True)
    type_d_achat = models.CharField(max_length=100, null=True, blank=True)

    # --- Champs element uniquement (null pour kind=consumable) ---
    # FSEC de destination (nom, lien déclaratif optionnel — le couplage dur
    # passe par FSEC_ASSEMBLY_ITEM, cf. CDC §4.2)
    fsec_name = models.CharField(max_length=200, null=True, blank=True)
    installation = models.CharField(
        max_length=10, choices=INSTALLATION_CHOICES, null=True, blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=ELEMENT_STATUS_CHOICES,
        null=True,
        blank=True,
        default=ELEMENT_STATUS_DISPO,
    )
    materiaux_mat = models.CharField(max_length=200, null=True, blank=True)
    # Matière générique de l'élément (à ne pas confondre avec materiaux_mat,
    # réservé aux structurations spéciales) — cf. retour R03.
    matiere = models.CharField(max_length=200, null=True, blank=True)
    # Masse de l'élément en milligrammes (Float : masses < 1 mg possibles).
    masse_mg = models.FloatField(null=True, blank=True)

    # --- Placement physique ---
    boite = models.CharField(max_length=200, null=True, blank=True)
    emplacement = models.CharField(max_length=200, null=True, blank=True)

    # --- Metadata ---
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
