"""Repository de base générique pour les Steps FSEC.

Ce module fournit une classe de base abstraite qui implémente les opérations
CRUD communes à tous les repositories de steps, éliminant ainsi la duplication
de code.
"""

from typing import Callable, Generic, List, Optional, Type, TypeVar

from django.db import models, transaction

from app.domain.exceptions import ValidationException
from app.repository.user.models.user_profile_entity import UserProfileEntity

# Types génériques
BeanT = TypeVar("BeanT")
EntityT = TypeVar("EntityT", bound=models.Model)


def resolve_step_users(user_uuids: List[str]) -> List["UserProfileEntity"]:
    """Charge les UserProfileEntity correspondant aux uuids (ordre d'entrée préservé).

    Lève ValidationException si l'un des uuids est introuvable. Partagé par les
    steps assemblage/métrologie pour gérer leurs M2M d'opérateurs multiples
    (premier de la liste = FK simple synchronisée pour la rétro-compat).
    """
    if not user_uuids:
        return []
    by_uuid = {
        str(profile.uuid): profile
        for profile in UserProfileEntity.objects.filter(uuid__in=user_uuids)
    }
    missing = [uuid for uuid in user_uuids if uuid not in by_uuid]
    if missing:
        raise ValidationException(
            "operator_user_uuids",
            f"Utilisateurs introuvables: {sorted(missing)}",
        )
    # Dédoublonne en conservant l'ordre de saisie.
    seen: set = set()
    ordered: List[UserProfileEntity] = []
    for uuid in user_uuids:
        if uuid not in seen:
            seen.add(uuid)
            ordered.append(by_uuid[uuid])
    return ordered


class BaseStepRepository(Generic[BeanT, EntityT]):
    """Repository de base avec opérations CRUD génériques.

    Cette classe implémente les opérations CRUD standard pour tous les steps.
    Les repositories spécifiques doivent:
    1. Hériter de cette classe avec les types appropriés
    2. Définir les attributs de classe entity_class, bean_to_entity, entity_to_bean
    3. Implémenter la méthode update() qui est spécifique à chaque type de step

    Attributes:
        entity_class: La classe Django Model pour ce step
        bean_to_entity: Fonction de mapping Bean → Entity
        entity_to_bean: Fonction de mapping Entity → Bean

    Example:
        class GasFillingBpStepRepository(
            BaseStepRepository[GasFillingBpStepBean, GasFillingBpStepEntity],
            IGasFillingBpStepRepository
        ):
            entity_class = GasFillingBpStepEntity
            bean_to_entity = staticmethod(gas_filling_bp_step_mapper_bean_to_entity)
            entity_to_bean = staticmethod(gas_filling_bp_step_mapper_entity_to_bean)

            def update(self, bean: GasFillingBpStepBean) -> GasFillingBpStepBean:
                # Implémentation spécifique des champs à mettre à jour
                ...
    """

    entity_class: Type[EntityT]
    bean_to_entity: Callable[[BeanT], EntityT]
    entity_to_bean: Callable[[EntityT], BeanT]
    select_related_fields: tuple = ()
    prefetch_related_fields: tuple = ()

    def _base_queryset(self):
        """Returns queryset with select_related/prefetch_related applied."""
        qs = self.entity_class.objects
        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        if self.prefetch_related_fields:
            qs = qs.prefetch_related(*self.prefetch_related_fields)
        return qs

    @transaction.atomic
    def create(self, bean: BeanT) -> BeanT:
        """Crée un nouveau step.

        Args:
            bean: Le bean contenant les données du step à créer

        Returns:
            Le bean créé avec son UUID généré
        """
        entity = self.bean_to_entity(bean)
        entity.save()
        return self.entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[BeanT]:
        """Récupère un step par son UUID.

        Args:
            uuid: L'identifiant unique du step

        Returns:
            Le bean correspondant ou None si non trouvé
        """
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return self.entity_to_bean(entity)
        except self.entity_class.DoesNotExist:
            return None

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[BeanT]:
        """Récupère tous les steps d'une version FSEC.

        Args:
            fsec_version_id: L'identifiant de la version FSEC

        Returns:
            Liste des beans associés à cette version FSEC, triés par date de création
        """
        entities = (
            self._base_queryset()
            .filter(fsec_version_id_id=fsec_version_id)
            .order_by("created_at")
        )
        return [self.entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime un step par son UUID.

        Args:
            uuid: L'identifiant unique du step à supprimer

        Returns:
            True si la suppression a réussi, False sinon
        """
        try:
            entity = self.entity_class.objects.get(uuid=uuid)
            entity.delete()
            return True
        except self.entity_class.DoesNotExist:
            return False
