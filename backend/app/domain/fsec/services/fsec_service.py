"""Service FSEC - Logique métier pure."""

import logging
from typing import Any, Dict, List, Optional

from app.domain.campaign.interface.campaign_repository import ICampaignRepository
from app.domain.exceptions import ConflictException, NotFoundException
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.services.fa_service import regenerate_fa_identifiers_for_fsec
from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.stock.interface.catalog_repository import IStockCatalogRepository
from app.domain.stock.interface.fsec_assembly_repository import (
    IFsecAssemblyItemRepository,
)
from app.domain.stock.services.element_lifecycle_service import (
    sync_element_statuses_for_fsec,
)

logger = logging.getLogger(__name__)


def _maybe_sync_stock_after_status_change(
    fsec_uuid: str,
    old_status_id: Optional[int],
    new_status_id: Optional[int],
    stock_catalog_repository: Optional[IStockCatalogRepository],
    stock_assembly_repository: Optional[IFsecAssemblyItemRepository],
) -> None:
    """Déclenche le couplage Stock ↔ FSEC si le statut a effectivement changé.

    Voir CDC §4.2. Aucun effet si l'un des deux repositories Stock est absent
    (compatibilité avec les appels qui ne fournissent pas l'orchestration Stock,
    ex. tests unitaires FSEC purs).
    """
    if (
        stock_catalog_repository is None
        or stock_assembly_repository is None
        or new_status_id is None
        or old_status_id == new_status_id
    ):
        return
    sync_element_statuses_for_fsec(
        stock_catalog_repository,
        stock_assembly_repository,
        fsec_uuid,
        new_status_id,
    )


def _maybe_regenerate_fa_identifiers(
    fa_repository: Optional[IFaRepository],
    campaign_repository: Optional[ICampaignRepository],
    fsec: FsecBean,
    context_changed: bool,
) -> None:
    """Réaligne l'identifiant des FA quand le contexte (nom/campagne) de la FSEC change.

    Le « nom » d'une FA est son identifiant, qui encode (année, campagne, nom
    FSEC, séquence) : il doit suivre un renommage ou un changement de campagne de
    la FSEC parente. Sans repos FA/campagne (ex. tests unitaires FSEC purs) ou
    sans campagne rattachée, aucun effet.
    """
    if (
        not context_changed
        or fa_repository is None
        or campaign_repository is None
        or not fsec.campaign_id
    ):
        return
    campaign = campaign_repository.get_by_uuid(fsec.campaign_id)
    if campaign is None:
        return
    regenerate_fa_identifiers_for_fsec(
        fa_repository, fsec.version_uuid, campaign.name, fsec.name, campaign.year
    )


def create_fsec(repository: IFsecRepository, bean: FsecBean) -> FsecBean:
    """Crée un nouveau FSEC après validation."""
    if bean.campaign_id:
        if repository.exists_by_campaign_and_name(bean.campaign_id, bean.name):
            raise ConflictException(
                "campaign_id/name", f"{bean.campaign_id}/{bean.name}"
            )
    else:
        if repository.exists_by_name(bean.name):
            raise ConflictException("name", bean.name)
    result = repository.create(bean)
    logger.info(f"Created FSEC version_uuid={result.version_uuid}, name={result.name}")
    return result


def get_fsec_by_version_uuid(
    repository: IFsecRepository, version_uuid: str
) -> FsecBean:
    """Récupère un FSEC par son version_uuid (PK)."""
    bean = repository.get_by_version_uuid(version_uuid)
    if bean is None:
        raise NotFoundException("FSEC", version_uuid)
    return bean


def get_fsec_by_slug(repository: IFsecRepository, slug: str) -> FsecBean:
    """Récupère un FSEC par son slug d'URL."""
    bean = repository.get_by_slug(slug)
    if bean is None:
        raise NotFoundException("FSEC", slug)
    return bean


def get_fsec_versions(repository: IFsecRepository, fsec_uuid: str) -> List[FsecBean]:
    """Récupère toutes les versions d'un FSEC."""
    return repository.get_by_fsec_uuid(fsec_uuid)


