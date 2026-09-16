/**
 * Filter Campaigns Store - Zustand
 * @module features/filter-campaigns/model
 *
 * Source: Legacy src/scenes/campaigns/CampaignsToolBar.tsx (filters state)
 */

import { create } from 'zustand';
import type { CampaignType } from '@entities/campaign';

export interface CampaignFilters {
    name: string;
    year: number | null;
    semester: string | null;
    type: CampaignType | null;
    status: string | null;
    installation: 'LMJ' | 'OMEGA' | null;
}

interface FilterCampaignsState {
    filters: CampaignFilters;

    // Actions
    setFilter: <K extends keyof CampaignFilters>(key: K, value: CampaignFilters[K]) => void;
    resetFilters: () => void;
}

const INITIAL_FILTERS: CampaignFilters = {
    name: '',
    year: new Date().getFullYear(),
    semester: null,
    type: null,
    status: null,
    installation: 'LMJ',
};

export const useFilterCampaignsStore = create<FilterCampaignsState>((set) => ({
    filters: INITIAL_FILTERS,

    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),

    resetFilters: () => set({ filters: INITIAL_FILTERS }),
}));
