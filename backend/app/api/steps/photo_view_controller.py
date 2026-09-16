"""Controller PhotoView - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.shared.base_step_controller import BaseStepController
from app.api.steps.serializers import PhotoViewSerializer
from app.mapper.steps.photo_view_mapper import (
    photo_view_mapper_api_to_bean,
    photo_view_mapper_bean_to_api,
)
from app.repository.steps.repositories.photo_view_repository import PhotoViewRepository


class PhotoViewController(BaseStepController):
    """Controller REST pour les vues/photos."""

    repository_class = PhotoViewRepository
    step_name = "PhotoView"
    serializer_class = PhotoViewSerializer
    mapper_api_to_bean = staticmethod(photo_view_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(photo_view_mapper_bean_to_api)

    @action(
        detail=False,
        methods=["get"],
        url_path="pictures-step/(?P<pictures_step_id>[^/.]+)",
    )
    def list_by_pictures_step(self, request, pictures_step_id=None):
        """Récupère les vues/photos liées à un PicturesStep."""
        beans = self.repository.get_by_pictures_step_id(pictures_step_id)
        return JsonResponse(
            [self.mapper_bean_to_api(b) for b in beans],
            safe=False,
            encoder=DjangoJSONEncoder,
        )
