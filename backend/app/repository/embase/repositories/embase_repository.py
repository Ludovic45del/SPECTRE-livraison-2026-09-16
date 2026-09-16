"""Repository Embase - Implementation IEmbaseRepository."""

from typing import List, Optional

from django.db import transaction
from django.db.models import Case, Max, When

from app.domain.embase.interface.embase_repository import IEmbaseRepository
from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.fsec_history_bean import FsecHistoryEntryBean
from app.domain.shared.slug import slugify_text
from app.mapper.embase.embase_mapper import (
    embase_mapper_bean_to_entity,
    embase_mapper_entity_to_bean,
    embase_mapper_update_entity_from_bean,
)
from app.mapper.fsec.fsec_mapper import fsec_display_name_from_entity
from app.repository.embase.models.embase_entity import EmbaseEntity
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)
from app.repository.steps.models.gas_filling_bp_step_entity import (
    GasFillingBpStepEntity,
)
from app.repository.steps.models.gas_filling_hp_step_entity import (
    GasFillingHpStepEntity,
)


class EmbaseRepository(IEmbaseRepository):
    """Implementation du repository Embase."""

    @staticmethod
    def _base_queryset():
        """Retourne le queryset de base avec les annotations etalonnage."""
        return EmbaseEntity.objects.annotate(
            _last_etalonnage_date=Max("etalonnages__date"),
            _last_etalonnage_date_v1=Max(
                Case(When(etalonnages__voie=1, then="etalonnages__date"))
            ),
            _last_etalonnage_date_v2=Max(
                Case(When(etalonnages__voie=2, then="etalonnages__date"))
            ),
        )

    @transaction.atomic
    def create(self, bean: EmbaseBean) -> EmbaseBean:
        """Cree une nouvelle Embase."""
        entity = embase_mapper_bean_to_entity(bean)
        entity.save()
        return embase_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[EmbaseBean]:
        """Recupere une Embase par son UUID."""
        try:
            entity = self._base_queryset().get(uuid=uuid)
            return embase_mapper_entity_to_bean(entity)
        except EmbaseEntity.DoesNotExist:
            return None

    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[EmbaseBean]:
        """Recupere toutes les Embases."""
        query = self._base_queryset().order_by("identifier").all()
        if limit is not None:
            entities = query[offset : offset + limit]
        else:
            entities = query[offset:]
        return [embase_mapper_entity_to_bean(entity) for entity in entities]

    def count_all(self) -> int:
        """Retourne le nombre total d'Embases."""
        return EmbaseEntity.objects.count()

    def get_by_identifier(self, identifier: str) -> Optional[EmbaseBean]:
        """Recupere une Embase par son identifiant."""
        try:
            entity = self._base_queryset().get(identifier=identifier)
            return embase_mapper_entity_to_bean(entity)
        except EmbaseEntity.DoesNotExist:
            return None

    def get_by_slug(self, slug: str) -> Optional[EmbaseBean]:
        """Recupere une Embase par son slug d'URL (slugify de l'identifier unique).

        La slugification (minuscules) n'etant pas reversible, on compare le slug
        recalcule de chaque identifier puis on charge l'Embase correspondante.
        """
        for embase_uuid, identifier in EmbaseEntity.objects.values_list(
            "uuid", "identifier"
        ):
            if slugify_text(identifier) == slug:
                return self.get_by_uuid(str(embase_uuid))
        return None

    @transaction.atomic
    def update(self, bean: EmbaseBean) -> EmbaseBean:
        """Met a jour une Embase."""
        entity = EmbaseEntity.objects.get(uuid=bean.uuid)
        embase_mapper_update_entity_from_bean(entity, bean)
        entity.save()
        return embase_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une Embase par son UUID."""
        try:
            entity = EmbaseEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except EmbaseEntity.DoesNotExist:
            return False

    def exists_by_identifier(self, identifier: str) -> bool:
        """Verifie si une Embase existe avec cet identifiant."""
        return EmbaseEntity.objects.filter(identifier=identifier).exists()

    def exists_duplicate(self, exclude_uuid: str, identifier: str) -> bool:
        """Verifie si une autre Embase (excluant l'UUID donne) a cet identifiant."""
        return (
            EmbaseEntity.objects.filter(identifier=identifier)
            .exclude(uuid=exclude_uuid)
            .exists()
        )

    _FSEC_STEP_SELECT_RELATED = (
        "fsec_version_id",
        "fsec_version_id__campaign_id",
        "fsec_version_id__campaign_id__installation_id",
    )
    _GAS_STEP_SOURCES = (
        GasFillingHpStepEntity,
        GasFillingBpStepEntity,
        AirtightnessTestLpStepEntity,
    )

    def get_fsec_history(self, embase_uuid: str) -> List[FsecHistoryEntryBean]:
        """Retourne l'historique des FSECs associés à une embase via les steps gaz (HP + BP)."""
        all_steps = []
        for entity_cls in self._GAS_STEP_SOURCES:
            qs = (
                entity_cls.objects.filter(embase_id=embase_uuid)
                .select_related(*self._FSEC_STEP_SELECT_RELATED)
                .order_by("-date_of_fulfilment")
            )
            all_steps.extend(qs)

        return self._build_history_beans(all_steps)

    @staticmethod
    def _build_history_beans(steps) -> List[FsecHistoryEntryBean]:
        """Déduplique les steps (par FSEC) et construit les beans d'historique."""
        seen_fsec_ids = set()
        results = []
        # Prioriser les steps avec date renseignée pour conserver une date significative.
        for step in sorted(
            steps, key=lambda s: s.date_of_fulfilment or "", reverse=True
        ):
            fsec_id = step.fsec_version_id_id
            if fsec_id in seen_fsec_ids:
                continue
            seen_fsec_ids.add(fsec_id)

            fsec = step.fsec_version_id
            campaign = fsec.campaign_id
            results.append(
                FsecHistoryEntryBean(
                    fsec_uuid=str(fsec.fsec_uuid),
                    fsec_version_uuid=str(fsec.version_uuid),
                    fsec_name=fsec_display_name_from_entity(fsec),
                    campaign_name=campaign.name if campaign else None,
                    campaign_uuid=str(campaign.uuid) if campaign else None,
                    date_of_fulfilment=(
                        step.date_of_fulfilment.isoformat()
                        if step.date_of_fulfilment
                        else None
                    ),
                    gas_type=step.gas_type,
                )
            )

        results.sort(key=lambda e: e.date_of_fulfilment or "", reverse=True)
        return results
