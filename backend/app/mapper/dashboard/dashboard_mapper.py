"""Mapper Dashboard - Conversion Bean → API."""

from typing import Any, Dict

from app.domain.dashboard.models.dashboard_bean import (
    DashboardCountsBean,
    RecentActivityItemBean,
)


def dashboard_counts_bean_to_api(bean: DashboardCountsBean) -> Dict[str, Any]:
    """Convertit le bean de compteurs en dict pour la réponse API."""
    return {
        "campaigns": {
            "total": bean.campaigns.total,
            "by_status": bean.campaigns.by_status,
        },
        "fsecs": {
            "total": bean.fsecs.total,
            "by_status": bean.fsecs.by_status,
        },
        "fas": {
            "total": bean.fas.total,
            "by_status": bean.fas.by_status,
            "by_criticality": bean.fas.by_criticality,
        },
    }


def dashboard_activity_item_bean_to_api(item: RecentActivityItemBean) -> Dict[str, Any]:
    """Convertit un bean d'activité récente en dict pour la réponse API."""
    result = {
        "id": item.id,
        "type": item.type,
        "name": item.name,
        # Slug d'URL pour le lien d'activité (None pour le type "planning").
        "slug": item.slug,
        "status_id": item.status_id,
        "last_updated": item.last_updated,
    }

    if item.type == "campaign":
        result["type_id"] = item.type_id
        result["installation_id"] = item.installation_id
        result["year"] = item.year
        result["semester"] = item.semester
    elif item.type == "fsec":
        result["campaign_name"] = item.campaign_name
        result["localisation"] = item.localisation
    elif item.type == "fa":
        result["type_id"] = item.type_id
        result["criticality_id"] = item.criticality_id
    elif item.type == "embase":
        result["embase_type"] = item.embase_type
        result["localisation_actuelle"] = item.localisation_actuelle
    elif item.type == "planning":
        result["step_label"] = item.step_label
        result["campaign_name"] = item.campaign_name
        result["fsec_name"] = item.fsec_name

    return result
