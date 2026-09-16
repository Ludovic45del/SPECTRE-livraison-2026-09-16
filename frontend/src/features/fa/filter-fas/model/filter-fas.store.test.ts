/**
 * Unit tests for FA Filters Store
 * @module features/fa/filter-fas/model
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFilterFasStore } from './filter-fas.store';

describe('useFilterFasStore', () => {
    // Reset store before each test
    beforeEach(() => {
        const { result } = renderHook(() => useFilterFasStore());
        act(() => {
            result.current.resetFilters();
        });
    });

    describe('initial state', () => {
        it('should have default filters with current year', () => {
            const { result } = renderHook(() => useFilterFasStore());
            const currentYear = new Date().getFullYear();

            expect(result.current.filters).toEqual({
                name: '',
                status: null,
                criticality: null,
                fsec: null,
                year: currentYear,
                installation: null,
            });
        });
    });

    describe('setFilter', () => {
        it('should update name filter', () => {
            const { result } = renderHook(() => useFilterFasStore());

            act(() => {
                result.current.setFilter('name', 'FA_2025');
            });

            expect(result.current.filters.name).toBe('FA_2025');
        });

        it('should update status filter', () => {
            const { result } = renderHook(() => useFilterFasStore());

            act(() => {
                result.current.setFilter('status', 1);
            });

            expect(result.current.filters.status).toBe(1);
        });

        it('should update criticality filter', () => {
            const { result } = renderHook(() => useFilterFasStore());

            act(() => {
                result.current.setFilter('criticality', 2);
            });

            expect(result.current.filters.criticality).toBe(2);
        });

        it('should update fsec filter', () => {
            const { result } = renderHook(() => useFilterFasStore());
            const fsecId = 'fsec-version-uuid-123';

            act(() => {
                result.current.setFilter('fsec', fsecId);
            });

            expect(result.current.filters.fsec).toBe(fsecId);
        });

        it('should update year filter', () => {
            const { result } = renderHook(() => useFilterFasStore());

            act(() => {
                result.current.setFilter('year', 2024);
            });

            expect(result.current.filters.year).toBe(2024);
        });

        it('should set filter to null', () => {
            const { result } = renderHook(() => useFilterFasStore());

            // First set a value
            act(() => {
                result.current.setFilter('status', 1);
            });
            expect(result.current.filters.status).toBe(1);

            // Then set to null
            act(() => {
                result.current.setFilter('status', null);
            });
            expect(result.current.filters.status).toBeNull();
        });

        it('should preserve other filters when updating one', () => {
            const { result } = renderHook(() => useFilterFasStore());

            act(() => {
                result.current.setFilter('name', 'FA_Test');
                result.current.setFilter('status', 1);
                result.current.setFilter('criticality', 2);
            });

            // Update only status
            act(() => {
                result.current.setFilter('status', 0);
            });

            expect(result.current.filters.name).toBe('FA_Test');
            expect(result.current.filters.status).toBe(0);
            expect(result.current.filters.criticality).toBe(2);
        });
    });

    describe('resetFilters', () => {
        it('should reset all filters to initial values', () => {
            const { result } = renderHook(() => useFilterFasStore());
            const currentYear = new Date().getFullYear();

            // Set various filters
            act(() => {
                result.current.setFilter('name', 'FA_Search');
                result.current.setFilter('status', 2);
                result.current.setFilter('criticality', 1);
                result.current.setFilter('fsec', 'some-fsec-id');
                result.current.setFilter('year', 2023);
            });

            // Verify filters are set
            expect(result.current.filters.name).toBe('FA_Search');
            expect(result.current.filters.status).toBe(2);

            // Reset
            act(() => {
                result.current.resetFilters();
            });

            // Verify reset
            expect(result.current.filters).toEqual({
                name: '',
                status: null,
                criticality: null,
                fsec: null,
                year: currentYear,
                installation: null,
            });
        });

        it('should restore year to current year', () => {
            const { result } = renderHook(() => useFilterFasStore());
            const currentYear = new Date().getFullYear();

            act(() => {
                result.current.setFilter('year', 2020);
            });

            expect(result.current.filters.year).toBe(2020);

            act(() => {
                result.current.resetFilters();
            });

            expect(result.current.filters.year).toBe(currentYear);
        });
    });

    describe('persistence across components', () => {
        it('should share state between multiple hooks', () => {
            const { result: hook1 } = renderHook(() => useFilterFasStore());
            const { result: hook2 } = renderHook(() => useFilterFasStore());

            // Update via first hook
            act(() => {
                hook1.current.setFilter('name', 'SharedFilter');
            });

            // Verify second hook sees the update
            expect(hook2.current.filters.name).toBe('SharedFilter');
        });
    });

    describe('type safety', () => {
        it('should only accept valid filter keys', () => {
            const { result } = renderHook(() => useFilterFasStore());

            // These should all compile and work
            act(() => {
                result.current.setFilter('name', 'test');
                result.current.setFilter('status', 1);
                result.current.setFilter('criticality', 2);
                result.current.setFilter('fsec', 'uuid');
                result.current.setFilter('year', 2025);
            });

            // TypeScript would catch invalid keys at compile time
            // e.g., result.current.setFilter('invalid', 'value') would be a TS error
        });

        it('should only accept valid filter values for each key', () => {
            const { result } = renderHook(() => useFilterFasStore());

            // String for name
            act(() => {
                result.current.setFilter('name', 'test string');
            });
            expect(typeof result.current.filters.name).toBe('string');

            // Number or null for status
            act(() => {
                result.current.setFilter('status', 0);
            });
            expect(typeof result.current.filters.status).toBe('number');

            // Number or null for year
            act(() => {
                result.current.setFilter('year', 2025);
            });
            expect(typeof result.current.filters.year).toBe('number');
        });
    });
});
