"""Service FsecAssemblyItem — gestion du tableau récap d'une FSEC.

Voir CAHIER_DES_CHARGES_STOCK.md §4.2, §4.3, §5.3.
"""

import logging
from typing import Any, Dict, List, Optional

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.interface.fsec_assembly_repository import (
    IFsecAssemblyItemRepository,
)
from app.domain.stock.models.fsec_assembly_item_bean import (
    FsecAssemblyItemBean,
    FsecAssemblyItemDetailBean,
)
from app.domain.stock.models.stock_constants import (
    ELEMENT_STATUS_AFFECTEE,
    ELEMENT_STATUS_BY_FSEC_STATUS,
    ELEMENT_STATUS_TIREE,
    ERROR_CODE_FSEC_LOCKED,
    FSEC_STATUS_ID_TIREE,
    ITEM_KIND_ELEMENT,
)
from app.domain.stock.services.element_lifecycle_service import (
    release_element,
    reserve_element,
)

logger = logging.getLogger(__name__)


# Champs autorisés pour PATCH (CDC §5.3).
ALLOWED_PATCH_FIELDS = {"sort_order", "remarque"}


def _ensure_fsec_not_locked(fsec_repository: IFsecRepository, fsec_uuid: str):
    """Lève FSEC_LOCKED si la FSEC est au statut 'Tirée' (id=7) — cf. CDC §4.3.

    Retourne le FsecBean actif (utilisé par add_assembly_item pour la promotion
    immédiate du statut élément et le renseignement de fsec_name — cf. R09).
    """
    fsec = fsec_repository.get_active_by_fsec_uuid(fsec_uuid)
    if fsec is None:
        raise NotFoundException("Fsec", fsec_uuid)
    if fsec.status_id == FSEC_STATUS_ID_TIREE:
        raise ConflictException(
            ERROR_CODE_FSEC_LOCKED,
            "Le tableau récap est verrouillé : la FSEC est tirée.",
        )
    return fsec


def list_assembly_items_by_fsec(
    assembly_repository: IFsecAssemblyItemRepository, fsec_uuid: str
) -> List[FsecAssemblyItemDetailBean]:
    """Liste enrichie des items du tableau récap (cf. CDC §5.3)."""
    return assembly_repository.list_by_fsec(fsec_uuid)


def get_assembly_item(
    assembly_repository: IFsecAssemblyItemRepository, uuid: str
) -> FsecAssemblyItemBean:
    """Récupère une ligne par UUID."""
    bean = assembly_repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FsecAssemblyItem", uuid)
    return bean