def get_active_fsec(repository: IFsecRepository, fsec_uuid: str) -> FsecBean:
    """Récupère la version active d'un FSEC."""
    bean = repository.get_active_by_fsec_uuid(fsec_uuid)
    if bean is None:
        raise NotFoundException("FSEC (active)", fsec_uuid)
    return bean


def get_all_fsecs(
    repository: IFsecRepository, limit: int = None, offset: int = 0
) -> List[FsecBean]:
    """Récupère tous les FSECs."""
    return repository.get_all(limit=limit, offset=offset)


def count_all_fsecs(repository: IFsecRepository) -> int:
    """Retourne le nombre total de FSECs."""
    return repository.count_all()


def get_all_active_fsecs(repository: IFsecRepository) -> List[FsecBean]:
    """Récupère tous les FSECs actifs."""
    return repository.get_all_active()


def get_fsecs_by_campaign(
    repository: IFsecRepository, campaign_id: str
) -> List[FsecBean]:
    """Récupère tous les FSECs d'une campagne."""
    return repository.get_by_campaign_id(campaign_id)


def update_fsec(
    repository: IFsecRepository,
    bean: FsecBean,
    stock_catalog_repository: Optional[IStockCatalogRepository] = None,
    stock_assembly_repository: Optional[IFsecAssemblyItemRepository] = None,
    fa_repository: Optional[IFaRepository] = None,
    campaign_repository: Optional[ICampaignRepository] = None,
) -> FsecBean:
    """Met à jour un FSEC.

    Les paramètres `stock_*_repository` permettent au controller d'injecter le
    couplage Stock ↔ FSEC (CDC §4.2). Les paramètres `fa_repository` /
    `campaign_repository` activent le réalignement des identifiants FA quand le
    nom ou la campagne change. Tous sont optionnels pour préserver la
    rétro-compatibilité des appels existants (ex. tests unitaires FSEC purs).
    """
    existing = repository.get_by_version_uuid(bean.version_uuid)
    if existing is None:
        raise NotFoundException("FSEC", bean.version_uuid)

    old_status_id = existing.status_id

    # Les « vues demandées » (R08) ne transitent JAMAIS par le PUT global : les
    # appelants construisent des payloads partiels (stepper, infos générales…)
    # et le repository écrit chaque champ du bean. On recopie donc la valeur
    # existante pour qu'un PUT ne l'efface pas ; seule l'action PATCH dédiée
    # (patch_fsec) peut la modifier.
    bean.requested_views = existing.requested_views

    # Vérifier les doublons nom/campagne si le nom ou la campagne a changé
    name_changed = bean.name != existing.name
    campaign_changed = bean.campaign_id != existing.campaign_id
    if (name_changed or campaign_changed) and bean.campaign_id:
        if repository.exists_by_campaign_and_name(bean.campaign_id, bean.name):
            raise ConflictException(
                "campaign_id/name", f"{bean.campaign_id}/{bean.name}"
            )

    result = repository.update(bean)
    logger.info(f"Updated FSEC version_uuid={bean.version_uuid}")

    _maybe_regenerate_fa_identifiers(
        fa_repository,
        campaign_repository,
        result,
        context_changed=name_changed or campaign_changed,
    )

    _maybe_sync_stock_after_status_change(
        fsec_uuid=result.fsec_uuid,
        old_status_id=old_status_id,
        new_status_id=result.status_id,
        stock_catalog_repository=stock_catalog_repository,
        stock_assembly_repository=stock_assembly_repository,
    )
    return result


