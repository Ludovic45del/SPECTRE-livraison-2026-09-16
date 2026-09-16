/**
 * Gas Filling HP Step Queries - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useGasFillingHpStepsByFsec, useGasFillingHpStep } from './gas-filling-hp.queries';

describe('Gas Filling HP Step Queries', () => {
    describe('useGasFillingHpStepsByFsec', () => {
        it('fetches gas filling HP steps for a FSEC', async () => {
            const fsecVersionUuid = crypto.randomUUID();
            const { result } = renderHook(() => useGasFillingHpStepsByFsec(fsecVersionUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when fsecVersionUuid is empty', () => {
            const { result } = renderHook(() => useGasFillingHpStepsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useGasFillingHpStep', () => {
        it('fetches a single gas filling HP step', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useGasFillingHpStep(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useGasFillingHpStep(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
