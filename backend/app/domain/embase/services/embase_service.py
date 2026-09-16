"""Service Embase - Logique métier pour les Embases à gaz."""

import logging
from typing import Any, Dict, List, Optional

from app.domain.embase.interface.embase_repository import IEmbaseRepository
from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.embase_constants import (
    PROTECTED_FIELDS,
    VALID_EMBASE_TYPES,
)
from app.domain.embase.models.fsec_history_bean import FsecHistoryEntryBean
from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)

logger = logging.getLogger(__name__)


def get_fsec_history(
    repository: IEmbaseRepository, embase_uuid: str
) -> List[FsecHistoryEntryBean]:
    """Retourne l'historique des FSECs dans lesquels une embase a été utilisée.

    Raises:
        NotFoundException: Si l'embase n'existe pas.
    """
    bean = repository.get_by_uuid(embase_uuid)
    if bean is None:
        raise NotFoundException("Embase", embase_uuid)
    return repository.get_fsec_history(embase_uuid)


def get_embase_by_uuid(repository: IEmbaseRepository, uuid: str) -> EmbaseBean:
    """Récupère une Embase par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("Embase", uuid)
    return bean


def get_embase_by_slug(repository: IEmbaseRepository, slug: str) -> EmbaseBean:
    """Récupère une Embase par son slug d'URL."""
    bean = repository.get_by_slug(slug)
    if bean is None:
        raise NotFoundException("Embase", slug)
    return bean


def get_all_embases(
    repository: IEmbaseRepository, limit: Optional[int] = None, offset: int = 0
) -> List[EmbaseBean]:
    """Récupère toutes les Embases."""
    return repository.get_all(limit=limit, offset=offset)


def count_all_embases(repository: IEmbaseRepository) -> int:
    """Retourne le nombre total d'Embases."""
    return repository.count_all()


def _validate_embase_type(embase_type: str) -> None:
    """Valide le type d'embase."""
    if embase_type and embase_type not in VALID_EMBASE_TYPES:
        raise ValidationException(
            "type",
            f"Type '{embase_type}' invalide. Types valides : {', '.join(sorted(VALID_EMBASE_TYPES))}",
        )


def create_embase(repository: IEmbaseRepository, bean: EmbaseBean) -> EmbaseBean:
    """Crée une nouvelle Embase après validation.

    Raises:
        ConflictException: Si une Embase existe déjà avec cet identifiant
        ValidationException: Si le type est invalide
    """
    _validate_embase_type(bean.type)

    if repository.exists_by_identifier(bean.identifier):
        raise ConflictException("identifier", bean.identifier)

    result = repository.create(bean)
    logger.info("Embase créée: %s", bean.identifier)
    return result


def update_embase(repository: IEmbaseRepository, bean: EmbaseBean) -> EmbaseBean:
    """Met à jour une Embase existante."""
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("Embase", bean.uuid)

    _validate_embase_type(bean.type)

    # Vérifier l'unicité de l'identifiant si modifié
    has_key_changed = bean.identifier != existing.identifier
    if has_key_changed:
        if repository.exists_duplicate(bean.uuid, bean.identifier):
            raise ConflictException("identifier", bean.identifier)

    result = repository.update(bean)
    logger.info("Embase mise à jour: %s", bean.uuid)
    return result


ALLOWED_PATCH_FIELDS = {
    "identifier",
    "type",
    "nombre_voies",
    "soufflet_v1",
    "capteur_v1",
    "offset_v1_mv",
    "mesurande_lie_v1_mv",
    "sensibilite_v1_mv",
    "signal_meteociel_v1_mv",
    "capteur_cible_pfeiffer_mbar",
    "etendue_v1_mbar",
    "test_etancheite_he",
    "test_capteur_mrg",
    "etalonnage_date",
    "observations_v1",
    "operationnelle_aimant",
    "operationnelle_broche",
    "localisation_actuelle",
    "cote_ve",
    "decalage_angulaire",
    "chargement_mcc",
    "soufflet_v2",
    "capteur_v2",
    "offset_v2_mv",
    "mesurande_lie_v2_mv",
    "sensibilite_v2_mv",
    "signal_meteociel_v2_mv",
    "capteur_cible_pfeiffer_v2_mbar",
    "etendue_v2_mbar",
    "test_etancheite_he_v2",
    "test_capteur_mrg_v2",
    "observations_v2",
    "electrovanne",
    "fsec_history",
} - PROTECTED_FIELDS


def patch_embase(
    repository: IEmbaseRepository, uuid: str, partial_data: Dict[str, Any]
) -> EmbaseBean:
    """Met à jour partiellement une Embase (PATCH)."""
    existing_bean = repository.get_by_uuid(uuid)
    if existing_bean is None:
        raise NotFoundException("Embase", uuid)

    old_identifier = existing_bean.identifier

    for key, value in partial_data.items():
        if key not in ALLOWED_PATCH_FIELDS:
            continue
        if hasattr(existing_bean, key):
            setattr(existing_bean, key, value)

    # Valider le type si modifié
    _validate_embase_type(existing_bean.type)

    # Vérifier l'unicité de l'identifiant si modifié
    if existing_bean.identifier != old_identifier:
        if repository.exists_duplicate(uuid, existing_bean.identifier):
            raise ConflictException("identifier", existing_bean.identifier)

    logger.info("Embase patchée: %s", uuid)
    return repository.update(existing_bean)


def delete_embase(repository: IEmbaseRepository, uuid: str) -> bool:
    """Supprime une Embase."""
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("Embase", uuid)
    repository.delete(uuid)
    logger.info("Embase supprimée: %s", uuid)
    return True
