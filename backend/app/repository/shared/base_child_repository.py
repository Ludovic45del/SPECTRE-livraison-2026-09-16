"""BaseChildRepository - Repository générique pour entités enfants (Teams, Documents).

Élimine la duplication entre CampaignTeamsRepository, CampaignDocumentsRepository,
FsecTeamsRepository, FsecDocumentsRepository qui avaient tous le même pattern CRUD.
"""

from typing import Callable, Generic, List, Optional, Type, TypeVar

from django.db import models, transaction

from app.domain.shared.base_child_repository_interface import IBaseChildRepository

TBean = TypeVar("TBean")
TEntity = TypeVar("TEntity", bound=models.Model)


class BaseChildRepository(IBaseChildRepository[TBean], Generic[TBean, TEntity]):
    """Repository générique pour entités enfants liées à un parent.

    Fournit les opérations CRUD de base. Les sous-classes doivent définir:
    - entity_class: La classe Django Model
    - bean_to_entity: Fonction de mapping Bean -> Entity
    - entity_to_bean: Fonction de mapping Entity -> Bean
    - parent_field: Nom du champ FK vers le parent (ex: "campaign_uuid_id")
    """

    entity_class: Type[TEntity]
    bean_to_entity: Callable[[TBean], TEntity]
    entity_to_bean: Callable[[TEntity], TBean]
    parent_field: str
    select_related_fields: tuple = ()

    def _base_queryset(self):
        """Returns queryset with select_related applied if configured."""
        qs = self.entity_class.objects
        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        return qs

    @transaction.atomic
    def create(self, bean: TBean) -> TBean:
        """Crée une nouvelle entité."""
        entity = self.bean_to_entity(bean)
        entity.save()
        return self.entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[TBean]:
        """Récupère une entité par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return self.entity_to_bean(entity)
        except self.entity_class.DoesNotExist:
            return None

    def get_by_parent_uuid(self, parent_uuid: str) -> List[TBean]:
        """Récupère toutes les entités liées à un parent."""
        filter_kwargs = {self.parent_field: parent_uuid}
        entities = self._base_queryset().filter(**filter_kwargs)
        return [self.entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: TBean) -> TBean:
        """Met à jour une entité."""
        # On s'assure que l'entité existe
        uuid = getattr(bean, "uuid")
        if not self.entity_class.objects.filter(uuid=uuid).exists():
            raise self.entity_class.DoesNotExist()

        entity = self.bean_to_entity(bean)
        entity.save(force_update=True)
        return self.entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une entité par son UUID."""
        try:
            entity = self.entity_class.objects.get(uuid=uuid)
            entity.delete()
            return True
        except self.entity_class.DoesNotExist:
            return False
