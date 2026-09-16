"""Service Catalog — logique métier du catalogue Stock.

Voir CAHIER_DES_CHARGES_STOCK.md §3.1 (validations) et §5.1 (API).
"""

import logging
from typing import Any, Dict, List, Optional

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_BY_KIND,
    CATEGORY_STRUCTURATION,
    ELEMENT_STATUS_DISPO,
    ERROR_CODE_CATALOG_ITEM_IN_USE,
    ERROR_CODE_INVALID_KIND_CATEGORY,
    ITEM_KIND_CONSUMABLE,
    ITEM_KIND_ELEMENT,
    ITEM_KINDS,
    STRUCTURATION_BATCH_MAX,
    STRUCTURATION_TYPES,
)

logger = logging.getLogger(__name__)


# Champs autorisés pour la mise à jour partielle (PATCH).
# `kind` est explicitement exclu (immuable après création — cf. CDC §5.1).
ALLOWED_PATCH_FIELDS = {
    "category",
    "structuration_type",
    "name",
    "reference",
    "caracteristique",
    "type_de_colle",
    "fournisseur",
    "remarques",
    "unite",
    "quantite",
    "seuil_alerte",
    "date_peremption",
    "type_d_achat",
    "fsec_name",
    "installation",
    "status",
    "materiaux_mat",
    "matiere",
    "masse_mg",
    "boite",
    "emplacement",
    "is_active",
}


# ---------------------------------------------------------------------------
# Validations privées
# ---------------------------------------------------------------------------


def _validate_kind(bean: StockCatalogItemBean) -> None:
    if bean.kind not in ITEM_KINDS:
        raise ValidationException(
            "kind",
            f"Kind invalide '{bean.kind}'. Valeurs autorisées : {sorted(ITEM_KINDS)}",
        )


def _validate_kind_category_consistency(bean: StockCatalogItemBean) -> None:
    """Vérifie que la rubrique est compatible avec le kind (cf. CDC §4.6)."""
    allowed = CATEGORY_BY_KIND.get(bean.kind, frozenset())
    if bean.category not in allowed:
        raise ValidationException(
            ERROR_CODE_INVALID_KIND_CATEGORY,
            f"Rubrique '{bean.category}' incompatible avec kind='{bean.kind}'. "
            f"Valeurs autorisées pour ce kind : {sorted(allowed)}",
        )


def _validate_structuration_type(bean: StockCatalogItemBean) -> None:
    """Cohérence rubrique ↔ structuration_type.

    Requis (standard/speciale/ec) quand category=structuration ; remis à None
    silencieusement sinon (ex. PATCH qui change la rubrique sans nettoyer le type).
    """
    if bean.category == CATEGORY_STRUCTURATION:
        if bean.structuration_type not in STRUCTURATION_TYPES:
            raise ValidationException(
                "structuration_type",
                "Le champ 'structuration_type' est requis pour la rubrique "
                f"'structuration'. Valeurs autorisées : {sorted(STRUCTURATION_TYPES)}",
            )
    else:
        bean.structuration_type = None


def _validate_kind_specific_fields(bean: StockCatalogItemBean) -> None:
    """Applique les contraintes CDC §3.1 selon le kind."""
    if bean.kind == ITEM_KIND_ELEMENT:
        # Champs requis pour element
        if not bean.status:
            # Service applique le default si absent.
            bean.status = ELEMENT_STATUS_DISPO
        if not bean.installation:
            raise ValidationException(
                "installation",
                "Le champ 'installation' (LMJ/OMEGA) est requis pour un élément sérialisé.",
            )
        # Champs interdits pour element
        for forbidden in ("unite", "seuil_alerte", "date_peremption", "type_d_achat"):
            if getattr(bean, forbidden) is not None:
                raise ValidationException(
                    forbidden,
                    f"Le champ '{forbidden}' est interdit pour un élément sérialisé.",
                )
        # quantite : doit être null ou 0 (le default IntegerField=0 est OK)
        if bean.quantite not in (None, 0):
            raise ValidationException(
                "quantite",
                "Le champ 'quantite' est interdit pour un élément sérialisé.",
            )
    elif bean.kind == ITEM_KIND_CONSUMABLE:
        # Champs requis pour consumable
        if not bean.unite:
            raise ValidationException(
                "unite", "Le champ 'unite' est requis pour un consommable."
            )
        if bean.quantite is None:
            raise ValidationException(
                "quantite",
                "Le champ 'quantite' est requis pour un consommable (peut valoir 0).",
            )
        if bean.quantite < 0:
            raise ValidationException(
                "quantite", "La quantité ne peut pas être négative."
            )
        # Champs interdits pour consumable
        for forbidden in (
            "status",
            "installation",
            "materiaux_mat",
            "fsec_name",
            "matiere",
            "masse_mg",
        ):
            if getattr(bean, forbidden) is not None:
                raise ValidationException(
                    forbidden,
                    f"Le champ '{forbidden}' est interdit pour un consommable.",
                )


