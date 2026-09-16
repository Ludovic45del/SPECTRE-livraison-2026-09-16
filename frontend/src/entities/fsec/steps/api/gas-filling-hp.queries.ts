/**
 * Gas Filling HP (High Pressure) Steps Queries - TanStack Query Hooks
 * @module entities/steps/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { stepKeys } from './steps.keys';
import { GasFillingHpStepListSchema, GasFillingHpStepSchema, GasFillingHpStep } from '../model';

// ============================================================================
// GAS FILLING HP (HIGH PRESSURE) STEPS (Step ID: 9)
// ============================================================================

export function useGasFillingHpStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.gasFillingHp.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<GasFillingHpStep[]> => {
            const data = await api.get(`/gas-filling-hp-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return GasFillingHpStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useGasFillingHpStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.gasFillingHp.detail(uuid),
        queryFn: async ({ signal }): Promise<GasFillingHpStep> => {
            const data = await api.get(`/gas-filling-hp-steps/${uuid}/`, undefined, signal);
            return GasFillingHpStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateGasFillingHpStepInput {
    fsecVersionId: string;
    embaseId?: string | null;
    leakRateDtri?: string | null;
    gasType?: string | null;
    experimentPressure?: number | null;
    operator?: string | null;
    operatorUserUuid?: string | null;
    dateOfFulfilment?: Date | null;
    gasBase?: number | null;
    gasContainer?: number | null;
    observations?: string | null;
}

interface UpdateGasFillingHpStepInput extends CreateGasFillingHpStepInput {
    uuid: string;
}

function gasFillingHpStepToApi(input: CreateGasFillingHpStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        embase_id: input.embaseId ?? null,
        leak_rate_dtri: input.leakRateDtri ?? null,
        gas_type: input.gasType ?? null,
        experiment_pressure: input.experimentPressure ?? null,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date_of_fulfilment: formatDateToIso(input.dateOfFulfilment),
        gas_base: input.gasBase ?? null,
        gas_container: input.gasContainer ?? null,
        observations: input.observations ?? null,
    };
}

export function useCreateGasFillingHpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateGasFillingHpStepInput): Promise<GasFillingHpStep> => {
            const response = await api.post('/gas-filling-hp-steps/', gasFillingHpStepToApi(input));
            return GasFillingHpStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingHp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useUpdateGasFillingHpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateGasFillingHpStepInput): Promise<GasFillingHpStep> => {
            const response = await api.put(`/gas-filling-hp-steps/${input.uuid}/`, gasFillingHpStepToApi(input));
            return GasFillingHpStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingHp.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingHp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useDeleteGasFillingHpStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/gas-filling-hp-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.gasFillingHp.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}
