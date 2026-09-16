/**
 * Depressurization Steps Queries - TanStack Query Hooks
 * @module entities/steps/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { stepKeys } from './steps.keys';
import { DepressurizationStepListSchema, DepressurizationStepSchema, DepressurizationStep } from '../model';

// ============================================================================
// DEPRESSURIZATION STEPS (Step ID: 13)
// ============================================================================

export function useDepressurizationStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.depressurization.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<DepressurizationStep[]> => {
            const data = await api.get(`/depressurization-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return DepressurizationStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useDepressurizationStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.depressurization.detail(uuid),
        queryFn: async ({ signal }): Promise<DepressurizationStep> => {
            const data = await api.get(`/depressurization-steps/${uuid}/`, undefined, signal);
            return DepressurizationStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateDepressurizationStepInput {
    fsecVersionId: string;
    operator?: string | null;
    operatorUserUuid?: string | null;
    dateOfFulfilment?: Date | null;
    pressureGauge?: number | null;
    enclosurePressureMeasured?: number | null;
    startTime?: Date | null;
    endTime?: Date | null;
    observations?: string | null;
    depressurizationTimeBeforeFiring?: number | null;
    computedPressureBeforeFiring?: number | null;
}

interface UpdateDepressurizationStepInput extends CreateDepressurizationStepInput {
    uuid: string;
}

function depressurizationStepToApi(input: CreateDepressurizationStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date_of_fulfilment: formatDateToIso(input.dateOfFulfilment),
        pressure_gauge: input.pressureGauge ?? null,
        enclosure_pressure_measured: input.enclosurePressureMeasured ?? null,
        // start_time/end_time sont des DateTimeField backend : ISO complet (instant préservé).
        start_time: input.startTime?.toISOString() ?? null,
        end_time: input.endTime?.toISOString() ?? null,
        observations: input.observations ?? null,
        depressurization_time_before_firing: input.depressurizationTimeBeforeFiring ?? null,
        computed_pressure_before_firing: input.computedPressureBeforeFiring ?? null,
    };
}

export function useCreateDepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateDepressurizationStepInput): Promise<DepressurizationStep> => {
            const response = await api.post('/depressurization-steps/', depressurizationStepToApi(input));
            return DepressurizationStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.depressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useUpdateDepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateDepressurizationStepInput): Promise<DepressurizationStep> => {
            const response = await api.put(`/depressurization-steps/${input.uuid}/`, depressurizationStepToApi(input));
            return DepressurizationStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.depressurization.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.depressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useDeleteDepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/depressurization-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.depressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}
