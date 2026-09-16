/**
 * Dashboard data hooks — derive KPIs, chart segments, and activity feed
 * from the dedicated /dashboard/ endpoint (lightweight aggregation).
 * @module pages/home/hooks/useDashboardData
 */

import { useMemo } from 'react';

import { useDashboardSummary, type Dashboard } from '@entities/dashboard';
import { CAMPAIGN_STATUSES } from '@entities/campaign/core/lib/referential';
import { getCampaignType, getCampaignInstallation } from '@entities/campaign/core/lib/referential';
import { FSEC_STATUSES, getStatusInfo as getFsecStatusInfo } from '@entities/fsec/core/model/fsec.constants';
import {
    FA_STATUSES,
    FA_CRITICALITIES,
    getFaStatusInfo,
    getFaTypeInfo,
    getFaCriticalityInfo,
} from '@entities/fa/core/model/fa.constants';

import { ACTIVITY_FEED_LIMIT, safeColor, type ActivityItem, type DonutSegment } from '../constants';
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
// Donut Segment Hooks
// ============================================================================

function buildSegmentsFromCounts(
    byStatus: Record<string, number> | undefined,
    referential: Record<number, { label: string; color: string | null }>,
): DonutSegment[] {
    if (!byStatus) return [];
    return Object.entries(referential)
        .map(([idStr, info]) => ({
            label: info.label,
            value: byStatus[idStr] ?? 0,
            color: safeColor(info.color),
        }))
        .filter((s) => s.value > 0);
}

function useCampaignSegments(counts: Dashboard['counts'] | undefined): DonutSegment[] {
    return useMemo(
        () => buildSegmentsFromCounts(counts?.campaigns.byStatus, CAMPAIGN_STATUSES),
        [counts?.campaigns.byStatus],
    );
}

function useFsecSegments(counts: Dashboard['counts'] | undefined): DonutSegment[] {
    return useMemo(() => buildSegmentsFromCounts(counts?.fsecs.byStatus, FSEC_STATUSES), [counts?.fsecs.byStatus]);
}

function useFaStatusSegments(counts: Dashboard['counts'] | undefined): DonutSegment[] {
    return useMemo(() => buildSegmentsFromCounts(counts?.fas.byStatus, FA_STATUSES), [counts?.fas.byStatus]);
}

function useFaCriticalitySegments(counts: Dashboard['counts'] | undefined): DonutSegment[] {
    return useMemo(
        () => buildSegmentsFromCounts(counts?.fas.byCriticality, FA_CRITICALITIES),
        [counts?.fas.byCriticality],
    );
}

// ============================================================================
// Activity Feed
// ============================================================================

function useRecentActivity(recentActivity: Dashboard['recentActivity'] | undefined): ActivityItem[] {
    return useMemo(() => {
        if (!recentActivity) return [];

        return recentActivity.slice(0, ACTIVITY_FEED_LIMIT).map((item): ActivityItem => {
            if (item.type === 'campaign') {
                const typeLabel = getCampaignType(item.typeId ?? null)?.label;
                const installLabel = getCampaignInstallation(item.installationId ?? null)?.label;
                const periodPart = `${item.year} — ${item.semester}`;
                const detail = [
                    typeLabel ? `Type : ${typeLabel}` : '',
                    installLabel ? `Installation : ${installLabel}` : '',
                    periodPart,
                ]
                    .filter(Boolean)
                    .join('  ·  ');
                const statusInfo = CAMPAIGN_STATUSES[item.statusId ?? -1];

                return {
                    id: item.id,
                    type: 'campaign',
                    name: item.name,
                    detail,
                    date: item.lastUpdated ? new Date(item.lastUpdated) : null,
                    statusLabel: statusInfo?.label ?? '—',
                    statusColor: safeColor(statusInfo?.color),
                    link: paths.campaign.root(item.slug ?? item.id),
                };
            }

            if (item.type === 'fsec') {
                const status = getFsecStatusInfo(item.statusId);
                const detailParts: string[] = [];
                if (item.campaignName) detailParts.push(`Campagne : ${item.campaignName}`);
                if (item.localisation) detailParts.push(`Loc. : ${item.localisation}`);

                return {
                    id: item.id,
                    type: 'fsec',
                    name: item.name,
                    detail: detailParts.join('  ·  '),
                    date: item.lastUpdated ? new Date(item.lastUpdated) : null,
                    statusLabel: status.label,
                    statusColor: status.color,
                    link: paths.fsec.root(item.slug ?? item.id),
                };
            }

            // FA
            const status = getFaStatusInfo(item.statusId);
            const typeInfo = getFaTypeInfo(item.typeId ?? null);
            const critInfo = getFaCriticalityInfo(item.criticalityId ?? null);
            const detailParts: string[] = [];
            if (typeInfo.label !== '-') detailParts.push(`Type : ${typeInfo.label}`);
            if (critInfo.label !== '-') detailParts.push(`Criticité : ${critInfo.label}`);

            return {
                id: item.id,
                type: 'fa',
                name: item.name,
                detail: detailParts.join('  ·  '),
                date: item.lastUpdated ? new Date(item.lastUpdated) : null,
                statusLabel: status.label,
                statusColor: status.color,
                link: paths.fa.root(item.slug ?? item.id),
            };
        });
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
        campaignSegments: useCampaignSegments(data?.counts),
        fsecSegments: useFsecSegments(data?.counts),
        faStatusSegments: useFaStatusSegments(data?.counts),
        faCritSegments: useFaCriticalitySegments(data?.counts),
        recentActivity: useRecentActivity(data?.recentActivity),
    };
}
