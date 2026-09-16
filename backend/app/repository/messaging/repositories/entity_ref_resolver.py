"""Resolver ORM des références d'entités (FSEC, campagne, FA) des messages.

Résolution en masse : au plus une requête par type d'entité, quel que soit le
nombre de références. Les règles de libellé et de slug sont CELLES des mappers
existants (`fsec_mapper.fsec_slugs_from_entity`, `campaign_mapper`, `fa_mapper`) : une
chip de la messagerie mène exactement à la même URL que la fiche.
"""

from collections import defaultdict
from typing import Dict, List, Set, Tuple

from django.core.exceptions import ValidationError

from app.domain.messaging.interface.entity_ref_resolver import IEntityRefResolver
from app.domain.messaging.models.constants import (
    ENTITY_REF_CAMPAIGN,
    ENTITY_REF_FA,
    ENTITY_REF_FSEC,
)
from app.domain.messaging.models.entity_ref_bean import EntityRefTargetBean
from app.domain.shared.slug import build_campaign_slug, slugify_text
from app.mapper.fsec.fsec_mapper import (
    fsec_display_name_from_entity,
    fsec_slugs_from_entity,
)
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fsec.models.fsec_entity import FsecEntity

RefKey = Tuple[str, str]


class EntityRefResolver(IEntityRefResolver):
    """Implémentation ORM : FSEC (version active), campagne, FA."""

    def resolve(self, refs: List[RefKey]) -> Dict[RefKey, EntityRefTargetBean]:
        wanted: Dict[str, Set[str]] = defaultdict(set)
        for entity_type, entity_uuid in refs:
            wanted[entity_type].add(str(entity_uuid))

        targets: Dict[RefKey, EntityRefTargetBean] = {}
        if wanted.get(ENTITY_REF_FSEC):
            targets.update(self._resolve_fsecs(wanted[ENTITY_REF_FSEC]))
        if wanted.get(ENTITY_REF_CAMPAIGN):
            targets.update(self._resolve_campaigns(wanted[ENTITY_REF_CAMPAIGN]))
        if wanted.get(ENTITY_REF_FA):
            targets.update(self._resolve_fas(wanted[ENTITY_REF_FA]))
        return targets

    @staticmethod
    def _resolve_fsecs(uuids: Set[str]) -> Dict[RefKey, EntityRefTargetBean]:
        """FSEC : cible = fsec_uuid, libellé (nom complet) et slug lus sur la version active."""
        try:
            rows = list(
                FsecEntity.objects.filter(
                    fsec_uuid__in=uuids, is_active=True
                ).select_related("campaign_id", "campaign_id__installation_id")
            )
        except (ValidationError, ValueError):
            # Uuid malformé (déjà filtré par le service) : aucune cible.
            return {}
        targets = {}
        for row in rows:
            slug, _ = fsec_slugs_from_entity(row)
            key = (ENTITY_REF_FSEC, str(row.fsec_uuid))
            targets[key] = EntityRefTargetBean(
                entity_type=ENTITY_REF_FSEC,
                entity_uuid=key[1],
                label=fsec_display_name_from_entity(row),
                slug=slug,
            )
        return targets

    @staticmethod
    def _resolve_campaigns(uuids: Set[str]) -> Dict[RefKey, EntityRefTargetBean]:
        """Campagne : libellé = nom, slug année-semestre-installation-nom."""
        try:
            rows = list(
                CampaignEntity.objects.filter(uuid__in=uuids).select_related(
                    "installation_id"
                )
            )
        except (ValidationError, ValueError):
            return {}
        targets = {}
        for row in rows:
            installation_label = (
                row.installation_id.label
                if row.installation_id_id is not None
                else None
            )
            key = (ENTITY_REF_CAMPAIGN, str(row.uuid))
            targets[key] = EntityRefTargetBean(
                entity_type=ENTITY_REF_CAMPAIGN,
                entity_uuid=key[1],
                label=row.name,
                slug=build_campaign_slug(
                    row.year, row.semester, installation_label, row.name
                ),
            )
        return targets

    @staticmethod
    def _resolve_fas(uuids: Set[str]) -> Dict[RefKey, EntityRefTargetBean]:
        """FA : libellé = identifiant, slug = identifiant slugifié (règle de fa_mapper)."""
        try:
            rows = list(FaEntity.objects.filter(uuid__in=uuids))
        except (ValidationError, ValueError):
            return {}
        targets = {}
        for row in rows:
            key = (ENTITY_REF_FA, str(row.uuid))
            targets[key] = EntityRefTargetBean(
                entity_type=ENTITY_REF_FA,
                entity_uuid=key[1],
                label=row.identifier,
                slug=slugify_text(row.identifier),
            )
        return targets
