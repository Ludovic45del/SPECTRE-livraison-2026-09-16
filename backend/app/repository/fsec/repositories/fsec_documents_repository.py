"""Repository FsecDocuments - Implémentation IFsecDocumentsRepository."""

from typing import List

from app.domain.fsec.interface.fsec_repository import IFsecDocumentsRepository
from app.domain.fsec.models.fsec_documents_bean import FsecDocumentsBean
from app.mapper.fsec.fsec_documents_mapper import (
    fsec_documents_mapper_bean_to_entity,
    fsec_documents_mapper_entity_to_bean,
)
from app.repository.fsec.models.fsec_documents_entity import FsecDocumentsEntity
from app.repository.shared.base_child_repository import BaseChildRepository


class FsecDocumentsRepository(
    BaseChildRepository[FsecDocumentsBean, FsecDocumentsEntity],
    IFsecDocumentsRepository,
):
    """Implémentation du repository FsecDocuments."""

    entity_class = FsecDocumentsEntity
    bean_to_entity = staticmethod(fsec_documents_mapper_bean_to_entity)
    entity_to_bean = staticmethod(fsec_documents_mapper_entity_to_bean)
    parent_field = "fsec_id_id"
    select_related_fields = ("fsec_id", "subtype_id")

    def get_by_fsec_id(self, fsec_id: str) -> List[FsecDocumentsBean]:
        """Récupère tous les documents d'un FSEC."""
        return self.get_by_parent_uuid(fsec_id)
