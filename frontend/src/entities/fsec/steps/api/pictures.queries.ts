/**
 * Pictures Step Queries - TanStack Query Hooks
 * @module entities/steps/api
 *
 * Full CRUD for PicturesStep (session photo with operator + date)
 * Endpoint: /api/pictures-steps/
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { PicturesStep, PicturesStepSchema, PicturesStepListSchema } from '../model';
import { stepKeys } from './steps.keys';

/**
 * Fetch pictures steps by FSEC version UUID
 */
export function usePicturesStepsByFsec(fsecVersionUuid: string) {
    return useQuery({
        queryKey: stepKeys.pictures.byFsec(fsecVersionUuid),
        queryFn: async ({ signal }): Promise<PicturesStep[]> => {
            const data = await api.get(`/pictures-steps/fsec/${fsecVersionUuid}/`, undefined, signal);
            return PicturesStepListSchema.parse(data);
        },
        enabled: Boolean(fsecVersionUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single pictures step by UUID
 */
export function usePicturesStep(uuid: string) {
    return useQuery({
        queryKey: stepKeys.pictures.detail(uuid),
        queryFn: async ({ signal }): Promise<PicturesStep> => {
            const data = await api.get(`/pictures-steps/${uuid}/`, undefined, signal);
            return PicturesStepSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreatePicturesStepInput {
    fsecVersionId: string;
    operator?: string | null;
    operatorUserUuid?: string | null;
    date?: Date | null;
    comments?: string | null;
}

interface UpdatePicturesStepInput extends CreatePicturesStepInput {
    uuid: string;
}

function picturesStepToApi(input: CreatePicturesStepInput) {
    return {
        fsec_version_id: input.fsecVersionId,
        operator: input.operator ?? null,
        operator_user_uuid: input.operatorUserUuid ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date: formatDateToIso(input.date),
        comments: input.comments ?? null,
    };
}

/**
 * Create pictures step
 */
export function useCreatePicturesStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePicturesStepInput): Promise<PicturesStep> => {
            const response = await api.post('/pictures-steps/', picturesStepToApi(input));
            return PicturesStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.pictures.byFsec(variables.fsecVersionId),
            });
        },
    });
}

/**
 * Update pictures step
 */
export function useUpdatePicturesStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdatePicturesStepInput): Promise<PicturesStep> => {
            const response = await api.put(`/pictures-steps/${input.uuid}/`, picturesStepToApi(input));
            return PicturesStepSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.pictures.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.pictures.byFsec(variables.fsecVersionId),
            });
        },
    });
}

/**
 * Delete pictures step
 */
export function useDeletePicturesStep() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsecVersionId: string }): Promise<void> => {
            await api.delete(`/pictures-steps/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.pictures.byFsec(variables.fsecVersionId),
            });
        },
    });
}
