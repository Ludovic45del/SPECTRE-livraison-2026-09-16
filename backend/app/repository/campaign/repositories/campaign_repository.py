"""Repository Campaign - Implémentation ICampaignRepository."""

from typing import List, Optional

from django.db import transaction

from app.domain.campaign.interface.campaign_repository import ICampaignRepository
from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.shared.slug import build_campaign_slug, extract_leading_year
from app.mapper.campaign.campaign_mapper import (
    campaign_mapper_bean_to_entity,
    campaign_mapper_entity_to_bean,
)
from app.repository.campaign.models.campaign_entity import CampaignEntity


class CampaignRepository(ICampaignRepository):
    """Implémentation du repository Campaign."""

    SELECT_RELATED = ("type_id", "status_id", "installation_id")

    @transaction.atomic
    def create(self, bean: CampaignBean) -> CampaignBean:
        """Crée une nouvelle campagne."""
        entity = campaign_mapper_bean_to_entity(bean)
        entity.save()
        return campaign_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[CampaignBean]:
        """Récupère une campagne par son UUID."""
        try:
            entity = CampaignEntity.objects.select_related(*self.SELECT_RELATED).get(
                uuid=uuid
            )
            return campaign_mapper_entity_to_bean(entity)
        except CampaignEntity.DoesNotExist:
            return None

    def get_by_slug(self, slug: str) -> Optional[CampaignBean]:
        """Récupère une campagne par son slug calculé.

        Le slug (``année-semestre-installation-nom``) n'étant pas stocké, on
        filtre par année (préfixe du slug) puis on recalcule le slug de chaque
        candidat pour comparaison — O(n) sur les campagnes d'une année.
        """
        query = CampaignEntity.objects.select_related(*self.SELECT_RELATED)
        year = extract_leading_year(slug)
        if year is not None:
            query = query.filter(year=year)
        for entity in query:
            bean = campaign_mapper_entity_to_bean(entity)
            if (
                build_campaign_slug(
                    bean.year, bean.semester, bean.installation_label, bean.name
                )
                == slug
            ):
                return bean
        return None

    def get_all(
        self, limit: Optional[int] = None, offset: int = 0
    ) -> List[CampaignBean]:
        """Récupère toutes les campagnes avec pagination optionnelle."""
        query = CampaignEntity.objects.select_related(*self.SELECT_RELATED).all()

        if limit is not None:
            entities = query[offset : offset + limit]
        else:
            entities = query[offset:]

        return [campaign_mapper_entity_to_bean(entity) for entity in entities]

    def count_all(self) -> int:
        """Retourne le nombre total de campagnes."""
        return CampaignEntity.objects.count()

    @transaction.atomic
    def update(self, bean: CampaignBean) -> CampaignBean:
        """Met à jour une campagne."""
        entity = CampaignEntity.objects.get(uuid=bean.uuid)

        # Mise à jour des champs depuis le bean
        entity.type_id_id = bean.type_id
        entity.status_id_id = bean.status_id
        entity.installation_id_id = bean.installation_id
        entity.name = bean.name
        entity.year = bean.year
        entity.semester = bean.semester
        entity.start_date = bean.start_date
        entity.end_date = bean.end_date
        entity.dtri_number = bean.dtri_number
        entity.description = bean.description

        entity.save()

        return campaign_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime une campagne par son UUID."""
        try:
            entity = CampaignEntity.objects.get(uuid=uuid)
            entity.delete()
            return True
        except CampaignEntity.DoesNotExist:
            return False

    def exists_by_name_year_semester(self, name: str, year: int, semester: str) -> bool:
        """Vérifie si une campagne existe avec ce triplet unique."""
        return CampaignEntity.objects.filter(
            name=name, year=year, semester=semester
        ).exists()

    def exists_duplicate(
        self, exclude_uuid: str, name: str, year: int, semester: str
    ) -> bool:
        """Vérifie si une AUTRE campagne existe avec ce triplet (exclut l'UUID donné)."""
        return (
            CampaignEntity.objects.filter(name=name, year=year, semester=semester)
            .exclude(uuid=exclude_uuid)
            .exists()
        )
