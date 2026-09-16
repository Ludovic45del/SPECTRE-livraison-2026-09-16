"""Base controller for child entities (Documents, Teams).

Provides generic CRUD for entities that belong to a parent
(Campaign or FSEC). Subclasses only add their list_by_parent action.
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.viewsets import ViewSet

from app.core.permissions import IsReadOnlyOrOperateur
from app.domain.exceptions import InvalidDataException


class BaseChildController(ViewSet):
    permission_classes = [IsReadOnlyOrOperateur]

    """Generic child-entity controller.

    Subclasses must set:
        repository_class   – Repository to instantiate
        mapper_api_to_bean – callable(dict) -> Bean
        mapper_bean_to_api – callable(Bean) -> dict
        service_get    – callable(repo, uuid) -> Bean
        service_create – callable(repo, bean) -> Bean
        service_update – callable(repo, bean) -> Bean
        service_delete – callable(repo, uuid) -> bool
        serializer_class   – DRF Serializer class for input validation (optional)
    """

    lookup_field = "uuid"
    repository_class = None
    mapper_api_to_bean = None
    mapper_bean_to_api = None
    service_get = None
    service_create = None
    service_update = None
    service_delete = None
    serializer_class = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = self.repository_class()

    def _validate(self, data):
        """Validate input data through the serializer if configured."""
        if self.serializer_class is None:
            return data
        serializer = self.serializer_class(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        return serializer.validated_data

    def retrieve(self, request, uuid=None) -> JsonResponse:
        bean = self.service_get(self.repository, uuid)
        return JsonResponse(self.mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        validated = self._validate(request.data)
        bean = self.mapper_api_to_bean(validated)
        result = self.service_create(self.repository, bean)
        return JsonResponse(
            self.mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        validated = self._validate(data)
        bean = self.mapper_api_to_bean(validated)
        result = self.service_update(self.repository, bean)
        return JsonResponse(self.mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        self.service_delete(self.repository, uuid)
        return HttpResponse(status=204)
