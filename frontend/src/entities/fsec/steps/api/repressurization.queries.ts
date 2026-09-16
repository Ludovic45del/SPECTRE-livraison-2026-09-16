/**
 * Repressurization Steps Queries - TanStack Query Hooks
 * @module entities/steps/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { stepKeys } from './steps.keys';
import { RepressurizationStepListSchema, RepressurizationStepSchema, RepressurizationStep } from '../model';

// ============================================================================
// REPRESSURIZATION STEPS (Step ID: 14)
// ============================================================================

export function useRepressurizationStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.repressurization.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<RepressurizationStep[]> => {
            const data = await api.get(`/repressurization-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return RepressurizationStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useRepressurizationStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.repressurization.detail(uuid),
        queryFn: async ({ signal }): Promise<RepressurizationStep> => {
            const data = await api.get(`/repressurization-steps/${uuid}/`, undefined, signal);
            return RepressurizationStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateRepressurizationStepInput {
    fsecVersionId: string;
    operator?: string | null;
    operatorUserUuid?: string | null;
    gasType?: string | null;
    startDate?: Date | null;
    estimatedEndDate?: Date | null;
    sensorPressure?: number | null;
    computedPressure?: number | null;
}

interface UpdateRepressurizationStepInput extends CreateRepressurizationStepInput {
    uuid: string;
}

function repressurizationStepToApi(input: CreateRepressurizationStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        gas_type: input.gasType ?? null,
        // start_date/estimated_end_date sont des DateTimeField backend (serializers.py) :
        // on envoie l'ISO complet — l'instant est préservé (Django convertit en Europe/Paris),
        // contrairement à l'ancienne troncature date-only qui décalait de J-1.
        start_date: input.startDate?.toISOString() ?? null,
        estimated_end_date: input.estimatedEndDate?.toISOString() ?? null,
        sensor_pressure: input.sensorPressure ?? null,
        computed_pressure: input.computedPressure ?? null,
    };
}

export function useCreateRepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateRepressurizationStepInput): Promise<RepressurizationStep> => {
            const response = await api.post('/repressurization-steps/', repressurizationStepToApi(input));
            return RepressurizationStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.repressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useUpdateRepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateRepressurizationStepInput): Promise<RepressurizationStep> => {
            const response = await api.put(`/repressurization-steps/${input.uuid}/`, repressurizationStepToApi(input));
            return RepressurizationStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.repressurization.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.repressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}

export function useDeleteRepressurizationStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/repressurization-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.repressurization.byFsec(variables.fsecVersionId),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.allGasSteps.byFsec(variables.fsecVersionId),
            });
        },
    });
}
