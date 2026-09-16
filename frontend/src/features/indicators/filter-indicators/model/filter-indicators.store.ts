/**
 * Filter Indicators Store - sélection de la période cible (année + semestre).
 * @module features/indicators/filter-indicators/model
 */

import { create } from 'zustand';

const CURRENT_YEAR = new Date().getFullYear();

/** null = année entière ; 1 = S1 (janv→juin) ; 2 = S2 (juil→déc). */
export type SemesterFilter = null | 1 | 2;

interface FilterIndicatorsStore {
    year: number;
    semester: SemesterFilter;
    setYear: (year: number) => void;
    setSemester: (semester: SemesterFilter) => void;
    reset: () => void;
}

export const useFilterIndicatorsStore = create<FilterIndicatorsStore>((set) => ({
    year: CURRENT_YEAR,
    semester: null,
    setYear: (year) => set({ year }),
    setSemester: (semester) => set({ semester }),
    reset: () => set({ year: CURRENT_YEAR, semester: null }),
}));
