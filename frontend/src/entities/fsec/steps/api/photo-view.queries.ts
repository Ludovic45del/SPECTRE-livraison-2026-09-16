/**
 * Photo View Queries - TanStack Query Hooks
 * @module entities/steps/api
 *
 * Full CRUD for PhotoView (individual views/photos linked to PicturesStep)
 * Endpoint: /api/photo-views/
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { PhotoView, PhotoViewSchema, PhotoViewListSchema } from '../model';
import { stepKeys } from './steps.keys';

/**
 * Fetch photo views by PicturesStep UUID
 */
export function usePhotoViewsByPicturesStep(picturesStepId: string) {
    return useQuery({
        queryKey: stepKeys.photoView.byPicturesStep(picturesStepId),
        queryFn: async ({ signal }): Promise<PhotoView[]> => {
            const data = await api.get(`/photo-views/pictures-step/${picturesStepId}/`, undefined, signal);
            return PhotoViewListSchema.parse(data);
        },
        enabled: Boolean(picturesStepId),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single photo view by UUID
 */
export function usePhotoView(uuid: string) {
    return useQuery({
        queryKey: stepKeys.photoView.detail(uuid),
        queryFn: async ({ signal }): Promise<PhotoView> => {
            const data = await api.get(`/photo-views/${uuid}/`, undefined, signal);
            return PhotoViewSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

interface CreatePhotoViewInput {
    picturesStepId: string;
    name: string;
    link?: string | null;
}

interface UpdatePhotoViewInput extends CreatePhotoViewInput {
    uuid: string;
}

/**
 * Create photo view
 */
export function useCreatePhotoView() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePhotoViewInput): Promise<PhotoView> => {
            const apiData = {
                pictures_step_id: input.picturesStepId,
                name: input.name,
                link: input.link ?? null,
            };
            const response = await api.post('/photo-views/', apiData);
            return PhotoViewSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.photoView.byPicturesStep(variables.picturesStepId),
            });
        },
    });
}

/**
 * Update photo view
 */
export function useUpdatePhotoView() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdatePhotoViewInput): Promise<PhotoView> => {
            const apiData = {
                pictures_step_id: input.picturesStepId,
                name: input.name,
                link: input.link ?? null,
            };
            const response = await api.put(`/photo-views/${input.uuid}/`, apiData);
            return PhotoViewSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.photoView.detail(variables.uuid),
            });
            queryClient.invalidateQueries({
                queryKey: stepKeys.photoView.byPicturesStep(variables.picturesStepId),
            });
        },
    });
}

/**
 * Delete photo view
 */
export function useDeletePhotoView() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; picturesStepId: string }): Promise<void> => {
            await api.delete(`/photo-views/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: stepKeys.photoView.byPicturesStep(variables.picturesStepId),
            });
        },
    });
}
