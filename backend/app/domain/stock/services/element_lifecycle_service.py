"""Service ElementLifecycle — cycle de vie des éléments sérialisés.

Implémente la logique CDC §4.1 et §4.2 :
- Transitions dispo ↔ reservee ↔ affectee → tiree (irréversible).
- Couplage automatique entre changement de statut FSEC et statuts éléments
  associés via le tableau récap.

Ce service est consommé par :
- `fsec_assembly_service` lors de l'ajout/suppression de lignes (reserve/release).
- `fsec_service.patch_fsec` lors d'un changement de status_id de la FSEC (sync).
"""

import logging
from typing import Optional

from app.domain.exceptions import ConflictException, NotFoundException
from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.interface.fsec_assembly_repository import (
    IFsecAssemblyItemRepository,
)
from app.domain.stock.models.stock_constants import (
    ELEMENT_STATUS_AFFECTEE,
    ELEMENT_STATUS_BY_FSEC_STATUS,
    ELEMENT_STATUS_DISPO,
    ELEMENT_STATUS_RESERVEE,
    ELEMENT_STATUS_TIREE,
    ERROR_CODE_ELEMENT_ALREADY_USED,
    ITEM_KIND_ELEMENT,
)

logger = logging.getLogger(__name__)


def reserve_element(
    catalog_repository: IStockCatalogRepository,
    assembly_repository: IFsecAssemblyItemRepository,
    catalog_item_uuid: str,
    fsec_uuid: str,
    fsec_name: Optional[str] = None,
) -> None:
    """Tente de réserver un élément sur une FSEC.

    Règles (cf. CDC §4.2) :
    - Si l'élément n'existe pas → NotFoundException.
    - Si l'élément n'est PAS un kind=element → on ne fait rien (c'est un consommable).
    - Si déjà sur cette même FSEC (peu importe le statut) → no-op.
    - Si déjà réservé/affecté/tiré sur une AUTRE FSEC → ConflictException ELEMENT_ALREADY_USED.
    - Sinon → status passe à 'reservee' et `fsec_name` est renseigné avec le nom
      de la FSEC (cohérence affichage stock — cf. R09).
    """
    item = catalog_repository.get_by_uuid(catalog_item_uuid)
    if item is None:
        raise NotFoundException("StockCatalogItem", catalog_item_uuid)

    if item.kind != ITEM_KIND_ELEMENT:
        # Pas applicable aux consommables : pas de réservation, pas de blocage.
        return

    existing_assignment = assembly_repository.find_active_assignment_for_element(
        catalog_item_uuid
    )
    if existing_assignment is not None and existing_assignment.fsec_uuid != fsec_uuid:
        raise ConflictException(
            ERROR_CODE_ELEMENT_ALREADY_USED,
            f"L'élément '{item.name}' est déjà utilisé par une autre FSEC.",
        )

    # Si le status est déjà reservee/affectee/tiree sur cette même FSEC, on ne touche pas.
    if item.status in (
        ELEMENT_STATUS_RESERVEE,
        ELEMENT_STATUS_AFFECTEE,
        ELEMENT_STATUS_TIREE,
    ):
        return

    logger.info(
        "Reserving element catalog_uuid=%s for fsec_uuid=%s",
        catalog_item_uuid,
        fsec_uuid,
    )
    fields = {"status": ELEMENT_STATUS_RESERVEE}
    if fsec_name is not None:
        fields["fsec_name"] = fsec_name
    catalog_repository.patch(catalog_item_uuid, fields)


def release_element(
    catalog_repository: IStockCatalogRepository,
    catalog_item_uuid: str,
) -> None:
    """Libère un élément (passe son statut à 'dispo').

    Règle (cf. CDC §4.2) :
    - Si status='tiree' → on ne libère JAMAIS (sécurité ; le service appelant doit
      empêcher cet appel via la vérification verrouillage FSEC).
    - Sinon → status='dispo' et `fsec_name` est vidé (cohérence affichage — cf. R09).
    """
    item = catalog_repository.get_by_uuid(catalog_item_uuid)
    if item is None:
        raise NotFoundException("StockCatalogItem", catalog_item_uuid)

    if item.kind != ITEM_KIND_ELEMENT:
        return

    if item.status == ELEMENT_STATUS_TIREE:
        # Garde-fou silencieux : status terminal, on ne change rien.
        return

    logger.info("Releasing element catalog_uuid=%s back to dispo", catalog_item_uuid)
    catalog_repository.patch(
        catalog_item_uuid, {"status": ELEMENT_STATUS_DISPO, "fsec_name": None}
    )


def sync_element_statuses_for_fsec(
    catalog_repository: IStockCatalogRepository,
    assembly_repository: IFsecAssemblyItemRepository,
    fsec_uuid: str,
    new_fsec_status_id: int,
) -> int:
    """Synchronise les statuts des éléments associés à une FSEC suite au changement
    de statut de cette FSEC (cf. CDC §4.2 et R09).

    Table de transition généralisée (ELEMENT_STATUS_BY_FSEC_STATUS,
    stock_constants.py) :
    - 0 (Design) : éléments → 'reservee' (retour en arrière du workflow) ;
    - 1..6, 9..14, 16 (statuts de travail) : éléments → 'affectee' ;
    - 7 (Tirée) : éléments → 'tiree' ;
    - 8 (HS), 15 (Décision MOE) : no-op (états de pause).

    Le statut terminal 'tiree' n'est jamais dégradé (garanti par
    update_status_for_uuids). Retourne le nombre d'éléments dont le statut a
    effectivement changé.
    """
    target_status = ELEMENT_STATUS_BY_FSEC_STATUS.get(new_fsec_status_id)
    if target_status is None:
        return 0

    catalog_uuids = assembly_repository.list_catalog_uuids_by_fsec(fsec_uuid)
    if not catalog_uuids:
        return 0

    logger.info(
        "Syncing element statuses for fsec_uuid=%s new_status_id=%s target=%s items=%s",
        fsec_uuid,
        new_fsec_status_id,
        target_status,
        len(catalog_uuids),
    )
    updated = catalog_repository.update_status_for_uuids(catalog_uuids, target_status)
    logger.info(
        "Synced %s element(s) to status=%s for fsec_uuid=%s",
        updated,
        target_status,
        fsec_uuid,
    )
    return updated
