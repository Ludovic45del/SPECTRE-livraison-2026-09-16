"""Service FsecDocuments - Logique métier pure."""

import logging
from typing import List

from app.domain.exceptions import NotFoundException
from app.domain.fsec.interface.fsec_repository import (
    IFsecDocumentsRepository,
    IFsecRepository,
)
from app.domain.fsec.models.fsec_documents_bean import FsecDocumentsBean

logger = logging.getLogger(__name__)


def create_fsec_document(
    repository: IFsecDocumentsRepository,
    bean: FsecDocumentsBean,
    fsec_repository: IFsecRepository = None,
) -> FsecDocumentsBean:
    """Crée un nouveau document.

    Args:
        repository: Le repository FsecDocuments
        bean: Le bean à créer
        fsec_repository: Repository FSEC (optionnel, pour vérifier l'existence du parent)

    Raises:
        NotFoundException: Si le FSEC parent n'existe pas
    """
    if fsec_repository is not None and bean.fsec_id:
        if fsec_repository.get_by_version_uuid(bean.fsec_id) is None:
            raise NotFoundException("FSEC", bean.fsec_id)

    return repository.create(bean)


def get_fsec_document_by_uuid(
    repository: IFsecDocumentsRepository, uuid: str
) -> FsecDocumentsBean:
    """Récupère un document par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("FsecDocument", uuid)
    return bean


def get_fsec_documents(
    repository: IFsecDocumentsRepository, fsec_id: str
) -> List[FsecDocumentsBean]:
    """Récupère tous les documents d'un FSEC."""
    return repository.get_by_fsec_id(fsec_id)


def update_fsec_document(
    repository: IFsecDocumentsRepository, bean: FsecDocumentsBean
) -> FsecDocumentsBean:
    """Met à jour un document."""
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("FsecDocument", bean.uuid)
    return repository.update(bean)


def delete_fsec_document(repository: IFsecDocumentsRepository, uuid: str) -> bool:
    """Supprime un document."""
    if not repository.delete(uuid):
        raise NotFoundException("FsecDocument", uuid)
    return True
