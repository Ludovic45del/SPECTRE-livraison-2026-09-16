/**
 * Planning Queries - Tests
 * @module entities/planning/api
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { server } from '@test/test-utils';
import { planningHandlers } from '@test/mocks/planning-handlers';
import {
    useWeekStates,
    useMemberPeriods,
    useCellAnnotations,
    useFsecCellLinks,
    useCampaignSteps,
    usePlanningSteps,
    useLabEvents,
} from './planning.queries';

describe('Planning Queries', () => {
    // Use planning-specific handlers for these tests
    beforeEach(() => {
        server.use(...planningHandlers);
    });

    describe('useWeekStates', () => {
        it('fetches week states for a year', async () => {
            const { result } = renderHook(() => useWeekStates(2025), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('useMemberPeriods', () => {
        it('fetches member periods for a year', async () => {
            const { result } = renderHook(() => useMemberPeriods(2025), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('useCellAnnotations', () => {
        it('fetches cell annotations for a year', async () => {
            const { result } = renderHook(() => useCellAnnotations(2025), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('useFsecCellLinks', () => {
        it('fetches FSEC cell links for a year', async () => {
            const { result } = renderHook(() => useFsecCellLinks(2025), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('useCampaignSteps', () => {
        it('fetches campaign steps for a year', async () => {
            const { result } = renderHook(() => useCampaignSteps(2025), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('useLabEvents', () => {
        it('fetches lab events', async () => {
            const { result } = renderHook(() => useLabEvents(), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });
    });

    describe('usePlanningSteps', () => {
        it('fetches the planning step referential', async () => {
            const { result } = renderHook(() => usePlanningSteps(), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(Array.isArray(result.current.data)).toBe(true);
            expect(result.current.data!.length).toBeGreaterThan(0);
            expect(result.current.data![0]).toHaveProperty('label');
            expect(result.current.data![0]).toHaveProperty('displayOrder');
        });
    });
});
