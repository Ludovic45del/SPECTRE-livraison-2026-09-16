/**
 * FSECs List Page - Helper functions
 * @module pages/fsecs/fsec-list-utils
 *
 * Pure functions for enriching, filtering, and sorting FSECs.
 */

import { compareFsecStatusRank, type Fsec } from '@entities/fsec';
import type { CampaignWithRelations } from '@entities/campaign';
import type { FsecFilters } from '@features/fsec/filter-fsecs';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortColumn = 'name' | 'campaign' | 'year' | 'status' | 'category';

export interface FsecWithCampaign extends Fsec {
    campaignName?: string;
    campaignYear?: number | null;
    campaignInstallation?: string | null;
    campaignIndex: number;
}

interface CampaignInfo {
    name: string;
    year: number | null;
    installation: string | null;
    index: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────────────────────

export const createCampaignMap = (campaigns: CampaignWithRelations[] | undefined): Map<string, CampaignInfo> => {
    if (!campaigns) return new Map();
    return new Map(
        campaigns.map((c, index) => [
            c.uuid,
            { name: c.name, year: c.year, installation: c.installation?.label ?? null, index },
        ]),
    );
};

export const enrichFsecsWithCampaign = (
    fsecs: Fsec[] | undefined,
    campaignMap: Map<string, CampaignInfo>,
): FsecWithCampaign[] => {
    if (!fsecs) return [];
    return fsecs.map((fsec) => {
        const campaign = fsec.campaignId ? campaignMap.get(fsec.campaignId) : null;
        return {
            ...fsec,
            campaignName: campaign?.name,
            campaignYear: campaign?.year,
            campaignInstallation: campaign?.installation,
            campaignIndex: campaign?.index ?? Number.MAX_SAFE_INTEGER,
        };
    });
};

export const filterFsecs = (fsecs: FsecWithCampaign[], filters: FsecFilters): FsecWithCampaign[] => {
    const { name, status, category, campaign, year, installation } = filters;
    const nameLower = name.toLowerCase();

    return fsecs.filter((fsec) => {
        if (installation !== null && fsec.campaignInstallation && fsec.campaignInstallation !== installation)
            return false;
        // Filtre texte sur le nom complet affiché (« 2026-LMJ_… » fonctionne aussi).
        if (name && !fsec.displayName.toLowerCase().includes(nameLower)) return false;
        if (status !== null && fsec.statusId !== status) return false;
        if (category !== null && fsec.categoryId !== category) return false;
        if (campaign !== null && fsec.campaignId !== campaign) return false;
        if (year !== null && fsec.campaignYear !== year) return false;
        return true;
    });
};

export const sortFsecs = (
    fsecs: FsecWithCampaign[],
    column: SortColumn,
    direction: 'asc' | 'desc',
): FsecWithCampaign[] => {
    const sorted = [...fsecs];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 'name':
                comparison = a.displayName.localeCompare(b.displayName);
                break;
            case 'campaign':
                // Sort by campaign creation order (index)
                comparison = a.campaignIndex - b.campaignIndex;
                break;
            case 'year':
                comparison = (a.campaignYear ?? 0) - (b.campaignYear ?? 0);
                break;
            case 'status':
                // Rang dans le workflow, pas id brut : 16 (Vérification scellement)
                // se situe entre Scellement (3) et Photos (4), les étapes gaz 9..14
                // entre Photos et Disponible.
                comparison = compareFsecStatusRank(a.statusId, b.statusId);
                break;
            case 'category':
                comparison = (a.categoryId ?? 0) - (b.categoryId ?? 0);
                break;
        }
        return comparison * multiplier;
    });

    return sorted;
};
