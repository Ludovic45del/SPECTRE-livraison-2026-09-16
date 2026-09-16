"""Services STEPS - Logique metier pure pour les etapes FSEC."""

import logging
from typing import Any, Dict, List, Optional, TypeVar

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.steps.interface.steps_repository import IStepRepository

logger = logging.getLogger(__name__)

# Type générique pour les beans
StepBean = TypeVar("StepBean")


def create_step(repository: IStepRepository[StepBean], bean: StepBean) -> StepBean:
    """Crée une nouvelle étape.

    La plupart des steps exigent fsec_version_id.
    SealingStepBean est rattachée via metrology_step_id, PhotoViewBean via pictures_step_id.
    """
    fsec_version_id = getattr(bean, "fsec_version_id", None)
    metrology_step_id = getattr(bean, "metrology_step_id", None)
    pictures_step_id = getattr(bean, "pictures_step_id", None)
    if not fsec_version_id and not metrology_step_id and not pictures_step_id:
        raise ValidationException(
            "fsec_version_id",
            "Le champ fsec_version_id (ou metrology_step_id / pictures_step_id) est obligatoire.",
        )
    return repository.create(bean)


def get_step_by_uuid(
    repository: IStepRepository[StepBean], uuid: str, step_name: str
) -> StepBean:
    """Récupère une étape par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException(step_name, uuid)
    return bean


def get_steps_by_fsec_version_id(
    repository: IStepRepository[StepBean], fsec_version_id: str
) -> List[StepBean]:
    """Récupère les étapes d'un FSEC."""
    return repository.get_by_fsec_version_id(fsec_version_id)


def update_step(
    repository: IStepRepository[StepBean], bean: StepBean, step_name: str
) -> StepBean:
    """Met à jour une étape."""
    existing = repository.get_by_uuid(bean.uuid)  # type: ignore
    if existing is None:
        raise NotFoundException(step_name, str(getattr(bean, "uuid", "")))
    return repository.update(bean)


def delete_step(
    repository: IStepRepository[StepBean], uuid: str, step_name: str
) -> bool:
    """Supprime une étape."""
    if not repository.delete(uuid):
        raise NotFoundException(step_name, uuid)
    return True


# ============================================================================
# Opérations spécifiques
# ============================================================================


def get_sealing_by_metrology(repository, metrology_step_id: str) -> Optional[StepBean]:
    """Récupère l'étape de scellement liée à une métrologie.

    Le repository doit implémenter get_by_metrology_step_id(str).
    Retourne None si aucune étape de scellement n'est liée.
    """
    return repository.get_by_metrology_step_id(metrology_step_id)


def get_photo_views_by_pictures_step(repository, pictures_step_id: str) -> List:
    """Récupère les vues photo liées à une étape photos.

    Le repository doit implémenter get_by_pictures_step_id(str).
    """
    return repository.get_by_pictures_step_id(pictures_step_id)


def get_all_gas_steps_by_fsec(
    repositories: Dict[str, IStepRepository],
    mappers: Dict[str, Any],
    fsec_version_id: str,
) -> Dict[str, List[Dict[str, Any]]]:
    """Agrege tous les gas steps (6 types) pour une version FSEC.

    Args:
        repositories: Dict mapping step key -> repository instance
        mappers: Dict mapping step key -> bean_to_api mapper callable
        fsec_version_id: Identifiant de la version FSEC

    Returns:
        Dict avec chaque type de gas step et sa liste de steps serialises
    """
    result = {}
    for key, repo in repositories.items():
        beans = repo.get_by_fsec_version_id(fsec_version_id)
        result[key] = [mappers[key](b) for b in beans]
    return result
