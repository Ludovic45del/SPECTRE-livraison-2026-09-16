"""Controller CampaignDocuments - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.campaign.serializers import CampaignDocumentsSerializer
from app.api.shared.base_child_controller import BaseChildController
from app.domain.campaign.services.campaign_documents_service import (
    create_campaign_document,
    delete_campaign_document,
    get_campaign_document_by_uuid,
    get_campaign_documents,
    update_campaign_document,
)
from app.mapper.campaign.campaign_documents_mapper import (
    campaign_documents_mapper_api_to_bean,
    campaign_documents_mapper_bean_to_api,
)
from app.repository.campaign.repositories.campaign_documents_repository import (
    CampaignDocumentsRepository,
)
from app.repository.campaign.repositories.campaign_repository import CampaignRepository


class CampaignDocumentsController(BaseChildController):
    """Controller REST pour les documents de campagne."""

    repository_class = CampaignDocumentsRepository
    serializer_class = CampaignDocumentsSerializer
    mapper_api_to_bean = staticmethod(campaign_documents_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(campaign_documents_mapper_bean_to_api)
    service_get = staticmethod(get_campaign_document_by_uuid)
    service_create = staticmethod(create_campaign_document)
    service_update = staticmethod(update_campaign_document)
    service_delete = staticmethod(delete_campaign_document)

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
        """Liste tous les documents d'une campagne."""
        beans = get_campaign_documents(self.repository, campaign_uuid)
        result = [self.mapper_bean_to_api(b) for b in beans]
        return JsonResponse(result, safe=False, encoder=DjangoJSONEncoder)
