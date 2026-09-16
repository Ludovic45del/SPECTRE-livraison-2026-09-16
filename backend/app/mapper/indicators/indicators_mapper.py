"""Mapper Indicators - Conversion Bean → API."""

from typing import Any, Dict

from app.domain.indicators.models.indicators_bean import (
    CampaignIndicatorsBean,
    CampaignVolumeBean,
    FaIndicatorsBean,
    FsecIndicatorsBean,
    IndicatorsBean,
    StepDurationBean,
)


def step_duration_bean_to_api(bean: StepDurationBean) -> Dict[str, Any]:
    return {
        "key": bean.key,
        "label": bean.label,
        "count": bean.count,
        "avg_days": bean.avg_days,
        "median_days": bean.median_days,
        "min_days": bean.min_days,
        "max_days": bean.max_days,
        "is_gas": bean.is_gas,
    }


def fa_indicators_bean_to_api(bean: FaIndicatorsBean) -> Dict[str, Any]:
    return {
        "total_created_in_year": bean.total_created_in_year,
        "by_status": bean.by_status,
        "by_criticality": bean.by_criticality,
        "by_discovery_step": bean.by_discovery_step,
        "open_stock_all_years": bean.open_stock_all_years,
        "avg_event_to_open_days": bean.avg_event_to_open_days,
        "avg_open_to_closure_days": bean.avg_open_to_closure_days,
        "avg_total_lifecycle_days": bean.avg_total_lifecycle_days,
        "created_per_month": bean.created_per_month,
    }


def fsec_indicators_bean_to_api(bean: FsecIndicatorsBean) -> Dict[str, Any]:
    return {
        "total_created_in_year": bean.total_created_in_year,
        "total_shot_in_year": bean.total_shot_in_year,
        "by_status": bean.by_status,
        "by_category": bean.by_category,
        "avg_cycle_time_days": bean.avg_cycle_time_days,
        "median_cycle_time_days": bean.median_cycle_time_days,
        "shot_per_month": bean.shot_per_month,
    }


def campaign_volume_bean_to_api(bean: CampaignVolumeBean) -> Dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "name": bean.name,
        "fsec_count": bean.fsec_count,
    }


def campaign_indicators_bean_to_api(bean: CampaignIndicatorsBean) -> Dict[str, Any]:
    return {
        "total_in_period": bean.total_in_period,
        "by_status": bean.by_status,
        "by_type": bean.by_type,
        "by_installation": bean.by_installation,
        "total_fsec": bean.total_fsec,
        "total_fsec_shot": bean.total_fsec_shot,
        "avg_fsec_per_campaign": bean.avg_fsec_per_campaign,
        "avg_duration_days": bean.avg_duration_days,
        "started_per_month": bean.started_per_month,
        "top_by_volume": [campaign_volume_bean_to_api(c) for c in bean.top_by_volume],
    }


def indicators_bean_to_api(bean: IndicatorsBean) -> Dict[str, Any]:
    return {
        "year": bean.year,
        "fa": fa_indicators_bean_to_api(bean.fa),
        "fsec": fsec_indicators_bean_to_api(bean.fsec),
        "campaign": campaign_indicators_bean_to_api(bean.campaign),
        "step_durations": [step_duration_bean_to_api(sd) for sd in bean.step_durations],
        "bottleneck_step_key": bean.bottleneck_step_key,
    }
