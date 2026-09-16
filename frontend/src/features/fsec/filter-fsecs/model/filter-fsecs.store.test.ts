/**
 * Tests for Filter FSECs Store
 *
 * Tests Zustand store for FSEC filtering functionality.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFilterFsecsStore } from './filter-fsecs.store';

describe('useFilterFsecsStore', () => {
    // Reset store before each test
    beforeEach(() => {
        const { result } = renderHook(() => useFilterFsecsStore());
        act(() => {
            result.current.resetFilters();
        });
    });

    describe('Initial State', () => {
        it('should have empty filters initially', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            expect(result.current.filters).toBeDefined();
            expect(result.current.filters.name).toBe('');
            expect(result.current.filters.status).toBeNull();
            expect(result.current.filters.category).toBeNull();
        });
    });

    describe('setFilter', () => {
        it('should update name filter', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('name', 'FSEC Test');
            });

            expect(result.current.filters.name).toBe('FSEC Test');
        });

        it('should update status filter', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('status', 1);
            });

            expect(result.current.filters.status).toBe(1);
        });

        it('should update category filter', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('category', 2);
            });

            expect(result.current.filters.category).toBe(2);
        });

        it('should preserve other filters when updating one', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('name', 'Test');
                result.current.setFilter('status', 1);
            });

            expect(result.current.filters.name).toBe('Test');
            expect(result.current.filters.status).toBe(1);
        });
    });

    describe('resetFilters', () => {
        it('should reset all filters to initial state', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            // Set some filters
            act(() => {
                result.current.setFilter('name', 'Test');
                result.current.setFilter('status', 1);
                result.current.setFilter('category', 2);
            });

            // Reset
            act(() => {
                result.current.resetFilters();
            });

            expect(result.current.filters.name).toBe('');
            expect(result.current.filters.status).toBeNull();
            expect(result.current.filters.category).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string filter', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('name', '');
            });

            expect(result.current.filters.name).toBe('');
            expect(result.current.filters.status).toBeNull();
            expect(result.current.filters.category).toBeNull();
            expect(result.current.filters.campaign).toBeNull();
        });

        it('should handle null filter value', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('status', null);
            });

            expect(result.current.filters.status).toBeNull();
        });

        it('should handle zero as valid filter value', () => {
            const { result } = renderHook(() => useFilterFsecsStore());

            act(() => {
                result.current.setFilter('status', 0);
            });

            expect(result.current.filters.status).toBe(0);
        });
    });
});
