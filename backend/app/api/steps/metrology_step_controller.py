"""Controller MetrologyStep - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.shared.base_step_controller import BaseStepController
from app.api.steps.serializers import MetrologyStepSerializer
from app.domain.steps.services.steps_service import get_steps_by_fsec_version_id
from app.mapper.steps.metrology_step_mapper import (
    metrology_step_mapper_api_to_bean,
    metrology_step_mapper_bean_to_api,
)
from app.repository.steps.repositories.metrology_step_repository import (
    MetrologyStepRepository,
)


class MetrologyStepController(BaseStepController):
    """Controller REST pour les étapes de métrologie."""

    repository_class = MetrologyStepRepository
    step_name = "MetrologyStep"
    serializer_class = MetrologyStepSerializer
    mapper_api_to_bean = staticmethod(metrology_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(metrology_step_mapper_bean_to_api)

    @action(detail=False, methods=["get"], url_path="fsec/(?P<fsec_version_id>[^/.]+)")
    def list_by_fsec(self, request, fsec_version_id=None):
        """Liste toutes les étapes de métrologie d'un FSEC."""
        beans = get_steps_by_fsec_version_id(self.repository, fsec_version_id)
        return JsonResponse(
            [self.mapper_bean_to_api(b) for b in beans],
            safe=False,
            encoder=DjangoJSONEncoder,
        )
