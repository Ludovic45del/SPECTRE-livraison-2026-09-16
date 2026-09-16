"""Controller PicturesStep - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.shared.base_step_controller import BaseStepController
from app.api.steps.serializers import PicturesStepSerializer
from app.domain.steps.services.steps_service import get_steps_by_fsec_version_id
from app.mapper.steps.pictures_step_mapper import (
    pictures_step_mapper_api_to_bean,
    pictures_step_mapper_bean_to_api,
)
from app.repository.steps.repositories.pictures_step_repository import (
    PicturesStepRepository,
)


class PicturesStepController(BaseStepController):
    """Controller REST pour les étapes photos."""

    repository_class = PicturesStepRepository
    step_name = "PicturesStep"
    serializer_class = PicturesStepSerializer
    mapper_api_to_bean = staticmethod(pictures_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(pictures_step_mapper_bean_to_api)

    @action(detail=False, methods=["get"], url_path="fsec/(?P<fsec_version_id>[^/.]+)")
    def list_by_fsec(self, request, fsec_version_id=None):
        """Liste toutes les étapes photos d'un FSEC."""
        beans = get_steps_by_fsec_version_id(self.repository, fsec_version_id)
        return JsonResponse(
            [self.mapper_bean_to_api(b) for b in beans],
            safe=False,
            encoder=DjangoJSONEncoder,
        )
