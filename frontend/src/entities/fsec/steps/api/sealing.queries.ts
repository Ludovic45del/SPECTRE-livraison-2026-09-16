/**
 * Sealing Step Queries - TanStack Query Hooks
 * @module entities/steps/api
 *
 * Sealing is linked 1:1 to MetrologyStep (not directly to FSEC)
 * Endpoint: /api/sealing-steps/metrology/{metrology_step_id}/
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { SealingStep, SealingStepSchema } from '../model';
import { stepKeys } from './steps.keys';

/**
 * Fetch sealing step by MetrologyStep UUID (1:1 relationship)
 */
export function useSealingStepByMetrology(metrologyStepId: string) {
    return useQuery({
        queryKey: stepKeys.sealing.byMetrology(metrologyStepId),
        queryFn: async ({ signal }): Promise<SealingStep | null> => {
            const data = await api.get(`/sealing-steps/metrology/${metrologyStepId}/`, undefined, signal);
            if (data === null || data === undefined) return null;
            return SealingStepSchema.parse(data);
        },
        enabled: Boolean(metrologyStepId),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single sealing step by UUID
 */
export function useSealingStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.sealing.detail(uuid),
        queryFn: async ({ signal }): Promise<SealingStep> => {
            const data = await api.get(`/sealing-steps/${uuid}/`, undefined, signal);
            return SealingStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateSealingStepInput {
    metrologyStepId: string;
    date?: Date | null;
    metrologistName?: string | null;
    metrologistUserUuid?: string | null;
    rackId?: number | null;
    interfaceIo?: string | null;
    comments?: string | null;
    verificationStatus?: 'OK' | 'NOK' | null;
    verificationRemark?: string | null;
}

interface UpdateSealingStepInput extends CreateSealingStepInput {
    uuid: string;
}

function sealingStepToApi(input: CreateSealingStepInput) {
    return {
        metrology_step_id: input.metrologyStepId,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date: formatDateToIso(input.date),
        metrologist_name: input.metrologistName ?? null,
        metrologist_user_uuid: input.metrologistUserUuid ?? null,
        rack_id: input.rackId ?? null,
        interface_io: input.interfaceIo ?? null,
        comments: input.comments ?? null,
        verification_status: input.verificationStatus ?? null,
        verification_remark: input.verificationRemark ?? null,
    };
}

/**
 * Create sealing step linked to a metrology step
 */
export function useCreateSealingStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateSealingStepInput): Promise<SealingStep> => {
            const response = await api.post('/sealing-steps/', sealingStepToApi(input));
            return SealingStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.sealing.byMetrology(variables.metrologyStepId),
            });
        },
    });
}

/**
 * Update sealing step
 */
export function useUpdateSealingStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateSealingStepInput): Promise<SealingStep> => {
            const response = await api.put(`/sealing-steps/${input.uuid}/`, sealingStepToApi(input));
            return SealingStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.sealing.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.sealing.byMetrology(variables.metrologyStepId),
            });
        },
    });
}

/**
 * Delete sealing step
 */
export function useDeleteSealingStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; metrologyStepId: string }): Promise<void> => {
            await api.delete(`/sealing-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.sealing.byMetrology(variables.metrologyStepId),
            });
        },
    });
}
