"""Controller CampaignTeams - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.campaign.serializers import CampaignTeamsSerializer
from app.api.shared.base_child_controller import BaseChildController
from app.domain.campaign.services.campaign_teams_service import (
    create_campaign_team_member,
    delete_campaign_team_member,
    get_campaign_team_member_by_uuid,
    get_campaign_team_members,
    update_campaign_team_member,
)
from app.mapper.campaign.campaign_teams_mapper import (
    campaign_teams_mapper_api_to_bean,
    campaign_teams_mapper_bean_to_api,
)
from app.repository.campaign.repositories.campaign_repository import CampaignRepository
from app.repository.campaign.repositories.campaign_teams_repository import (
    CampaignTeamsRepository,
)


class CampaignTeamsController(BaseChildController):
    """Controller REST pour les équipes de campagne."""

    repository_class = CampaignTeamsRepository
    serializer_class = CampaignTeamsSerializer
    mapper_api_to_bean = staticmethod(campaign_teams_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(campaign_teams_mapper_bean_to_api)
    service_get = staticmethod(get_campaign_team_member_by_uuid)
    service_create = staticmethod(create_campaign_team_member)
    service_update = staticmethod(update_campaign_team_member)
    service_delete = staticmethod(delete_campaign_team_member)

    def create(self, request) -> JsonResponse:
        validated = self._validate(request.data)
        bean = self.mapper_api_to_bean(validated)
        result = self.service_create(
            self.repository, bean, campaign_repository=CampaignRepository()
        )
        return JsonResponse(
            self.mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    @action(
        detail=False, methods=["get"], url_path="campaign/(?P<campaign_uuid>[^/.]+)"
    )
    def list_by_campaign(self, request, campaign_uuid=None):
        """Liste tous les membres d'une équipe de campagne."""
        beans = get_campaign_team_members(self.repository, campaign_uuid)
        result = [self.mapper_bean_to_api(b) for b in beans]
        return JsonResponse(result, safe=False, encoder=DjangoJSONEncoder)