def add_assembly_item(
    assembly_repository: IFsecAssemblyItemRepository,
    catalog_repository: IStockCatalogRepository,
    fsec_repository: IFsecRepository,
    fsec_uuid: str,
    catalog_item_uuid: str,
    sort_order: int = 0,
    remarque: Optional[str] = None,
) -> FsecAssemblyItemBean:
    """Ajoute une ligne au tableau récap (CDC §5.3).

    - Refuse si FSEC verrouillée (FSEC_LOCKED).
    - Pour kind=element : refuse si la paire (fsec_uuid, catalog_item) est déjà
      présente (anti-doublon), déclenche reserve_element (peut lever
      ELEMENT_ALREADY_USED), puis promotion immédiate en 'affectee' si le statut
      de la FSEC l'exige déjà (assemblage engagé — cf. R09).
    - Pour kind=consumable : pas de réservation ni d'anti-doublon — un même
      consommable peut apparaître sur plusieurs lignes (cf. R20).
    """
    fsec = _ensure_fsec_not_locked(fsec_repository, fsec_uuid)

    # Vérifie l'existence du catalog_item (NotFoundException claire si absent)
    catalog_item = catalog_repository.get_by_uuid(catalog_item_uuid)
    if catalog_item is None:
        raise NotFoundException("StockCatalogItem", catalog_item_uuid)

    if catalog_item.kind == ITEM_KIND_ELEMENT:
        # Anti-doublon — éléments sérialisés uniquement : un consommable peut
        # être ajouté plusieurs fois (remarques distinctes par ligne — R20).
        # L'unicité inter-FSEC des éléments reste garantie par reserve_element.
        if assembly_repository.exists_by_fsec_and_catalog(fsec_uuid, catalog_item_uuid):
            raise ConflictException(
                "fsec_uuid/catalog_item_uuid",
                f"{fsec_uuid}/{catalog_item_uuid}",
            )

        # Réservation (peut lever ELEMENT_ALREADY_USED si déjà sur une autre FSEC)
        # + renseignement du fsec_name affiché côté stock (R09).
        reserve_element(
            catalog_repository,
            assembly_repository,
            catalog_item_uuid,
            fsec_uuid,
            fsec_name=fsec.name,
        )

        # Promotion immédiate : si la FSEC est déjà engagée dans l'assemblage
        # (statut de travail → cible 'affectee'), l'élément ne doit pas rester
        # 'reservee' indéfiniment (R09). Les états Design/pause (0, 8, 15)
        # laissent l'élément 'reservee' ; 'tiree' est inatteignable ici (FSEC
        # verrouillée) et jamais dégradé par update_status_for_uuids.
        if ELEMENT_STATUS_BY_FSEC_STATUS.get(fsec.status_id) == ELEMENT_STATUS_AFFECTEE:
            catalog_repository.update_status_for_uuids(
                [catalog_item_uuid], ELEMENT_STATUS_AFFECTEE
            )

    bean = FsecAssemblyItemBean(
        fsec_uuid=fsec_uuid,
        catalog_item_uuid=catalog_item_uuid,
        sort_order=sort_order,
        remarque=remarque,
    )
    logger.info(
        "Adding assembly item fsec_uuid=%s catalog_uuid=%s",
        fsec_uuid,
        catalog_item_uuid,
    )
    return assembly_repository.create(bean)


def patch_assembly_item(
    assembly_repository: IFsecAssemblyItemRepository,
    fsec_repository: IFsecRepository,
    uuid: str,
    partial_data: Dict[str, Any],
) -> FsecAssemblyItemBean:
    """Met à jour partiellement une ligne (sort_order, remarque uniquement)."""
    existing = assembly_repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("FsecAssemblyItem", uuid)

    _ensure_fsec_not_locked(fsec_repository, existing.fsec_uuid)

    # Filtrer les champs hors whitelist
    sanitized = {k: v for k, v in partial_data.items() if k in ALLOWED_PATCH_FIELDS}
    logger.info(
        "Patching assembly item uuid=%s fields=%s",
        uuid,
        list(sanitized.keys()),
    )
    return assembly_repository.patch(uuid, sanitized)


def remove_assembly_item(
    assembly_repository: IFsecAssemblyItemRepository,
    catalog_repository: IStockCatalogRepository,
    fsec_repository: IFsecRepository,
    uuid: str,
) -> bool:
    """Supprime une ligne du tableau récap (CDC §5.3).

    - Refuse si FSEC verrouillée (FSEC_LOCKED).
    - Si l'élément associé est tiré → refuse aussi (déjà couvert par FSEC_LOCKED
      en pratique, mais double sécurité).
    - Sinon : libère l'élément (status → dispo) puis supprime la ligne.
    """
    existing = assembly_repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("FsecAssemblyItem", uuid)

    _ensure_fsec_not_locked(fsec_repository, existing.fsec_uuid)

    # Vérification supplémentaire sur le status d'élément (pour les éléments)
    catalog_item = catalog_repository.get_by_uuid(existing.catalog_item_uuid)
    if catalog_item is not None and catalog_item.status == ELEMENT_STATUS_TIREE:
        raise ValidationException(
            "status",
            "Impossible de supprimer une ligne dont l'élément a déjà été tiré.",
        )

    # Libération de l'élément avant suppression de la ligne
    if catalog_item is not None:
        release_element(catalog_repository, existing.catalog_item_uuid)

    logger.info("Removing assembly item uuid=%s", uuid)
    if not assembly_repository.delete(uuid):
        raise NotFoundException("FsecAssemblyItem", uuid)
    return True
