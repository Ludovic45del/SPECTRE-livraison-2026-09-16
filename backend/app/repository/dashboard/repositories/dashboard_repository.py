"""Repository Dashboard - Implémentation IDashboardRepository avec Django ORM."""

from typing import List

from django.db.models import Count

from app.domain.dashboard.interface.dashboard_repository import IDashboardRepository
from app.domain.dashboard.models.dashboard_bean import (
    CountsByStatusBean,
    DashboardCountsBean,
    FaCountsBean,
    RecentActivityItemBean,
)
from app.domain.shared.slug import build_campaign_slug, build_fsec_slug, slugify_text
from app.mapper.fsec.fsec_mapper import fsec_display_name_from_entity
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.embase.models.embase_entity import EmbaseEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.planning.models.planning_campaign_step_entity import (
    PlanningCampaignStepEntity,
)


class DashboardRepository(IDashboardRepository):
    """Implémentation du repository Dashboard (lecture seule)."""

    CAMPAIGN_RELATIONS = ("status_id", "type_id", "installation_id")
    FA_RELATIONS = ("status_id", "type_id", "criticality_id")
    PLANNING_RELATIONS = (
        "campaign",
        "fsec_uuid",
        "fsec_uuid__campaign_id",
        "fsec_uuid__campaign_id__installation_id",
    )

    def get_counts(self) -> DashboardCountsBean:
        """Récupère les compteurs agrégés depuis la base de données."""
        return DashboardCountsBean(
            campaigns=self._get_campaign_counts(),
            fsecs=self._get_fsec_counts(),
            fas=self._get_fa_counts(),
        )

    def get_recent_activity(self, limit: int = 10) -> List[RecentActivityItemBean]:
        """Récupère les éléments d'activité récente depuis la base de données."""
        items: List[RecentActivityItemBean] = []
        items.extend(self._get_recent_campaigns(limit))
        items.extend(self._get_recent_fsecs(limit))
        items.extend(self._get_recent_fas(limit))
        items.extend(self._get_recent_embases(limit))
        items.extend(self._get_recent_planning_steps(limit))
        return items

    # --- Compteurs privés ---

    def _get_campaign_counts(self) -> CountsByStatusBean:
        """Compteurs campagnes par statut."""
        by_status = dict(
            CampaignEntity.objects.values("status_id")
            .annotate(count=Count("uuid"))
            .values_list("status_id", "count")
        )
        total = sum(by_status.values())
        return CountsByStatusBean(
            total=total,
            by_status={str(k): v for k, v in by_status.items()},
        )

    def _get_fsec_counts(self) -> CountsByStatusBean:
        """Compteurs FSECs par statut (uniquement versions actives)."""
        by_status = dict(
            FsecEntity.objects.filter(is_active=True)
            .values("status_id")
            .annotate(count=Count("version_uuid"))
            .values_list("status_id", "count")
        )
        total = sum(by_status.values())
        return CountsByStatusBean(
            total=total,
            by_status={str(k): v for k, v in by_status.items()},
        )

    def _get_fa_counts(self) -> FaCountsBean:
        """Compteurs FAs par statut et par criticité."""
        by_status = dict(
            FaEntity.objects.values("status_id")
            .annotate(count=Count("uuid"))
            .values_list("status_id", "count")
        )
        total = sum(by_status.values())

        by_criticality = dict(
            FaEntity.objects.exclude(criticality_id__isnull=True)
            .values("criticality_id")
            .annotate(count=Count("uuid"))
            .values_list("criticality_id", "count")
        )

        return FaCountsBean(
            total=total,
            by_status={str(k): v for k, v in by_status.items()},
            by_criticality={str(k): v for k, v in by_criticality.items()},
        )

    # --- Activité récente privée ---

    def _get_recent_campaigns(self, limit: int) -> List[RecentActivityItemBean]:
        """Récupère les campagnes récentes."""
        items = []
        for c in CampaignEntity.objects.select_related(
            *self.CAMPAIGN_RELATIONS
        ).order_by("-last_updated")[:limit]:
            installation_label = (
                c.installation_id.label if c.installation_id_id is not None else None
            )
            items.append(
                RecentActivityItemBean(
                    id=str(c.uuid),
                    type="campaign",
                    name=c.name,
                    slug=build_campaign_slug(
                        c.year, c.semester, installation_label, c.name
                    ),
                    status_id=c.status_id_id,
                    last_updated=c.last_updated.isoformat() if c.last_updated else None,
                    type_id=c.type_id_id,
                    installation_id=c.installation_id_id,
                    year=c.year,
                    semester=c.semester,
                )
            )
        return items

    def _get_recent_fsecs(self, limit: int) -> List[RecentActivityItemBean]:
        """Récupère les FSECs récents (uniquement versions actives)."""
        items = []
        for f in (
            FsecEntity.objects.filter(is_active=True)
            .select_related("campaign_id", "campaign_id__installation_id")
            .order_by("-last_updated")[:limit]
        ):
            campaign = f.campaign_id
            if campaign is not None:
                installation_label = (
                    campaign.installation_id.label
                    if campaign.installation_id_id is not None
                    else None
                )
                slug = build_fsec_slug(
                    campaign.year,
                    campaign.semester,
                    installation_label,
                    campaign.name,
                    f.name,
                )
            else:
                slug = slugify_text(f.name) or None
            items.append(
                RecentActivityItemBean(
                    id=str(f.version_uuid),
                    type="fsec",
                    name=fsec_display_name_from_entity(f),
                    slug=slug,
                    status_id=f.status_id_id,
                    last_updated=f.last_updated.isoformat() if f.last_updated else None,
                    campaign_name=campaign.name if campaign else None,
                    localisation=f.localisation,
                )
            )
        return items

    def _get_recent_fas(self, limit: int) -> List[RecentActivityItemBean]:
        """Récupère les FAs récentes."""
        items = []
        for fa in FaEntity.objects.select_related(*self.FA_RELATIONS).order_by(
            "-last_updated"
        )[:limit]:
            items.append(
                RecentActivityItemBean(
                    id=str(fa.uuid),
                    type="fa",
                    name=fa.identifier or "FA sans identifiant",
                    slug=slugify_text(fa.identifier) or None,
                    status_id=fa.status_id_id,
                    last_updated=(
                        fa.last_updated.isoformat() if fa.last_updated else None
                    ),
                    type_id=fa.type_id_id,
                    criticality_id=fa.criticality_id_id,
                )
            )
        return items

    def _get_recent_embases(self, limit: int) -> List[RecentActivityItemBean]:
        """Récupère les embases récemment modifiées."""
        items = []
        for e in EmbaseEntity.objects.order_by("-updated_at")[:limit]:
            items.append(
                RecentActivityItemBean(
                    id=str(e.uuid),
                    type="embase",
                    name=e.identifier,
                    slug=slugify_text(e.identifier) or None,
                    last_updated=(e.updated_at.isoformat() if e.updated_at else None),
                    embase_type=e.type,
                    localisation_actuelle=e.localisation_actuelle or None,
                )
            )
        return items

    def _get_recent_planning_steps(self, limit: int) -> List[RecentActivityItemBean]:
        """Récupère les étapes de planning récemment modifiées."""
        items = []
        for s in PlanningCampaignStepEntity.objects.select_related(
            *self.PLANNING_RELATIONS
        ).order_by("-updated_at")[:limit]:
            items.append(
                RecentActivityItemBean(
                    id=str(s.uuid),
                    type="planning",
                    name=s.campaign.name if s.campaign else "—",
                    last_updated=(s.updated_at.isoformat() if s.updated_at else None),
                    step_label=s.step_label,
                    campaign_name=(s.campaign.name if s.campaign else None),
                    fsec_name=(
                        fsec_display_name_from_entity(s.fsec_uuid)
                        if s.fsec_uuid
                        else None
                    ),
                )
            )
        return items
