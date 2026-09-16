/**
 * Campaign List Helpers
 * @module pages/campaigns/lib
 *
 * Pure helper functions for filtering, sorting and formatting campaigns.
 */

import { CampaignWithRelations } from '@entities/campaign';
import { CampaignFilters } from '@features/campaign/filter-campaigns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortColumn = 'year' | 'semester' | 'name' | 'installation' | 'type' | 'status';
export type SortDirection = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// L'ordre des clés est celui des colonnes du tableau (le colgroup de la page
// itère sur Object.values).
export const COLUMN_WIDTHS = {
    year: '8%',
    semester: '9%',
    name: '31%',
    installation: '15%',
    type: '16%',
    status: '15%',
    actions: '6%',
} as const;

// « Année »/« Semestre » = attribution de la campagne (clé d'unicité backend,
// périmètre des indicateurs). La période d'activité réelle (startDate/endDate)
// est affichée dans le header de la fiche campagne.
export const COLUMNS: { key: SortColumn; label: string; width: string }[] = [
    { key: 'year', label: 'Année', width: COLUMN_WIDTHS.year },
    { key: 'semester', label: 'Semestre', width: COLUMN_WIDTHS.semester },
    { key: 'name', label: 'Nom', width: COLUMN_WIDTHS.name },
    { key: 'installation', label: 'Installation', width: COLUMN_WIDTHS.installation },
    { key: 'type', label: 'Type', width: COLUMN_WIDTHS.type },
    { key: 'status', label: 'Statut', width: COLUMN_WIDTHS.status },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const filterCampaigns = (
    campaigns: CampaignWithRelations[] | undefined,
    filters: CampaignFilters,
): CampaignWithRelations[] => {
    if (!campaigns) return [];

    const nameLower = filters.name.toLowerCase();

    return campaigns.filter((campaign) => {
        if (filters.installation !== null) {
            const campaignInstallation = campaign.installation?.label;
            if (campaignInstallation && campaignInstallation !== filters.installation) {
                return false;
            }
        }
        if (filters.year !== null && campaign.year !== filters.year) {
            return false;
        }
        if (filters.semester !== null && campaign.semester !== filters.semester) {
            return false;
        }
        if (filters.name && !campaign.name.toLowerCase().includes(nameLower)) {
            return false;
        }
        if (filters.type !== null && campaign.type?.id !== filters.type.id) {
            return false;
        }
        if (filters.status !== null && campaign.status?.label !== filters.status) {
            return false;
        }
        return true;
    });
};

export const sortCampaigns = (
    campaigns: CampaignWithRelations[],
    column: SortColumn,
    direction: SortDirection,
): CampaignWithRelations[] => {
    const sorted = [...campaigns];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 'year':
                comparison = (a.year ?? 0) - (b.year ?? 0);
                break;
            case 'semester':
                comparison = (a.semester ?? '').localeCompare(b.semester ?? '');
                break;
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'installation':
                comparison = (a.installation?.label ?? '').localeCompare(b.installation?.label ?? '');
                break;
            case 'type':
                comparison = (a.type?.label ?? '').localeCompare(b.type?.label ?? '');
                break;
            case 'status':
                comparison = (a.status?.label ?? '').localeCompare(b.status?.label ?? '');
                break;
        }
        return comparison * multiplier;
    });

    return sorted;
};
