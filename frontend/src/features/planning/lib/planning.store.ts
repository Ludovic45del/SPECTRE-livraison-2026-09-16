/**
 * Planning Store — Zustand store pour l'état UI du planning
 * @module features/planning/lib
 */

import dayjs from 'dayjs';
import { create } from 'zustand';
import { DEFAULT_FILTERS, type PlanningFilters, type SectionId } from './planning.constants';

/** Navigation step used for forward/backward pagination. */
const NAVIGATION_STEP = { unit: 'month' as const, amount: 1 };

// ====================== Event Drag & Drop ======================

export interface EventDragInfo {
    machineKey: string;
    rowId: string;
    eventIndex: number;
    originColIndex: number;
    currentColIndex: number;
    currentRowId: string;
}

// ====================== Store Interface ======================

interface PlanningUIState {
    // Navigation
    anchorDate: string;
    setAnchorDate: (date: string) => void;
    navigateForward: () => void;
    navigateBackward: () => void;
    goToToday: () => void;

    // Year
    selectedYear: number;
    setSelectedYear: (year: number) => void;

    // Sections
    collapsedSections: Record<string, boolean>;
    toggleSection: (id: SectionId) => void;

    // Step group collapse (campaign step headers)
    collapsedStepGroups: Record<string, boolean>;
    toggleStepGroup: (campaignUuid: string, stepLabel: string) => void;

    // Event drag & drop
    eventDrag: EventDragInfo | null;
    startEventDrag: (machineKey: string, rowId: string, eventIndex: number, colIndex: number) => void;
    updateEventDrag: (colIndex: number, rowId: string) => void;
    endEventDrag: () => EventDragInfo | null;

    // Reset transient UI state
    resetUIState: () => void;

    // Filters
    filters: PlanningFilters;
    setFilters: (fn: (prev: PlanningFilters) => PlanningFilters) => void;
    resetFilters: () => void;
}

// ====================== Store ======================

export const usePlanningStore = create<PlanningUIState>((set, get) => ({
    // Navigation
    anchorDate: dayjs().format('YYYY-MM-DD'),
    setAnchorDate: (date) => set({ anchorDate: date }),
    navigateForward: () => {
        const { anchorDate } = get();
        const { unit, amount } = NAVIGATION_STEP;
        set({ anchorDate: dayjs(anchorDate).add(amount, unit).format('YYYY-MM-DD') });
    },
    navigateBackward: () => {
        const { anchorDate } = get();
        const { unit, amount } = NAVIGATION_STEP;
        set({ anchorDate: dayjs(anchorDate).subtract(amount, unit).format('YYYY-MM-DD') });
    },
    goToToday: () => set({ anchorDate: dayjs().format('YYYY-MM-DD') }),

    // Year
    selectedYear: dayjs().year(),
    setSelectedYear: (year) => set({ selectedYear: year }),

    // Sections
    collapsedSections: {},
    toggleSection: (id) =>
        set((state) => ({
            collapsedSections: {
                ...state.collapsedSections,
                [id]: !state.collapsedSections[id],
            },
        })),

    // Step group collapse
    collapsedStepGroups: {},
    toggleStepGroup: (campaignUuid, stepLabel) => {
        const key = `${campaignUuid}#${stepLabel}`;
        set((state) => ({
            collapsedStepGroups: {
                ...state.collapsedStepGroups,
                [key]: !state.collapsedStepGroups[key],
            },
        }));
    },

    // Event drag & drop
    eventDrag: null,
    startEventDrag: (machineKey, rowId, eventIndex, colIndex) =>
        set({
            eventDrag: {
                machineKey,
                rowId,
                eventIndex,
                originColIndex: colIndex,
                currentColIndex: colIndex,
                currentRowId: rowId,
            },
        }),
    updateEventDrag: (colIndex, rowId) =>
        set((s) =>
            s.eventDrag ? { eventDrag: { ...s.eventDrag, currentColIndex: colIndex, currentRowId: rowId } } : {},
        ),
    endEventDrag: () => {
        const drag = get().eventDrag;
        set({ eventDrag: null });
        return drag;
    },

    // Reset transient UI state
    resetUIState: () => set({ eventDrag: null }),

    // Filters
    filters: DEFAULT_FILTERS,
    setFilters: (fn) => set((s) => ({ filters: fn(s.filters) })),
    resetFilters: () => {
        set({
            filters: { ...DEFAULT_FILTERS, year: new Date().getFullYear() },
            anchorDate: dayjs().format('YYYY-MM-DD'),
            selectedYear: dayjs().year(),
        });
    },
}));
