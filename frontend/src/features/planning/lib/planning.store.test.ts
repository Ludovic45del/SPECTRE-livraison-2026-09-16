/**
 * Tests for the Planning Zustand store.
 *
 * Covers: navigation, sections, step groups, event drag, filters.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import dayjs from 'dayjs';

import { usePlanningStore } from './planning.store';
import { DEFAULT_FILTERS } from './planning.constants';

// Reset store before each test
beforeEach(() => {
    const { result } = renderHook(() => usePlanningStore());
    act(() => {
        result.current.goToToday();
        result.current.resetUIState();
        result.current.resetFilters();
    });
    // Reset collapsed sections and step groups
    act(() => {
        usePlanningStore.setState({
            collapsedSections: {},
            collapsedStepGroups: {},
            eventDrag: null,
        });
    });
});

// ====================== Navigation ======================

describe('Navigation', () => {
    it('initial anchorDate is today', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.anchorDate).toBe(dayjs().format('YYYY-MM-DD'));
    });

    it('setAnchorDate updates anchorDate', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setAnchorDate('2025-06-15'));
        expect(result.current.anchorDate).toBe('2025-06-15');
    });

    it('navigateForward advances by 1 month', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setAnchorDate('2025-03-15'));
        act(() => result.current.navigateForward());
        expect(result.current.anchorDate).toBe('2025-04-15');
    });

    it('navigateBackward goes back by 1 month', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setAnchorDate('2025-03-15'));
        act(() => result.current.navigateBackward());
        expect(result.current.anchorDate).toBe('2025-02-15');
    });

    it('goToToday resets to today', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setAnchorDate('2020-01-01'));
        act(() => result.current.goToToday());
        expect(result.current.anchorDate).toBe(dayjs().format('YYYY-MM-DD'));
    });
});

// ====================== Year ======================

describe('Year', () => {
    it('initial selectedYear is current year', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.selectedYear).toBe(dayjs().year());
    });

    it('setSelectedYear updates year', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setSelectedYear(2030));
        expect(result.current.selectedYear).toBe(2030);
    });
});

// ====================== Sections ======================

describe('Sections', () => {
    it('initially no sections collapsed', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.collapsedSections).toEqual({});
    });

    it('toggleSection collapses a section', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.toggleSection('equipe'));
        expect(result.current.collapsedSections['equipe']).toBe(true);
    });

    it('toggleSection twice restores to expanded', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.toggleSection('equipe'));
        act(() => result.current.toggleSection('equipe'));
        expect(result.current.collapsedSections['equipe']).toBe(false);
    });

    it('toggleSection is independent per section', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.toggleSection('equipe'));
        act(() => result.current.toggleSection('vie-labo'));
        expect(result.current.collapsedSections['equipe']).toBe(true);
        expect(result.current.collapsedSections['vie-labo']).toBe(true);
    });
});

// ====================== Step Groups ======================

describe('Step Groups', () => {
    it('initially no groups collapsed', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.collapsedStepGroups).toEqual({});
    });

    it('toggleStepGroup collapses with composite key', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.toggleStepGroup('uuid-1', 'Assemblage'));
        expect(result.current.collapsedStepGroups['uuid-1#Assemblage']).toBe(true);
    });

    it('toggleStepGroup twice restores', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.toggleStepGroup('uuid-1', 'Assemblage'));
        act(() => result.current.toggleStepGroup('uuid-1', 'Assemblage'));
        expect(result.current.collapsedStepGroups['uuid-1#Assemblage']).toBe(false);
    });
});

// ====================== Event Drag & Drop ======================

describe('Event Drag & Drop', () => {
    it('initial eventDrag is null', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.eventDrag).toBeNull();
    });

    it('startEventDrag sets drag info', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.startEventDrag('machine-key', 'row-1', 0, 3));
        expect(result.current.eventDrag).toEqual({
            machineKey: 'machine-key',
            rowId: 'row-1',
            eventIndex: 0,
            originColIndex: 3,
            currentColIndex: 3,
            currentRowId: 'row-1',
        });
    });

    it('updateEventDrag updates column and row', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.startEventDrag('mk', 'r1', 0, 3));
        act(() => result.current.updateEventDrag(6, 'r2'));
        expect(result.current.eventDrag!.currentColIndex).toBe(6);
        expect(result.current.eventDrag!.currentRowId).toBe('r2');
    });

    it('endEventDrag returns drag info and clears state', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.startEventDrag('mk', 'r1', 0, 3));
        let dragInfo: ReturnType<typeof result.current.endEventDrag>;
        act(() => {
            dragInfo = result.current.endEventDrag();
        });
        expect(dragInfo!).not.toBeNull();
        expect(dragInfo!.machineKey).toBe('mk');
        expect(result.current.eventDrag).toBeNull();
    });
});

// ====================== Filters ======================

describe('Filters', () => {
    it('initial filters match DEFAULT_FILTERS', () => {
        const { result } = renderHook(() => usePlanningStore());
        expect(result.current.filters.installations).toEqual(DEFAULT_FILTERS.installations);
        // etapeLabels vide = toutes les étapes (filtre désactivé par défaut).
        expect(result.current.filters.etapeLabels).toEqual([]);
        expect(result.current.filters.campaignUuid).toBeNull();
    });

    it('setFilters updates a specific filter field', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setFilters((prev) => ({ ...prev, campaignUuid: 'test-uuid' })));
        expect(result.current.filters.campaignUuid).toBe('test-uuid');
    });

    it('setFilters preserves other fields', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => result.current.setFilters((prev) => ({ ...prev, campaignUuid: 'x' })));
        expect(result.current.filters.installations).toEqual(DEFAULT_FILTERS.installations);
    });

    it('resetFilters resets to defaults and resets navigation', () => {
        const { result } = renderHook(() => usePlanningStore());
        act(() => {
            result.current.setAnchorDate('2020-01-01');
            result.current.setSelectedYear(2020);
            result.current.setFilters((prev) => ({ ...prev, campaignUuid: 'x', installations: [] }));
        });
        act(() => result.current.resetFilters());
        expect(result.current.filters.installations).toEqual(DEFAULT_FILTERS.installations);
        expect(result.current.filters.campaignUuid).toBeNull();
        expect(result.current.anchorDate).toBe(dayjs().format('YYYY-MM-DD'));
        expect(result.current.selectedYear).toBe(dayjs().year());
    });
});
