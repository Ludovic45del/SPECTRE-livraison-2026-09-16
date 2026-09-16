"""Repository FsecTeams - Implémentation IFsecTeamsRepository."""

from typing import List

from app.domain.fsec.interface.fsec_repository import IFsecTeamsRepository
from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean
from app.mapper.fsec.fsec_teams_mapper import (
    fsec_teams_mapper_bean_to_entity,
    fsec_teams_mapper_entity_to_bean,
)
from app.repository.fsec.models.fsec_teams_entity import FsecTeamsEntity
from app.repository.shared.base_child_repository import BaseChildRepository


class FsecTeamsRepository(
    BaseChildRepository[FsecTeamsBean, FsecTeamsEntity], IFsecTeamsRepository
):
    """Implémentation du repository FsecTeams."""

    entity_class = FsecTeamsEntity
    bean_to_entity = staticmethod(fsec_teams_mapper_bean_to_entity)
    entity_to_bean = staticmethod(fsec_teams_mapper_entity_to_bean)
    parent_field = "fsec_id_id"
    select_related_fields = ("fsec_id", "role_id")

    def get_by_fsec_id(self, fsec_id: str) -> List[FsecTeamsBean]:
        """Récupère tous les membres d'une équipe FSEC."""
        return self.get_by_parent_uuid(fsec_id)
