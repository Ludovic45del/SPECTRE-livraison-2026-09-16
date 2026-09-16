"""Repository CampaignTeams - Implémentation utilisant BaseChildRepository."""

from typing import List

from app.domain.campaign.interface.campaign_repository import ICampaignTeamsRepository
from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.mapper.campaign.campaign_teams_mapper import (
    campaign_teams_mapper_bean_to_entity,
    campaign_teams_mapper_entity_to_bean,
)
from app.repository.campaign.models.campaign_teams_entity import CampaignTeamsEntity
from app.repository.shared.base_child_repository import BaseChildRepository


class CampaignTeamsRepository(
    BaseChildRepository[CampaignTeamsBean, CampaignTeamsEntity],
    ICampaignTeamsRepository,
):
    """Implémentation du repository CampaignTeams utilisant BaseChildRepository.

    Hérite de toutes les méthodes (create, get_by_uuid, get_by_parent_uuid, update, delete).
    """

    entity_class = CampaignTeamsEntity
    bean_to_entity = staticmethod(campaign_teams_mapper_bean_to_entity)
    entity_to_bean = staticmethod(campaign_teams_mapper_entity_to_bean)
    parent_field = "campaign_uuid_id"
    select_related_fields = ("campaign_uuid", "role_id")

    def get_by_campaign_uuid(self, campaign_uuid: str) -> List[CampaignTeamsBean]:
        """Alias pour get_by_parent_uuid (rétro-compatibilité)."""
        return self.get_by_parent_uuid(campaign_uuid)
