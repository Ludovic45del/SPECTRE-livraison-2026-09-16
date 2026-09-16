/**
 * FA Filters Store
 * @module features/fa/filter-fas
 */

import { create } from 'zustand';

const CURRENT_YEAR = new Date().getFullYear();

export interface FaFilters {
    name: string;
    status: number | null;
    criticality: number | null;
    fsec: string | null;
    year: number | null;
    installation: 'LMJ' | 'OMEGA' | null;
}

interface FilterFasState {
    filters: FaFilters;
    setFilter: <K extends keyof FaFilters>(key: K, value: FaFilters[K]) => void;
    resetFilters: () => void;
}

const initialFilters: FaFilters = {
    name: '',
    status: null,
    criticality: null,
    fsec: null,
    year: CURRENT_YEAR,
    installation: null,
};

export const useFilterFasStore = create<FilterFasState>((set) => ({
    filters: initialFilters,
    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),
    resetFilters: () => set({ filters: initialFilters }),
}));
