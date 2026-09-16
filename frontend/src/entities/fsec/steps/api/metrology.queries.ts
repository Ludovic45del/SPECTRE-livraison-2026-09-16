/**
 * Metrology Step Queries - TanStack Query Hooks
 * @module entities/steps/api
 *
 * Endpoint verified: /api/metrology-steps/fsec/{fsec_id}/
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { MetrologyStep, MetrologyStepSchema, MetrologyStepListSchema } from '../model';
import { stepKeys } from './steps.keys';

/**
 * Fetch metrology steps by FSEC version UUID
 */
export function useMetrologyStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.metrology.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<MetrologyStep[]> => {
            const data = await api.get(`/metrology-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return MetrologyStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single metrology step by UUID
 */
export function useMetrologyStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.metrology.detail(uuid),
        queryFn: async ({ signal }): Promise<MetrologyStep> => {
            const data = await api.get(`/metrology-steps/${uuid}/`, undefined, signal);
            return MetrologyStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreateMetrologyStepInput {
    fsecVersionId: string;
    rackId?: number | null;
    metrologistName?: string | null;
    metrologistUserUuid?: string | null;
    metrologistUserUuids?: string[];
    date?: Date | null;
    comments?: string | null;
    machineUuids?: string[];
    metroFileLink?: string | null;
    visradLink?: string | null;
}

interface UpdateMetrologyStepInput extends CreateMetrologyStepInput {
    uuid: string;
}

function metrologyStepToApi(input: CreateMetrologyStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        rack_id: input.rackId ?? null,
        metrologist_name: input.metrologistName ?? null,
        metrologist_user_uuid: input.metrologistUserUuid ?? null,
        metrologist_user_uuids: input.metrologistUserUuids ?? [],
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date: formatDateToIso(input.date),
        comments: input.comments ?? null,
        machine_uuids: input.machineUuids ?? [],
        metro_file_link: input.metroFileLink ?? null,
        visrad_link: input.visradLink ?? null,
    };
}

/**
 * Create metrology step
 */
export function useCreateMetrologyStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateMetrologyStepInput): Promise<MetrologyStep> => {
            const response = await api.post('/metrology-steps/', metrologyStepToApi(input));
            return MetrologyStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.metrology.byFsec(variables.fsecVersionId),
            });
        },
    });
}

/**
 * Update metrology step
 */
export function useUpdateMetrologyStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateMetrologyStepInput): Promise<MetrologyStep> => {
            const response = await api.put(`/metrology-steps/${input.uuid}/`, metrologyStepToApi(input));
            return MetrologyStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.metrology.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.metrology.byFsec(variables.fsecVersionId),
            });
        },
    });
}

/**
 * Delete metrology step
 */
export function useDeleteMetrologyStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/metrology-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.metrology.byFsec(variables.fsecVersionId),
            });
        },
    });
}
