"""Service LabContact — logique métier de l'annuaire des laboratoires.

Conventions :
- Fonctions pures : le repository (interface) est toujours le premier argument,
  aucun import ORM ni contexte HTTP.
- Les erreurs métier sont levées sous forme d'exceptions domaine
  (`ValidationException`, `NotFoundException`) traduites en HTTP par le
  middleware d'erreurs (400 / 404).
"""

import logging
from typing import Any, Dict, FrozenSet, List

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.labcontact.interface.lab_contact_repository import ILabContactRepository
from app.domain.labcontact.models.lab_contact_bean import LabContactBean

logger = logging.getLogger(__name__)

# Nom de ressource utilisé dans NotFoundException → code API « LAB_CONTACT_NOT_FOUND ».
LAB_CONTACT_RESOURCE = "LAB_CONTACT"

# Longueurs maximales alignées sur l'entité (CharField) et le serializer.
LAB_CONTACT_NAME_MAX_LENGTH = 150
LAB_CONTACT_PHONE_MAX_LENGTH = 30

# Champs modifiables par PATCH : les champs techniques (uuid, created_at,
# updated_at) sont ignorés même s'ils figurent dans le payload.
LAB_CONTACT_PATCH_FIELDS: FrozenSet[str] = frozenset({"name", "phone", "comment"})


def _normalize(bean: LabContactBean) -> None:
    """Nettoie les champs texte en place (espaces parasites, None → chaîne vide)."""
    bean.name = (bean.name or "").strip()
    bean.phone = (bean.phone or "").strip()
    bean.comment = (bean.comment or "").strip()


def _validate(bean: LabContactBean) -> None:
    """Règles métier communes à la création et à la mise à jour."""
    if not bean.name:
        raise ValidationException("name", "Le nom du contact est requis")
    if len(bean.name) > LAB_CONTACT_NAME_MAX_LENGTH:
        raise ValidationException(
            "name",
            f"Le nom ne doit pas dépasser {LAB_CONTACT_NAME_MAX_LENGTH} caractères",
        )
    if len(bean.phone) > LAB_CONTACT_PHONE_MAX_LENGTH:
        raise ValidationException(
            "phone",
            f"Le téléphone ne doit pas dépasser {LAB_CONTACT_PHONE_MAX_LENGTH} caractères",
        )


def get_all_contacts(repository: ILabContactRepository) -> List[LabContactBean]:
    """Liste complète de l'annuaire (triée par nom par le repository)."""
    return repository.get_all()


def get_contact_by_uuid(repository: ILabContactRepository, uuid: str) -> LabContactBean:
    """Retourne un contact ou lève NotFoundException."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException(LAB_CONTACT_RESOURCE, uuid)
    return bean


def create_contact(
    repository: ILabContactRepository, bean: LabContactBean
) -> LabContactBean:
    """Crée un contact après normalisation et validation métier."""
    _normalize(bean)
    _validate(bean)
    result = repository.create(bean)
    logger.info("Contact labo créé: %s (%s)", result.uuid, result.name)
    return result


def update_contact(
    repository: ILabContactRepository, bean: LabContactBean
) -> LabContactBean:
    """Met à jour un contact existant (remplacement complet des champs éditables)."""
    if not bean.uuid:
        raise ValidationException(
            "uuid", "L'identifiant du contact est requis pour la mise à jour"
        )
    if repository.get_by_uuid(bean.uuid) is None:
        raise NotFoundException(LAB_CONTACT_RESOURCE, bean.uuid)
    _normalize(bean)
    _validate(bean)
    result = repository.update(bean)
    logger.info("Contact labo mis à jour: %s (%s)", result.uuid, result.name)
    return result


def patch_contact(
    repository: ILabContactRepository, uuid: str, partial_data: Dict[str, Any]
) -> LabContactBean:
    """Met à jour partiellement un contact (PATCH) : seuls les champs fournis changent.

    Les champs absents de `partial_data` conservent leur valeur ; les clés hors
    LAB_CONTACT_PATCH_FIELDS sont ignorées. Le bean fusionné est normalisé et
    validé comme pour une mise à jour complète.
    """
    if not uuid:
        raise ValidationException(
            "uuid", "L'identifiant du contact est requis pour la mise à jour"
        )
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException(LAB_CONTACT_RESOURCE, uuid)

    for key, value in partial_data.items():
        if key in LAB_CONTACT_PATCH_FIELDS:
            setattr(existing, key, value)

    _normalize(existing)
    _validate(existing)
    result = repository.update(existing)
    logger.info("Contact labo patché: %s (%s)", result.uuid, result.name)
    return result


def delete_contact(repository: ILabContactRepository, uuid: str) -> None:
    """Supprime un contact ; NotFoundException s'il n'existe pas."""
    if not repository.delete(uuid):
        raise NotFoundException(LAB_CONTACT_RESOURCE, uuid)
    logger.info("Contact labo supprimé: %s", uuid)
