/**
 * Embase Queries - Tests
 * @module entities/embase/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useEmbases, useEmbase, useEmbaseFsecHistory } from './embase.queries';

describe('Embase Queries', () => {
    describe('useEmbases', () => {
        it('fetches all embases', async () => {
            const { result } = renderHook(() => useEmbases(), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
            expect(result.current.data!.length).toBeGreaterThan(0);
        });
    });

    describe('useEmbase', () => {
        it('fetches a single embase by UUID', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useEmbase(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useEmbase(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useEmbaseFsecHistory', () => {
        it('fetches FSEC history for an embase', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useEmbaseFsecHistory(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useEmbaseFsecHistory(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
