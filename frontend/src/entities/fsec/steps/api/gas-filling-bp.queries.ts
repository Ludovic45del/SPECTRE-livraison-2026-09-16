/**
 * Gas Filling BP (Low Pressure) Steps Queries - TanStack Query Hooks
 * @module entities/steps/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { stepKeys } from './steps.keys';
import { GasFillingBpStepListSchema, GasFillingBpStepSchema, GasFillingBpStep } from '../model';

// ============================================================================
// GAS FILLING BP (LOW PRESSURE) STEPS (Step ID: 11)
// ============================================================================

export function useGasFillingBpStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.gasFillingBp.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<GasFillingBpStep[]> => {
            const data = await api.get(`/gas-filling-bp-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return GasFillingBpStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useGasFillingBpStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.gasFillingBp.detail(uuid),
        queryFn: async ({ signal }): Promise<GasFillingBpStep> => {
            const data = await api.get(`/gas-filling-bp-steps/${uuid}/`, undefined, signal);
            return GasFillingBpStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateGasFillingBpStepInput {
    fsecVersionId: string;
    embaseId?: string | null;
    leakRateDtri?: string | null;
    gasType?: string | null;
    experimentPressure?: number | null;
    leakTestDuration?: number | null;
    operator?: string | null;
    operatorUserUuid?: string | null;
    dateOfFulfilment?: Date | null;
    gasBase?: number | null;
    gasContainer?: number | null;
    observations?: string | null;
}

interface UpdateGasFillingBpStepInput extends CreateGasFillingBpStepInput {
    uuid: string;
}

function gasFillingBpStepToApi(input: CreateGasFillingBpStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        embase_id: input.embaseId ?? null,
        leak_rate_dtri: input.leakRateDtri ?? null,
        gas_type: input.gasType ?? null,
        experiment_pressure: input.experimentPressure ?? null,
        leak_test_duration: input.leakTestDuration ?? null,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date_of_fulfilment: formatDateToIso(input.dateOfFulfilment),
        gas_base: input.gasBase ?? null,
        gas_container: input.gasContainer ?? null,
        observations: input.observations ?? null,
    };
}

export function useCreateGasFillingBpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateGasFillingBpStepInput): Promise<GasFillingBpStep> => {
            const response = await api.post('/gas-filling-bp-steps/', gasFillingBpStepToApi(input));
            return GasFillingBpStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingBp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useUpdateGasFillingBpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateGasFillingBpStepInput): Promise<GasFillingBpStep> => {
            const response = await api.put(`/gas-filling-bp-steps/${input.uuid}/`, gasFillingBpStepToApi(input));
            return GasFillingBpStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingBp.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingBp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useDeleteGasFillingBpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/gas-filling-bp-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingBp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}
