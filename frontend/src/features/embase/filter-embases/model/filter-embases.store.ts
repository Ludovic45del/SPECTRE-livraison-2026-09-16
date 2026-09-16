/**
 * Filter Embases Store
 * @module features/filter-embases/model
 *
 * Available filters:
 * - name (text search)
 * - type (jet_de_gaz, hp, bp)
 */

import { create } from 'zustand';

export interface EmbaseFilters {
    name: string;
    type: 'jet_de_gaz' | 'hp' | 'bp' | null;
    nombreVoies: (1 | 2)[];
}

interface FilterEmbasesStore {
    filters: EmbaseFilters;
    setFilter: <K extends keyof EmbaseFilters>(key: K, value: EmbaseFilters[K]) => void;
    resetFilters: () => void;
}

const DEFAULT_FILTERS: EmbaseFilters = {
    name: '',
    type: null,
    nombreVoies: [1, 2] as (1 | 2)[],
};

export const useFilterEmbasesStore = create<FilterEmbasesStore>((set) => ({
    filters: DEFAULT_FILTERS,
    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),
    resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
