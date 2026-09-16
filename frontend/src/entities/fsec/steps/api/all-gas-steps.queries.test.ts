/**
 * All Gas Steps Aggregated Query - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useAllGasStepsByFsec } from './all-gas-steps.queries';

describe('All Gas Steps Queries', () => {
    describe('useAllGasStepsByFsec', () => {
        it('fetches all gas steps for a FSEC in a single request', async () => {
            const fsecVersionUuid = crypto.randomUUID();
            const { result } = renderHook(() => useAllGasStepsByFsec(fsecVersionUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(result.current.data!.airtightnessTestLp).toBeDefined();
            expect(result.current.data!.gasFillingBp).toBeDefined();
            expect(result.current.data!.gasFillingHp).toBeDefined();
            expect(result.current.data!.permeation).toBeDefined();
            expect(result.current.data!.depressurization).toBeDefined();
            expect(result.current.data!.repressurization).toBeDefined();
        });

        it('does not fetch when fsecVersionUuid is empty', () => {
            const { result } = renderHook(() => useAllGasStepsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
