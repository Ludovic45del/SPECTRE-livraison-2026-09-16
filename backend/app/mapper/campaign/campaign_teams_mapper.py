"""Mapper CampaignTeams - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.repository.campaign.models.campaign_teams_entity import CampaignTeamsEntity


def _user_uuid(entity: CampaignTeamsEntity):
    raw = getattr(entity, "user_id", None)
    return str(raw) if raw else None


def campaign_teams_mapper_entity_to_bean(
    entity: CampaignTeamsEntity,
) -> CampaignTeamsBean:
    """Convertit une CampaignTeamsEntity en CampaignTeamsBean."""
    return CampaignTeamsBean(
        uuid=str(entity.uuid),
        campaign_uuid=str(entity.campaign_uuid_id) if entity.campaign_uuid_id else "",
        role_id=entity.role_id_id if entity.role_id_id is not None else None,
        name=entity.name,
        user_uuid=_user_uuid(entity),
    )


def campaign_teams_mapper_bean_to_entity(
    bean: CampaignTeamsBean,
) -> CampaignTeamsEntity:
    """Convertit un CampaignTeamsBean en CampaignTeamsEntity."""
    entity = CampaignTeamsEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.campaign_uuid_id = bean.campaign_uuid
    entity.role_id_id = bean.role_id
    entity.name = bean.name
    entity.user_id = bean.user_uuid
    return entity


def campaign_teams_mapper_api_to_bean(data: Dict[str, Any]) -> CampaignTeamsBean:
    """Convertit des données API en CampaignTeamsBean."""
    user_uuid = data.get("user_uuid")
    raw_name = data.get("name")
    return CampaignTeamsBean(
        uuid=data.get("uuid", ""),
        campaign_uuid=data.get("campaign_uuid", ""),
        role_id=data.get("role_id"),
        name=raw_name if raw_name else None,
        user_uuid=str(user_uuid) if user_uuid else None,
    )


def campaign_teams_mapper_bean_to_api(bean: CampaignTeamsBean) -> Dict[str, Any]:
    """Convertit un CampaignTeamsBean en données API."""
    return {
        "uuid": bean.uuid,
        "campaign_uuid": bean.campaign_uuid,
        "role_id": bean.role_id,
        "name": bean.name,
        "user_uuid": bean.user_uuid,
    }
