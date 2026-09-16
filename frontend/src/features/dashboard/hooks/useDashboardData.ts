/**
 * Dashboard data hooks — derive KPIs and activity feed
 * from the dedicated /dashboard/ endpoint (lightweight aggregation).
 * @module features/dashboard/hooks/useDashboardData
 */

import { useMemo } from 'react';

import {
    useDashboardSummary,
    type Dashboard,
    ACTIVITY_FEED_LIMIT,
    BRAND_COLORS,
    safeColor,
    type DashboardActivityItem,
} from '@entities/dashboard';
import { CAMPAIGN_STATUSES } from '@entities/campaign/core/lib/referential';
import { getCampaignType, getCampaignInstallation } from '@entities/campaign/core/lib/referential';
import { getStatusInfo as getFsecStatusInfo } from '@entities/fsec/core/model/fsec.constants';
import { getFaStatusInfo, getFaTypeInfo, getFaCriticalityInfo } from '@entities/fa/core/model/fa.constants';
import { EMBASE_TYPE_LABELS } from '@entities/embase';
import { paths } from '@shared/config';

// ============================================================================
// KPIs
// ============================================================================

function useKpis(counts: Dashboard['counts'] | undefined) {
    return useMemo(() => {
        if (!counts) {
            return { activeCampaigns: 0, totalFsecs: 0, openFas: 0, resolutionRate: 0, totalFas: 0 };
        }

        const activeCampaigns = counts.campaigns.byStatus['2'] ?? 0;
        const totalFsecs = counts.fsecs.total;
        const openFas = counts.fas.byStatus['0'] ?? 0;
        const totalFas = counts.fas.total;
        const closedFas = counts.fas.byStatus['2'] ?? 0;
        const resolutionRate = totalFas > 0 ? Math.round((closedFas / totalFas) * 100) : 0;

        return { activeCampaigns, totalFsecs, openFas, resolutionRate, totalFas };
    }, [counts]);
}

// ============================================================================
// Activity Feed — per-type mappers
// ============================================================================

type ActivityItem = Dashboard['recentActivity'][number];

function parseDate(iso: string | null): Date | null {
    return iso ? new Date(iso) : null;
}

function mapCampaignActivity(item: ActivityItem): DashboardActivityItem {
    const typeLabel = getCampaignType(item.typeId ?? null)?.label;
    const installLabel = getCampaignInstallation(item.installationId ?? null)?.label;
    const detail = [
        typeLabel ? `Type : ${typeLabel}` : '',
        installLabel ? `Installation : ${installLabel}` : '',
        `${item.year} — ${item.semester}`,
    ]
        .filter(Boolean)
        .join('  ·  ');
    const statusInfo = CAMPAIGN_STATUSES[item.statusId ?? -1];

    return {
        id: item.id,
        type: 'campaign',
        name: item.name,
        detail,
        date: parseDate(item.lastUpdated),
        statusLabel: statusInfo?.label ?? '—',
        statusColor: safeColor(statusInfo?.color),
        link: paths.campaign.root(item.slug ?? item.id),
    };
}

function mapFsecActivity(item: ActivityItem): DashboardActivityItem {
    const status = getFsecStatusInfo(item.statusId);
    const parts: string[] = [];
    if (item.campaignName) parts.push(`Campagne : ${item.campaignName}`);
    if (item.localisation) parts.push(`Loc. : ${item.localisation}`);

    return {
        id: item.id,
        type: 'fsec',
        name: item.name,
        detail: parts.join('  ·  '),
        date: parseDate(item.lastUpdated),
        statusLabel: status.label,
        statusColor: status.color,
        link: paths.fsec.root(item.slug ?? item.id),
    };
}

function mapFaActivity(item: ActivityItem): DashboardActivityItem {
    const status = getFaStatusInfo(item.statusId);
    const typeInfo = getFaTypeInfo(item.typeId ?? null);
    const critInfo = getFaCriticalityInfo(item.criticalityId ?? null);
    const parts: string[] = [];
    if (typeInfo.label !== '-') parts.push(`Type : ${typeInfo.label}`);
    if (critInfo.label !== '-') parts.push(`Criticité : ${critInfo.label}`);

    return {
        id: item.id,
        type: 'fa',
        name: item.name,
        detail: parts.join('  ·  '),
        date: parseDate(item.lastUpdated),
        statusLabel: status.label,
        statusColor: status.color,
        link: paths.fa.root(item.slug ?? item.id),
    };
}

function mapEmbaseActivity(item: ActivityItem): DashboardActivityItem {
    const typeLabel = item.embaseType
        ? (EMBASE_TYPE_LABELS[item.embaseType as keyof typeof EMBASE_TYPE_LABELS] ?? item.embaseType)
        : '';
    const parts: string[] = [];
    if (typeLabel) parts.push(`Type : ${typeLabel}`);
    if (item.localisationActuelle) parts.push(`Loc. : ${item.localisationActuelle}`);

    return {
        id: item.id,
        type: 'embase',
        name: item.name,
        detail: parts.join('  ·  '),
        date: parseDate(item.lastUpdated),
        statusLabel: typeLabel || 'Embase',
        statusColor: BRAND_COLORS.embase,
        link: paths.embase.root(item.slug ?? item.id),
    };
}

function mapPlanningActivity(item: ActivityItem): DashboardActivityItem {
    const parts: string[] = [];
    if (item.stepLabel) parts.push(item.stepLabel);
    if (item.fsecName) parts.push(`FSEC : ${item.fsecName}`);

    return {
        id: item.id,
        type: 'planning',
        name: item.campaignName ?? item.name,
        detail: parts.join('  ·  '),
        date: parseDate(item.lastUpdated),
        statusLabel: item.stepLabel ?? 'Étape',
        statusColor: BRAND_COLORS.planning,
        link: '/planning',
    };
}

const ACTIVITY_MAPPERS: Record<string, (item: ActivityItem) => DashboardActivityItem> = {
    campaign: mapCampaignActivity,
    fsec: mapFsecActivity,
    fa: mapFaActivity,
    embase: mapEmbaseActivity,
    planning: mapPlanningActivity,
};

function useRecentActivity(recentActivity: Dashboard['recentActivity'] | undefined): DashboardActivityItem[] {
    return useMemo(() => {
        if (!recentActivity) return [];
        return recentActivity
            .slice(0, ACTIVITY_FEED_LIMIT)
            .map((item) => (ACTIVITY_MAPPERS[item.type] ?? mapCampaignActivity)(item));
    }, [recentActivity]);
}

// ============================================================================
// Facade Hook — single entry point for the dashboard page
// ============================================================================

export default function useDashboardData() {
    const { data, isLoading } = useDashboardSummary();

    return {
        isLoading,
        kpis: useKpis(data?.counts),
        recentActivity: useRecentActivity(data?.recentActivity),
    };
}