def patch_fsec(
    repository: IFsecRepository,
    version_uuid: str,
    partial_data: Dict[str, Any],
    stock_catalog_repository: Optional[IStockCatalogRepository] = None,
    stock_assembly_repository: Optional[IFsecAssemblyItemRepository] = None,
) -> FsecBean:
    """Met à jour partiellement un FSEC (PATCH).

    Args:
        repository: Le repository FSEC
        version_uuid: Version UUID du FSEC
        partial_data: Dictionnaire des champs à mettre à jour
        stock_catalog_repository: Optionnel — déclenche le couplage Stock (CDC §4.2)
        stock_assembly_repository: Optionnel — idem

    Returns:
        Le bean FSEC mis à jour

    Raises:
        NotFoundException: Si le FSEC n'existe pas
        ConflictException: Si le nom/campagne résultant est en conflit
    """
    existing = repository.get_by_version_uuid(version_uuid)
    if existing is None:
        raise NotFoundException("FSEC", version_uuid)

    # Champs protégés qui ne peuvent pas être modifiés via PATCH
    protected_fields = {
        "version_uuid",
        "fsec_uuid",
        "created_at",
        "last_updated",
        "is_active",
    }

    # Sauvegarde des anciennes valeurs pour vérification de conflit / couplage stock
    old_name = existing.name
    old_campaign_id = existing.campaign_id
    old_status_id = existing.status_id

    # Fusion des données
    for key, value in partial_data.items():
        if key in protected_fields:
            continue
        if hasattr(existing, key):
            setattr(existing, key, value)

    # Vérification conflit nom/campagne APRÈS fusion
    name_changed = existing.name != old_name
    campaign_changed = existing.campaign_id != old_campaign_id
    if (name_changed or campaign_changed) and existing.campaign_id:
        if repository.exists_by_campaign_and_name(existing.campaign_id, existing.name):
            raise ConflictException(
                "campaign_id/name", f"{existing.campaign_id}/{existing.name}"
            )

    result = repository.update(existing)

    _maybe_sync_stock_after_status_change(
        fsec_uuid=result.fsec_uuid,
        old_status_id=old_status_id,
        new_status_id=result.status_id,
        stock_catalog_repository=stock_catalog_repository,
        stock_assembly_repository=stock_assembly_repository,
    )
    return result


def delete_fsec(repository: IFsecRepository, version_uuid: str) -> bool:
    """Supprime un FSEC."""
    if not repository.delete(version_uuid):
        raise NotFoundException("FSEC", version_uuid)
    logger.info(f"Deleted FSEC version_uuid={version_uuid}")
    return True


def set_fsec_overview_image(
    repository: IFsecRepository,
    version_uuid: str,
    image_file: Optional[Any],
) -> FsecBean:
    """Remplace (image_file != None) ou supprime (image_file is None) la photo
    de vue d'ensemble d'un FSEC.
    """
    bean = repository.set_overview_image(version_uuid, image_file)
    if bean is None:
        raise NotFoundException("FSEC", version_uuid)
    action = "set" if image_file is not None else "cleared"
    logger.info(f"Overview image {action} for FSEC version_uuid={version_uuid}")
    return bean


def set_fsec_assembly_plan_image(
    repository: IFsecRepository,
    version_uuid: str,
    image_file: Optional[Any],
) -> FsecBean:
    """Remplace (image_file != None) ou supprime (image_file is None) l'image du
    plan d'assemblage. La suppression vide aussi le calque d'annotations.
    """
    bean = repository.set_assembly_plan_image(version_uuid, image_file)
    if bean is None:
        raise NotFoundException("FSEC", version_uuid)
    action = "set" if image_file is not None else "cleared"
    logger.info(f"Assembly plan image {action} for FSEC version_uuid={version_uuid}")
    return bean


def set_fsec_assembly_plan_annotations(
    repository: IFsecRepository,
    version_uuid: str,
    annotations: Any,
) -> FsecBean:
    """Remplace le calque d'annotations du plan d'assemblage (sémantique PUT)."""
    bean = repository.set_assembly_plan_annotations(version_uuid, annotations)
    if bean is None:
        raise NotFoundException("FSEC", version_uuid)
    logger.info(
        f"Assembly plan annotations set ({len(annotations or [])} items) "
        f"for FSEC version_uuid={version_uuid}"
    )
    return bean


def create_new_version(
    repository: IFsecRepository, fsec_uuid: str, new_bean: FsecBean
) -> FsecBean:
    """Crée une nouvelle version d'un FSEC existant.

    Désactive toutes les versions existantes et crée la nouvelle version active.
    L'atomicité est garantie par le repository (select_for_update + transaction unique).
    """
    result = repository.create_version_atomic(fsec_uuid, new_bean)
    logger.info(
        f"Created new version for fsec_uuid={fsec_uuid}, new version_uuid={result.version_uuid}"
    )
    return result
