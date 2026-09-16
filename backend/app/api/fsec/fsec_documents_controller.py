"""Controller FsecDocuments - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.fsec.serializers import FsecDocumentsSerializer
from app.api.shared.base_child_controller import BaseChildController
from app.domain.fsec.services.fsec_documents_service import (
    create_fsec_document,
    delete_fsec_document,
    get_fsec_document_by_uuid,
    get_fsec_documents,
    update_fsec_document,
)
from app.mapper.fsec.fsec_documents_mapper import (
    fsec_documents_mapper_api_to_bean,
    fsec_documents_mapper_bean_to_api,
)
from app.repository.fsec.repositories.fsec_documents_repository import (
    FsecDocumentsRepository,
)


class FsecDocumentsController(BaseChildController):
    """Controller REST pour les documents FSEC."""

    repository_class = FsecDocumentsRepository
    serializer_class = FsecDocumentsSerializer
    mapper_api_to_bean = staticmethod(fsec_documents_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(fsec_documents_mapper_bean_to_api)
    service_get = staticmethod(get_fsec_document_by_uuid)
    service_create = staticmethod(create_fsec_document)
    service_update = staticmethod(update_fsec_document)
    service_delete = staticmethod(delete_fsec_document)

    @action(detail=False, methods=["get"], url_path="fsec/(?P<fsec_id>[^/.]+)")
    def list_by_fsec(self, request, fsec_id=None):
        """Liste tous les documents d'un FSEC."""
        beans = get_fsec_documents(self.repository, fsec_id)
        result = [self.mapper_bean_to_api(b) for b in beans]
        return JsonResponse(result, safe=False, encoder=DjangoJSONEncoder)