def _validate_unicity(
    repository: IStockCatalogRepository,
    bean: StockCatalogItemBean,
    exclude_uuid: Optional[str] = None,
) -> None:
    """Unicité (kind, name, reference) — cf. CDC §3.1."""
    if repository.exists_by_kind_name_reference(
        kind=bean.kind,
        name=bean.name,
        reference=bean.reference,
        exclude_uuid=exclude_uuid,
    ):
        raise ConflictException(
            "name/reference",
            f"{bean.name}/{bean.reference or '(sans référence)'}",
        )


# ---------------------------------------------------------------------------
# Opérations CRUD exposées
# ---------------------------------------------------------------------------


def create_item(
    repository: IStockCatalogRepository, bean: StockCatalogItemBean
) -> StockCatalogItemBean:
    """Crée un nouvel item du catalogue après validation (cf. CDC §5.1)."""
    _validate_kind(bean)
    _validate_kind_category_consistency(bean)
    _validate_structuration_type(bean)
    _validate_kind_specific_fields(bean)
    _validate_unicity(repository, bean)

    logger.info(
        "Creating stock catalog item kind=%s category=%s name=%s",
        bean.kind,
        bean.category,
        bean.name,
    )
    result = repository.create(bean)
    logger.info("Created stock catalog item uuid=%s", result.uuid)
    return result


def create_structuration_batch(
    repository: IStockCatalogRepository,
    *,
    structuration_type: str,
    installation: str,
    quantity: int,
    fsec_name: Optional[str] = None,
    caracteristique: Optional[str] = None,
    fournisseur: Optional[str] = None,
    materiaux_mat: Optional[str] = None,
    matiere: Optional[str] = None,
    masse_mg: Optional[float] = None,
    boite: Optional[str] = None,
    emplacement: Optional[str] = None,
    remarques: Optional[str] = None,
) -> List[StockCatalogItemBean]:
    """Crée un paquet de `quantity` structurations numérotées automatiquement.

    Chaque pièce partage le même type et la même installation ; son `name` est un
    numéro de série **global** et **continu** (max existant + 1), calculé une
    seule fois pour tout le paquet — seul identifiant distinctif. La création est
    atomique : soit toutes les pièces sont créées, soit aucune.

    La FSEC reste optionnelle. Voir CDC §8.1 (mode paquet).
    """
    if (
        not isinstance(quantity, int)
        or quantity < 1
        or quantity > STRUCTURATION_BATCH_MAX
    ):
        raise ValidationException(
            "quantity",
            f"La quantité doit être un entier entre 1 et {STRUCTURATION_BATCH_MAX}.",
        )

    # `template` porte les champs communs ; le `name` (numéro de série) est
    # attribué par le repository, sous verrou, pour tout le paquet. Les champs
    # communs sont validés une seule fois sur le template (ils sont identiques
    # pour toutes les pièces). L'unicité du `name` est garantie par construction
    # (numéro = max(kind=element) + 1) et n'a donc pas à être revérifiée par pièce.
    template = StockCatalogItemBean(
        kind=ITEM_KIND_ELEMENT,
        category=CATEGORY_STRUCTURATION,
        structuration_type=structuration_type,
        name="",
        installation=installation,
        status=ELEMENT_STATUS_DISPO,
        fsec_name=fsec_name or None,
        caracteristique=caracteristique or None,
        fournisseur=fournisseur or None,
        materiaux_mat=materiaux_mat or None,
        matiere=matiere or None,
        masse_mg=masse_mg,
        boite=boite or None,
        emplacement=emplacement or None,
        remarques=remarques or None,
    )
    _validate_kind(template)
    _validate_kind_category_consistency(template)
    _validate_structuration_type(template)
    _validate_kind_specific_fields(template)

    logger.info("Creating structuration batch: %d items", quantity)
    return repository.create_structuration_batch(template, quantity)


