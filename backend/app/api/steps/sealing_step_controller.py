"""Controller SealingStep - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.shared.base_step_controller import BaseStepController
from app.api.steps.serializers import SealingStepSerializer
from app.mapper.steps.sealing_step_mapper import (
    sealing_step_mapper_api_to_bean,
    sealing_step_mapper_bean_to_api,
)
from app.repository.steps.repositories.sealing_step_repository import (
    SealingStepRepository,
)


class SealingStepController(BaseStepController):
    """Controller REST pour l'étape de scellement."""

    repository_class = SealingStepRepository
    step_name = "SealingStep"
    serializer_class = SealingStepSerializer
    mapper_api_to_bean = staticmethod(sealing_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(sealing_step_mapper_bean_to_api)

    @action(
        detail=False,
        methods=["get"],
        url_path="metrology/(?P<metrology_step_id>[^/.]+)",
    )
    def get_by_metrology(self, request, metrology_step_id=None):
        """Récupère l'étape de scellement liée à une métrologie (null si inexistante)."""
        bean = self.repository.get_by_metrology_step_id(metrology_step_id)
        if bean is None:
            return JsonResponse(None, safe=False, encoder=DjangoJSONEncoder)
        return JsonResponse(self.mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)
