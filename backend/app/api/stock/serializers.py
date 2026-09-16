"""Serializers pour le module Stock — validation des payloads d'entrée."""

from rest_framework import serializers

from app.domain.stock.models.stock_constants import (
    CATEGORY_CHOICES,
    ELEMENT_STATUS_CHOICES,
    INSTALLATION_CHOICES,
    ITEM_KIND_CHOICES,
    MOVEMENT_TYPE_CHOICES,
    STRUCTURATION_BATCH_MAX,
    STRUCTURATION_TYPE_CHOICES,
)


def _choices_keys(choices_tuple):
    """Extrait la liste des clés ('element', 'consumable', ...) d'un tuple de choices."""
    return [c[0] for c in choices_tuple]


# ===========================================================================
# Catalog
# ===========================================================================


class StockCatalogItemSerializer(serializers.Serializer):
    """Validation des payloads de création / remplacement (POST / PUT)."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    kind = serializers.ChoiceField(choices=_choices_keys(ITEM_KIND_CHOICES))
    category = serializers.ChoiceField(choices=_choices_keys(CATEGORY_CHOICES))
    structuration_type = serializers.ChoiceField(
        choices=_choices_keys(STRUCTURATION_TYPE_CHOICES),
        required=False,
        allow_null=True,
    )
    name = serializers.CharField(max_length=200)
    reference = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    caracteristique = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    type_de_colle = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    fournisseur = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    remarques = serializers.CharField(
        max_length=4000, required=False, allow_null=True, allow_blank=True
    )

    # Champs consumable
    unite = serializers.CharField(
        max_length=50, required=False, allow_null=True, allow_blank=True
    )
    quantite = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=10**9
    )
    seuil_alerte = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=10**9
    )
    date_peremption = serializers.DateField(required=False, allow_null=True)
    type_d_achat = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )

    # Champs element
    fsec_name = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    installation = serializers.ChoiceField(
        choices=_choices_keys(INSTALLATION_CHOICES),
        required=False,
        allow_null=True,
    )
    status = serializers.ChoiceField(
        choices=_choices_keys(ELEMENT_STATUS_CHOICES),
        required=False,
        allow_null=True,
    )
    materiaux_mat = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    matiere = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    masse_mg = serializers.FloatField(required=False, allow_null=True, min_value=0)

    # Placement
    boite = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    emplacement = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    is_active = serializers.BooleanField(required=False)


class StockCatalogItemPatchSerializer(serializers.Serializer):
    """Validation pour le PATCH partiel — tous les champs optionnels.

    `kind` est explicitement absent : interdit de modifier après création
    (cf. CDC §5.1). S'il est passé dans le payload, il sera ignoré silencieusement.
    """

    category = serializers.ChoiceField(
        choices=_choices_keys(CATEGORY_CHOICES), required=False
    )
    structuration_type = serializers.ChoiceField(
        choices=_choices_keys(STRUCTURATION_TYPE_CHOICES),
        required=False,
        allow_null=True,
    )
    name = serializers.CharField(max_length=200, required=False)
    reference = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    caracteristique = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    type_de_colle = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    fournisseur = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    remarques = serializers.CharField(
        max_length=4000, required=False, allow_null=True, allow_blank=True
    )
    unite = serializers.CharField(
        max_length=50, required=False, allow_null=True, allow_blank=True
    )
    quantite = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=10**9
    )
    seuil_alerte = serializers.IntegerField(
        required=False, allow_null=True, min_value=0, max_value=10**9
    )
    date_peremption = serializers.DateField(required=False, allow_null=True)
    type_d_achat = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    fsec_name = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    installation = serializers.ChoiceField(
        choices=_choices_keys(INSTALLATION_CHOICES),
        required=False,
        allow_null=True,
    )
    status = serializers.ChoiceField(
        choices=_choices_keys(ELEMENT_STATUS_CHOICES),
        required=False,
        allow_null=True,
    )
    materiaux_mat = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    matiere = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    masse_mg = serializers.FloatField(required=False, allow_null=True, min_value=0)
    boite = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    emplacement = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    is_active = serializers.BooleanField(required=False)


class StructurationBatchSerializer(serializers.Serializer):
    """Validation du payload de création par lot de structurations (POST).

    Crée `quantity` éléments sérialisés (kind=element, category=structuration)
    partageant le même type et la même installation. Le `name` de chaque pièce
    est un numéro de série global auto-incrémenté côté service (cf.
    create_structuration_batch) — seul identifiant distinctif. La FSEC reste
    optionnelle.
    """

    structuration_type = serializers.ChoiceField(
        choices=_choices_keys(STRUCTURATION_TYPE_CHOICES)
    )
    installation = serializers.ChoiceField(choices=_choices_keys(INSTALLATION_CHOICES))
    quantity = serializers.IntegerField(min_value=1, max_value=STRUCTURATION_BATCH_MAX)

    # Champs communs optionnels appliqués à toutes les pièces du paquet.
    fsec_name = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    caracteristique = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    fournisseur = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    materiaux_mat = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    matiere = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    masse_mg = serializers.FloatField(required=False, allow_null=True, min_value=0)
    boite = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    emplacement = serializers.CharField(
        max_length=200, required=False, allow_null=True, allow_blank=True
    )
    remarques = serializers.CharField(
        max_length=4000, required=False, allow_null=True, allow_blank=True
    )


# ===========================================================================
# Movement
# ===========================================================================


class StockMovementSerializer(serializers.Serializer):
    """Validation des payloads de création de mouvement (POST)."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    catalog_item_uuid = serializers.UUIDField()
    movement_type = serializers.ChoiceField(
        choices=_choices_keys(MOVEMENT_TYPE_CHOICES)
    )
    quantite_delta = serializers.IntegerField(min_value=-(10**9), max_value=10**9)
    date = serializers.DateField()
    remarque = serializers.CharField(
        max_length=1000, required=False, allow_null=True, allow_blank=True
    )
    auteur_name = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )

    def validate(self, attrs):
        """Cohérence movement_type ↔ signe de quantite_delta (cf. CDC §3.2).

        - entree : delta > 0
        - sortie : delta < 0
        - ajustement : delta != 0 (signé libre)
        """
        mtype = attrs.get("movement_type")
        delta = attrs.get("quantite_delta", 0)
        if delta == 0:
            raise serializers.ValidationError(
                {"quantite_delta": "La quantité ne peut pas être nulle."}
            )
        if mtype == "entree" and delta < 0:
            raise serializers.ValidationError(
                {"quantite_delta": "Pour une entrée, la quantité doit être positive."}
            )
        if mtype == "sortie" and delta > 0:
            raise serializers.ValidationError(
                {"quantite_delta": "Pour une sortie, la quantité doit être négative."}
            )
        return attrs


# ===========================================================================
# FSEC Assembly Item
# ===========================================================================


class FsecAssemblyItemCreateSerializer(serializers.Serializer):
    """Validation pour POST /api/v1/fsec-assembly-items/."""

    fsec_uuid = serializers.UUIDField()
    catalog_item_uuid = serializers.UUIDField()
    sort_order = serializers.IntegerField(required=False, default=0, min_value=0)
    remarque = serializers.CharField(
        max_length=1000, required=False, allow_null=True, allow_blank=True
    )


class FsecAssemblyItemPatchSerializer(serializers.Serializer):
    """Validation pour PATCH /api/v1/fsec-assembly-items/:uuid/.

    Seuls `sort_order` et `remarque` sont modifiables (cf. CDC §5.3).
    """

    sort_order = serializers.IntegerField(required=False, min_value=0)
    remarque = serializers.CharField(
        max_length=1000, required=False, allow_null=True, allow_blank=True
    )