def get_item(repository: IStockCatalogRepository, uuid: str) -> StockCatalogItemBean:
    """Récupère un item par UUID. Lève NotFoundException sinon."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("StockCatalogItem", uuid)
    return bean


def list_items(
    repository: IStockCatalogRepository,
    kind: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    installation: Optional[str] = None,
    is_active: Optional[bool] = True,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[StockCatalogItemBean]:
    """Liste paginée du catalogue."""
    return repository.list_by_filters(
        kind=kind,
        category=category,
        status=status,
        installation=installation,
        is_active=is_active,
        search=search,
        limit=limit,
        offset=offset,
    )


def count_items(
    repository: IStockCatalogRepository,
    kind: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    installation: Optional[str] = None,
    is_active: Optional[bool] = True,
    search: Optional[str] = None,
) -> int:
    """Compte des items selon filtres."""
    return repository.count_by_filters(
        kind=kind,
        category=category,
        status=status,
        installation=installation,
        is_active=is_active,
        search=search,
    )


def update_item(
    repository: IStockCatalogRepository, bean: StockCatalogItemBean
) -> StockCatalogItemBean:
    """Met à jour complètement un item (PUT). `kind` est conservé tel qu'en base."""
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("StockCatalogItem", bean.uuid)

    # `kind` est immuable : on force la valeur en base, peu importe ce que l'API a envoyé.
    bean.kind = existing.kind

    _validate_kind(bean)
    _validate_kind_category_consistency(bean)
    _validate_structuration_type(bean)
    _validate_kind_specific_fields(bean)
    _validate_unicity(repository, bean, exclude_uuid=bean.uuid)

    logger.info("Updating stock catalog item uuid=%s", bean.uuid)
    return repository.update(bean)


def patch_item(
    repository: IStockCatalogRepository,
    uuid: str,
    partial_data: Dict[str, Any],
) -> StockCatalogItemBean:
    """Mise à jour partielle (PATCH). Les champs hors whitelist sont ignorés silencieusement."""
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("StockCatalogItem", uuid)

    # Fusion des champs autorisés
    for key, value in partial_data.items():
        if key in ALLOWED_PATCH_FIELDS:
            setattr(existing, key, value)

    # Re-validation post-fusion
    _validate_kind_category_consistency(existing)
    _validate_structuration_type(existing)
    _validate_kind_specific_fields(existing)
    _validate_unicity(repository, existing, exclude_uuid=uuid)

    logger.info(
        "Patching stock catalog item uuid=%s fields=%s",
        uuid,
        list(partial_data.keys()),
    )
    return repository.update(existing)


def soft_delete_item(repository: IStockCatalogRepository, uuid: str) -> bool:
    """Désactive un item (is_active=False). Refusé si référencé par un FsecAssemblyItem."""
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("StockCatalogItem", uuid)

    if repository.is_referenced_by_assembly(uuid):
        raise ValidationException(
            ERROR_CODE_CATALOG_ITEM_IN_USE,
            "Cet item est référencé par un tableau récap FSEC, suppression impossible.",
        )

    logger.info("Soft-deleting stock catalog item uuid=%s", uuid)
    if not repository.soft_delete(uuid):
        raise NotFoundException("StockCatalogItem", uuid)
    return True
