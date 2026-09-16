/**
 * Dashboard Queries - Tests
 * @module entities/dashboard/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useDashboardSummary } from './dashboard.queries';

describe('Dashboard Queries', () => {
    describe('useDashboardSummary', () => {
        it('fetches dashboard summary data', async () => {
            const { result } = renderHook(() => useDashboardSummary(), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(result.current.data!.counts).toBeDefined();
            expect(result.current.data!.counts.campaigns).toBeDefined();
            expect(result.current.data!.counts.campaigns.total).toBeGreaterThan(0);
            expect(result.current.data!.counts.fsecs).toBeDefined();
            expect(result.current.data!.counts.fas).toBeDefined();
            expect(result.current.data!.recentActivity).toBeDefined();
            expect(Array.isArray(result.current.data!.recentActivity)).toBe(true);
        });
    });
});
