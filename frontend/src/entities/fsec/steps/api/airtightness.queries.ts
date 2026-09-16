/**
 * Airtightness Test LP Steps Queries - TanStack Query Hooks
 * @module entities/steps/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { stepKeys } from './steps.keys';
import { AirtightnessStepListSchema, AirtightnessStepSchema, AirtightnessStep } from '../model';

// ============================================================================
// AIRTIGHTNESS TEST LP STEPS (Step ID: 10)
// ============================================================================

export function useAirtightnessStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.airtightnessTestLp.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<AirtightnessStep[]> => {
            const data = await api.get(`/airtightness-test-lp-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return AirtightnessStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useAirtightnessStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.airtightnessTestLp.detail(uuid),
        queryFn: async ({ signal }): Promise<AirtightnessStep> => {
            const data = await api.get(`/airtightness-test-lp-steps/${uuid}/`, undefined, signal);
            return AirtightnessStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateAirtightnessStepInput {
    fsecVersionId: string;
    embaseId?: string | null;
    leakRateDtri?: string | null;
    gasType?: string | null;
    experimentPressure?: number | null;
    airtightnessTestDuration?: number | null;
    operator?: string | null;
    operatorUserUuid?: string | null;
    dateOfFulfilment?: Date | null;
    phase?: 'BP' | 'HP';
}

interface UpdateAirtightnessStepInput extends CreateAirtightnessStepInput {
    uuid: string;
}

function airtightnessStepToApi(input: CreateAirtightnessStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        embase_id: input.embaseId ?? null,
        leak_rate_dtri: input.leakRateDtri ?? null,
        gas_type: input.gasType ?? null,
        experiment_pressure: input.experimentPressure ?? null,
        airtightness_test_duration: input.airtightnessTestDuration ?? null,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date_of_fulfilment: formatDateToIso(input.dateOfFulfilment),
        phase: input.phase ?? 'BP',
    };
}

export function useCreateAirtightnessStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateAirtightnessStepInput): Promise<AirtightnessStep> => {
            const response = await api.post('/airtightness-test-lp-steps/', airtightnessStepToApi(input));
            return AirtightnessStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.airtightnessTestLp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useUpdateAirtightnessStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateAirtightnessStepInput): Promise<AirtightnessStep> => {
            const response = await api.put(`/airtightness-test-lp-steps/${input.uuid}/`, airtightnessStepToApi(input));
            return AirtightnessStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.airtightnessTestLp.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.airtightnessTestLp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useDeleteAirtightnessStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/airtightness-test-lp-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.airtightnessTestLp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}
