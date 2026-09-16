/**
 * Etalonnage Queries - Tests
 * @module entities/etalonnage/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useEtalonnages } from './etalonnage.queries';

describe('Etalonnage Queries', () => {
    describe('useEtalonnages', () => {
        it('fetches etalonnages for an embase', async () => {
            const embaseUuid = crypto.randomUUID();
            const { result } = renderHook(() => useEtalonnages(embaseUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('fetches etalonnages filtered by voie', async () => {
            const embaseUuid = crypto.randomUUID();
            const { result } = renderHook(() => useEtalonnages(embaseUuid, 1), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when embaseUuid is empty', () => {
            const { result } = renderHook(() => useEtalonnages(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
