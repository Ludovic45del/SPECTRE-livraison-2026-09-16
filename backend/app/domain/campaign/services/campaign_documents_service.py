"""Service CampaignDocuments - Logique métier pure."""

import logging
from typing import List

from app.domain.campaign.interface.campaign_repository import (
    ICampaignDocumentsRepository,
    ICampaignRepository,
)
from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.domain.exceptions import ConflictException, NotFoundException

logger = logging.getLogger(__name__)


def create_campaign_document(
    repository: ICampaignDocumentsRepository,
    bean: CampaignDocumentsBean,
    campaign_repository: ICampaignRepository,
) -> CampaignDocumentsBean:
    """Crée un nouveau document.

    Args:
        repository: Le repository CampaignDocuments
        bean: Le bean à créer
        campaign_repository: Repository Campaign (optionnel, pour vérifier l'existence du parent)

    Raises:
        NotFoundException: Si la campagne parente n'existe pas
    """
    if campaign_repository is not None and bean.campaign_uuid:
        if campaign_repository.get_by_uuid(bean.campaign_uuid) is None:
            raise NotFoundException("Campaign", bean.campaign_uuid)

    # Vérifier qu'un document avec le même nom n'existe pas déjà dans la même campagne
    if bean.campaign_uuid:
        existing_docs = repository.get_by_campaign_uuid(bean.campaign_uuid)
        for doc in existing_docs:
            if doc.name == bean.name:
                raise ConflictException(
                    "name",
                    f"Le document '{bean.name}' existe déjà dans cette campagne",
                )

    logger.info(f"Creating campaign document for campaign_uuid={bean.campaign_uuid}")
    result = repository.create(bean)
    logger.info(f"Created campaign document uuid={result.uuid}")
    return result


def get_campaign_document_by_uuid(
    repository: ICampaignDocumentsRepository, uuid: str
) -> CampaignDocumentsBean:
    """Récupère un document par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("CampaignDocument", uuid)
    return bean


def get_campaign_documents(
    repository: ICampaignDocumentsRepository, campaign_uuid: str
) -> List[CampaignDocumentsBean]:
    """Récupère tous les documents d'une campagne."""
    return repository.get_by_campaign_uuid(campaign_uuid)


def update_campaign_document(
    repository: ICampaignDocumentsRepository, bean: CampaignDocumentsBean
) -> CampaignDocumentsBean:
    """Met à jour un document."""
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("CampaignDocument", bean.uuid)
    logger.info(f"Updating campaign document uuid={bean.uuid}")
    return repository.update(bean)


def delete_campaign_document(
    repository: ICampaignDocumentsRepository, uuid: str
) -> bool:
    """Supprime un document."""
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("CampaignDocument", uuid)
    logger.info(f"Deleting campaign document uuid={uuid}")
    if not repository.delete(uuid):
        raise NotFoundException("CampaignDocument", uuid)
    logger.info(f"Deleted campaign document uuid={uuid}")
    return True
