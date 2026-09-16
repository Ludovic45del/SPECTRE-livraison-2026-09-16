/**
 * Filter FSECs Store
 * @module features/filter-fsecs/model
 *
 * Available filters:
 * - name (text search)
 * - status (number ID)
 * - category (number ID)
 * - campaign (string UUID)
 * - year (number)
 */

import { create } from 'zustand';

export interface FsecFilters {
    name: string;
    status: number | null;
    category: number | null;
    campaign: string | null;
    year: number | null;
    installation: 'LMJ' | 'OMEGA' | null;
}

interface FilterFsecsStore {
    filters: FsecFilters;
    setFilter: <K extends keyof FsecFilters>(key: K, value: FsecFilters[K]) => void;
    resetFilters: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_FILTERS: FsecFilters = {
    name: '',
    status: null,
    category: null,
    campaign: null,
    year: CURRENT_YEAR,
    installation: 'LMJ',
};

export const useFilterFsecsStore = create<FilterFsecsStore>((set) => ({
    filters: DEFAULT_FILTERS,
    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),
    resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
