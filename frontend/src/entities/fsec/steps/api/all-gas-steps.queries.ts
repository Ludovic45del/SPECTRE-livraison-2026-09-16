/**
 * All Gas Steps Aggregated Query - TanStack Query Hook
 * @module entities/steps/api
 *
 * Performance optimization: fetches all 6 gas step types in a single HTTP request.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { stepKeys } from './steps.keys';
import {
    AirtightnessStepListSchema,
    AirtightnessStep,
    GasFillingBpStepListSchema,
    GasFillingBpStep,
    GasFillingHpStepListSchema,
    GasFillingHpStep,
    PermeationStepListSchema,
    PermeationStep,
    DepressurizationStepListSchema,
    DepressurizationStep,
    RepressurizationStepListSchema,
    RepressurizationStep,
} from '../model';

// ============================================================================
// ALL GAS STEPS (Aggregated endpoint - Performance optimization)
// ============================================================================

/**
 * Response type for the aggregated gas steps endpoint.
 * Returns all 6 gas step types in a single HTTP request.
 */
export interface AllGasStepsResponse {
    airtightnessTestLp: AirtightnessStep[];
    gasFillingBp: GasFillingBpStep[];
    gasFillingHp: GasFillingHpStep[];
    permeation: PermeationStep[];
    depressurization: DepressurizationStep[];
    repressurization: RepressurizationStep[];
}

/** API response shape for all gas steps endpoint */
interface AllGasStepsApiResponse {
    airtightnessTestLp: unknown;
    gasFillingBp: unknown;
    gasFillingHp: unknown;
    permeation: unknown;
    depressurization: unknown;
    repressurization: unknown;
}

/**
 * Fetches all gas steps for a FSEC version in a single request.
 *
 * This hook optimizes performance by reducing 6 HTTP requests to 1.
 * Use this instead of calling individual step hooks when you need all gas steps.
 *
 * @param fsecVersionUuid - The FSEC version UUID
 * @returns Query result with all gas step types
 *
 * @example
 * const { data, isLoading } = useAllGasStepsByFsec(fsecVersionId);
 * if (data) {
 *   // data.airtightnessTestLp, data.gasFillingBp, etc.
 * }
 */
export function useAllGasStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.allGasSteps.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<AllGasStepsResponse> => {
            const data = await api.get<AllGasStepsApiResponse>(`/all-gas-steps/${fsecVersionUuid}/`, undefined, signal);
            // Validate each step type with its respective schema
            return {
                airtightnessTestLp: AirtightnessStepListSchema.parse(data.airtightnessTestLp),
                gasFillingBp: GasFillingBpStepListSchema.parse(data.gasFillingBp),
                gasFillingHp: GasFillingHpStepListSchema.parse(data.gasFillingHp),
                permeation: PermeationStepListSchema.parse(data.permeation),
                depressurization: DepressurizationStepListSchema.parse(data.depressurization),
                repressurization: RepressurizationStepListSchema.parse(data.repressurization),
            };
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}
