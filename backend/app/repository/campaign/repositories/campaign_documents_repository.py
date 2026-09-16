"""Repository CampaignDocuments - Implémentation utilisant BaseChildRepository."""

from typing import List

from app.domain.campaign.interface.campaign_repository import (
    ICampaignDocumentsRepository,
)
from app.domain.campaign.models.campaign_documents_bean import CampaignDocumentsBean
from app.mapper.campaign.campaign_documents_mapper import (
    campaign_documents_mapper_bean_to_entity,
    campaign_documents_mapper_entity_to_bean,
)
from app.repository.campaign.models.campaign_documents_entity import (
    CampaignDocumentsEntity,
)
from app.repository.shared.base_child_repository import BaseChildRepository


class CampaignDocumentsRepository(
    BaseChildRepository[CampaignDocumentsBean, CampaignDocumentsEntity],
    ICampaignDocumentsRepository,
):
    """Implémentation du repository CampaignDocuments utilisant BaseChildRepository.

    Hérite de toutes les méthodes (create, get_by_uuid, get_by_parent_uuid, update, delete).
    """

    entity_class = CampaignDocumentsEntity
    bean_to_entity = staticmethod(campaign_documents_mapper_bean_to_entity)
    entity_to_bean = staticmethod(campaign_documents_mapper_entity_to_bean)
    parent_field = "campaign_uuid_id"
    select_related_fields = ("campaign_uuid", "subtype_id", "file_type_id")

    def get_by_campaign_uuid(self, campaign_uuid: str) -> List[CampaignDocumentsBean]:
        """Alias pour get_by_parent_uuid (rétro-compatibilité)."""
        return self.get_by_parent_uuid(campaign_uuid)
