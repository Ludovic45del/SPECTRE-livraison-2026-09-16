"""Controller FsecTeams - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.decorators import action

from app.api.fsec.serializers import FsecTeamsSerializer
from app.api.shared.base_child_controller import BaseChildController
from app.domain.fsec.services.fsec_teams_service import (
    create_fsec_team_member,
    delete_fsec_team_member,
    get_fsec_team_member_by_uuid,
    get_fsec_team_members,
    update_fsec_team_member,
)
from app.mapper.fsec.fsec_teams_mapper import (
    fsec_teams_mapper_api_to_bean,
    fsec_teams_mapper_bean_to_api,
)
from app.repository.fsec.repositories.fsec_teams_repository import FsecTeamsRepository


class FsecTeamsController(BaseChildController):
    """Controller REST pour les équipes FSEC."""

    repository_class = FsecTeamsRepository
    serializer_class = FsecTeamsSerializer
    mapper_api_to_bean = staticmethod(fsec_teams_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(fsec_teams_mapper_bean_to_api)
    service_get = staticmethod(get_fsec_team_member_by_uuid)
    service_create = staticmethod(create_fsec_team_member)
    service_update = staticmethod(update_fsec_team_member)
    service_delete = staticmethod(delete_fsec_team_member)

    @action(detail=False, methods=["get"], url_path="fsec/(?P<fsec_id>[^/.]+)")
    def list_by_fsec(self, request, fsec_id=None):
        """Liste tous les membres d'une équipe FSEC."""
        beans = get_fsec_team_members(self.repository, fsec_id)
        result = [self.mapper_bean_to_api(b) for b in beans]
        return JsonResponse(result, safe=False, encoder=DjangoJSONEncoder)
