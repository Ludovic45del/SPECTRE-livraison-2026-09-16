"""Base controller for step entities (non-gas steps).

Provides generic CRUD for step entities. Subclasses only add their
list action (list_by_fsec, list_by_metrology, etc.).
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.viewsets import ViewSet

from app.domain.exceptions import InvalidDataException
from app.domain.steps.services.steps_service import (
    create_step,
    delete_step,
    get_step_by_uuid,
    update_step,
)


class BaseStepController(ViewSet):
    """Generic step controller.

    Subclasses must set:
        repository_class   – Repository class to instantiate
        step_name          – Name for error messages
        mapper_api_to_bean – callable(dict) -> Bean
        mapper_bean_to_api – callable(Bean) -> dict
        serializer_class   – DRF Serializer class for input validation
    """

    lookup_field = "uuid"
    repository_class = None
    step_name = ""
    mapper_api_to_bean = None
    mapper_bean_to_api = None
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
        bean = get_step_by_uuid(self.repository, uuid, self.step_name)
        return JsonResponse(self.mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        validated = self._validate(request.data)
        bean = self.mapper_api_to_bean(validated)
        result = create_step(self.repository, bean)
        return JsonResponse(
            self.mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        validated = self._validate(data)
        bean = self.mapper_api_to_bean(validated)
        result = update_step(self.repository, bean, self.step_name)
        return JsonResponse(self.mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        delete_step(self.repository, uuid, self.step_name)
        return HttpResponse(status=204)
