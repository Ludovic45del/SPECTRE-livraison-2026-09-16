"""Repository Etalonnage - Implémentation IEtalonnageRepository."""

import datetime
from typing import List, Optional

from django.db import transaction

from app.domain.embase.interface.etalonnage_repository import IEtalonnageRepository
from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.mapper.embase.etalonnage_mapper import (
    etalonnage_mapper_bean_to_entity,
    etalonnage_mapper_entity_to_bean,
)
from app.repository.embase.models.etalonnage_entity import EtalonnageEntity


class EtalonnageRepository(IEtalonnageRepository):

    select_related_fields = ("embase",)

    def _base_queryset(self):
        """Returns queryset with select_related applied."""
        return EtalonnageEntity.objects.select_related(*self.select_related_fields)

    @transaction.atomic
    def create(self, bean: EtalonnageBean) -> EtalonnageBean:
        entity = etalonnage_mapper_bean_to_entity(bean)
        entity.save()
        return etalonnage_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[EtalonnageBean]:
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return etalonnage_mapper_entity_to_bean(entity)
        except EtalonnageEntity.DoesNotExist:
            return None

    def get_by_embase_uuid(
        self, embase_uuid: str, voie: Optional[int] = None
    ) -> List[EtalonnageBean]:
        qs = self._base_queryset().filter(embase_id=embase_uuid)
        if voie is not None:
            qs = qs.filter(voie=voie)
        entities = qs.order_by("date", "created_at")
        return [etalonnage_mapper_entity_to_bean(e) for e in entities]

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        try:
            entity = EtalonnageEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except EtalonnageEntity.DoesNotExist:
            return False

    def get_latest_by_embase_voie(
        self, embase_uuid: str, voie: int
    ) -> Optional[EtalonnageBean]:
        entity = (
            self._base_queryset()
            .filter(embase_id=embase_uuid, voie=voie)
            .order_by("-date", "-created_at")
            .first()
        )
        if entity is None:
            return None
        return etalonnage_mapper_entity_to_bean(entity)

    def exists_by_embase_voie_date(
        self, embase_uuid: str, voie: int, date: datetime.date
    ) -> bool:
        """Vérifie si un étalonnage existe pour cette embase/voie/date."""
        return EtalonnageEntity.objects.filter(
            embase_id=embase_uuid, voie=voie, date=date
        ).exists()

    def count_by_embase_uuid(self, embase_uuid: str, voie: Optional[int] = None) -> int:
        """Retourne le nombre d'étalonnages pour une embase."""
        qs = EtalonnageEntity.objects.filter(embase_id=embase_uuid)
        if voie is not None:
            qs = qs.filter(voie=voie)
        return qs.count()

    def get_by_embase_uuid_paginated(
        self,
        embase_uuid: str,
        voie: Optional[int] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[EtalonnageBean]:
        """Récupère les étalonnages d'une embase avec pagination."""
        qs = self._base_queryset().filter(embase_id=embase_uuid)
        if voie is not None:
            qs = qs.filter(voie=voie)
        qs = qs.order_by("date", "created_at")
        if limit is not None:
            entities = qs[offset : offset + limit]
        else:
            entities = qs[offset:]
        return [etalonnage_mapper_entity_to_bean(e) for e in entities]
