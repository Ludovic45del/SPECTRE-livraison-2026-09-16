"""Service Etalonnage - Logique métier pour les étalonnages."""

import logging
from typing import List, Optional

from app.domain.embase.interface.embase_repository import IEmbaseRepository
from app.domain.embase.interface.etalonnage_repository import IEtalonnageRepository
from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.domain.embase.services.embase_sync import sync_embase_mesures
from app.domain.exceptions import (
    ConflictException,
    InvalidDataException,
    NotFoundException,
)

logger = logging.getLogger(__name__)


def get_etalonnage_by_uuid(
    repository: IEtalonnageRepository,
    uuid: str,
) -> EtalonnageBean:
    """Récupère un étalonnage par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("Etalonnage", uuid)
    return bean


def get_etalonnages_by_embase(
    repository: IEtalonnageRepository,
    embase_uuid: str,
    voie: Optional[int] = None,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[EtalonnageBean]:
    """Récupère les étalonnages d'une embase, optionnellement filtrés par voie."""
    return repository.get_by_embase_uuid_paginated(
        embase_uuid, voie=voie, limit=limit, offset=offset
    )


def count_etalonnages_by_embase(
    repository: IEtalonnageRepository,
    embase_uuid: str,
    voie: Optional[int] = None,
) -> int:
    """Retourne le nombre d'étalonnages pour une embase."""
    return repository.count_by_embase_uuid(embase_uuid, voie=voie)


def create_etalonnage(
    etalonnage_repository: IEtalonnageRepository,
    embase_repository: IEmbaseRepository,
    bean: EtalonnageBean,
) -> EtalonnageBean:
    """Crée un nouvel étalonnage."""
    # Vérifier que l'embase existe
    embase = embase_repository.get_by_uuid(bean.embase_uuid)
    if embase is None:
        raise NotFoundException("Embase", bean.embase_uuid)

    # Valider voie vs nombre_voies
    if bean.voie == 2 and embase.nombre_voies == 1:
        raise InvalidDataException(
            f"Voie 2 non disponible pour embase '{embase.identifier}' (1 voie)"
        )

    # Vérifier doublon (embase + voie + date)
    if bean.date and etalonnage_repository.exists_by_embase_voie_date(
        bean.embase_uuid, bean.voie, bean.date
    ):
        raise ConflictException(
            "embase/voie/date",
            f"{embase.identifier}/V{bean.voie}/{bean.date}",
        )

    result = etalonnage_repository.create(bean)
    logger.info(
        "Étalonnage créé: embase=%s, voie=%s, date=%s",
        bean.embase_uuid,
        bean.voie,
        bean.date,
    )

    # Synchroniser les mesures de l'embase depuis le dernier étalonnage
    sync_embase_mesures(
        etalonnage_repository, embase_repository, bean.embase_uuid, bean.voie
    )

    return result


def delete_etalonnage(
    etalonnage_repository: IEtalonnageRepository,
    embase_repository: IEmbaseRepository,
    uuid: str,
) -> bool:
    """Supprime un étalonnage et met à jour les mesures de l'embase."""
    # Récupérer l'étalonnage avant suppression pour connaître embase/voie
    etal = etalonnage_repository.get_by_uuid(uuid)
    if etal is None:
        raise NotFoundException("Etalonnage", uuid)

    if not etalonnage_repository.delete(uuid):
        raise NotFoundException("Etalonnage", uuid)

    logger.info("Étalonnage supprimé: %s", uuid)

    # Synchroniser les mesures depuis le nouvel étalonnage le plus récent
    sync_embase_mesures(
        etalonnage_repository, embase_repository, etal.embase_uuid, etal.voie
    )

    return True
