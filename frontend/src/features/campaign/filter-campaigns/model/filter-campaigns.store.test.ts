/**
 * Tests for Filter Campaigns Store
 *
 * Tests Zustand store for Campaign filtering functionality.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFilterCampaignsStore } from './filter-campaigns.store';

describe('useFilterCampaignsStore', () => {
    // Reset store before each test
    beforeEach(() => {
        const { result } = renderHook(() => useFilterCampaignsStore());
        act(() => {
            result.current.resetFilters();
        });
    });

    describe('Initial State', () => {
        it('should have default filters initially', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            expect(result.current.filters).toBeDefined();
            expect(result.current.filters.name).toBe('');
            expect(result.current.filters.semester).toBeNull();
            expect(result.current.filters.status).toBeNull();
        });
    });

    describe('setFilter', () => {
        it('should update name filter', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('name', 'Campagne Test');
            });

            expect(result.current.filters.name).toBe('Campagne Test');
        });

        it('should update year filter', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('year', 2025);
            });

            expect(result.current.filters.year).toBe(2025);
        });

        it('should update semester filter', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('semester', 'S1');
            });

            expect(result.current.filters.semester).toBe('S1');
        });

        it('should update status filter', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('status', 'En cours');
            });

            expect(result.current.filters.status).toBe('En cours');
        });

        it('should preserve other filters when updating one', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('name', 'Test');
                result.current.setFilter('year', 2025);
                result.current.setFilter('semester', 'S2');
            });

            expect(result.current.filters.name).toBe('Test');
            expect(result.current.filters.year).toBe(2025);
            expect(result.current.filters.semester).toBe('S2');
        });
    });

    describe('resetFilters', () => {
        it('should reset all filters to initial state', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            // Set some filters
            act(() => {
                result.current.setFilter('name', 'Test');
                result.current.setFilter('year', 2025);
                result.current.setFilter('semester', 'S1');
                result.current.setFilter('status', 'En cours');
            });

            // Reset
            act(() => {
                result.current.resetFilters();
            });

            expect(result.current.filters.name).toBe('');
            expect(result.current.filters.semester).toBeNull();
            expect(result.current.filters.status).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string filter', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('name', '');
            });

            expect(result.current.filters.name).toBe('');
        });

        it('should handle null filter value', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('year', null);
            });

            expect(result.current.filters.year).toBeNull();
        });

        it('should handle setting status to null', () => {
            const { result } = renderHook(() => useFilterCampaignsStore());

            act(() => {
                result.current.setFilter('status', 'Active');
            });

            expect(result.current.filters.status).toBe('Active');

            act(() => {
                result.current.setFilter('status', null);
            });

            expect(result.current.filters.status).toBeNull();
        });
    });
});
