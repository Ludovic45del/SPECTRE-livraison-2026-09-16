"""Mapper CampaignDocuments - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.repository.campaign.models.campaign_documents_entity import (
    CampaignDocumentsEntity,
)


def campaign_documents_mapper_entity_to_bean(
    entity: CampaignDocumentsEntity,
) -> CampaignDocumentsBean:
    """Convertit une CampaignDocumentsEntity en CampaignDocumentsBean."""
    return CampaignDocumentsBean(
        uuid=str(entity.uuid),
        campaign_uuid=str(entity.campaign_uuid_id) if entity.campaign_uuid_id else "",
        subtype_id=entity.subtype_id_id if entity.subtype_id_id else None,
        file_type_id=entity.file_type_id_id if entity.file_type_id_id else None,
        name=entity.name,
        path=entity.path,
        date=entity.date,
    )


def campaign_documents_mapper_bean_to_entity(
    bean: CampaignDocumentsBean,
) -> CampaignDocumentsEntity:
    """Convertit un CampaignDocumentsBean en CampaignDocumentsEntity."""
    entity = CampaignDocumentsEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.campaign_uuid_id = bean.campaign_uuid
    entity.subtype_id_id = bean.subtype_id
    entity.file_type_id_id = bean.file_type_id
    entity.name = bean.name
    entity.path = bean.path
    entity.date = bean.date
    return entity


def campaign_documents_mapper_api_to_bean(
    data: Dict[str, Any],
) -> CampaignDocumentsBean:
    """Convertit des données API en CampaignDocumentsBean."""
    return CampaignDocumentsBean(
        uuid=data.get("uuid", ""),
        campaign_uuid=data.get("campaign_uuid", ""),
        subtype_id=data.get("subtype_id"),
        file_type_id=data.get("file_type_id"),
        name=data.get("name", ""),
        path=data.get("path", ""),
        date=data.get("date"),
    )


def campaign_documents_mapper_bean_to_api(
    bean: CampaignDocumentsBean,
) -> Dict[str, Any]:
    """Convertit un CampaignDocumentsBean en données API."""
    return {
        "uuid": bean.uuid,
        "campaign_uuid": bean.campaign_uuid,
        "subtype_id": bean.subtype_id,
        "file_type_id": bean.file_type_id,
        "name": bean.name,
        "path": bean.path,
        "date": bean.date.isoformat() if bean.date else None,
    }
