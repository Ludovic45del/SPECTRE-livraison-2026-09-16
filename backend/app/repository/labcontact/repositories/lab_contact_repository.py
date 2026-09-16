"""Repository LabContact — CRUD sur l'annuaire des laboratoires.

Règle transverse (cf. fa_photo_repository, messaging) : un uuid malformé
arrivant d'un segment d'URL libre (ex. `/lab-contacts/not-a-uuid/`) fait lever
`django.core.exceptions.ValidationError` (ou `ValueError`) par
`UUIDField.get_prep_value` avant même la requête SQL. Les méthodes exposées à
un identifiant non validé rattrapent ces erreurs et renvoient None/False, que le
service traduit en NotFoundException → 404 (jamais un 500).
"""

from typing import List, Optional

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models.functions import Lower

from app.domain.labcontact.interface.lab_contact_repository import ILabContactRepository
from app.domain.labcontact.models.lab_contact_bean import LabContactBean
from app.mapper.labcontact.lab_contact_mapper import (
    lab_contact_bean_to_entity,
    lab_contact_entity_to_bean,
    lab_contact_update_entity_from_bean,
)
from app.repository.labcontact.models.lab_contact_entity import LabContactEntity


class LabContactRepository(ILabContactRepository):
    """Implémentation Django ORM du repository LabContact."""

    def get_all(self) -> List[LabContactBean]:
        # Tri alphabétique insensible à la casse (« accueil » avant « Labo 215 »),
        # identique sur SQLite et PostgreSQL ; `created_at` départage les homonymes.
        # Explicité ici pour ne pas dépendre du Meta.ordering de l'entité.
        entities = LabContactEntity.objects.order_by(Lower("name"), "created_at")
        return [lab_contact_entity_to_bean(entity) for entity in entities]

    def get_by_uuid(self, uuid: str) -> Optional[LabContactBean]:
        try:
            entity = LabContactEntity.objects.get(uuid=uuid)
            return lab_contact_entity_to_bean(entity)
        except (LabContactEntity.DoesNotExist, ValidationError, ValueError):
            # Inexistant OU uuid malformé : « absent » pour le service (→ 404).
            return None

    @transaction.atomic
    def create(self, bean: LabContactBean) -> LabContactBean:
        entity = lab_contact_bean_to_entity(bean)
        entity.save()
        return lab_contact_entity_to_bean(entity)

    @transaction.atomic
    def update(self, bean: LabContactBean) -> LabContactBean:
        # Le service a déjà vérifié l'existence via get_by_uuid (uuid valide ici).
        entity = LabContactEntity.objects.get(uuid=bean.uuid)
        lab_contact_update_entity_from_bean(entity, bean)
        entity.save()
        return lab_contact_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = LabContactEntity.objects.get(uuid=uuid)
        except (LabContactEntity.DoesNotExist, ValidationError, ValueError):
            return False
        entity.delete()
        return True
