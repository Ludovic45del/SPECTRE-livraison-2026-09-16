/**
 * Embase API Service - TanStack Query Hooks
 * @module entities/embase/api
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, seedDetailFromList, isUuid } from '@shared/lib';
import {
    Embase,
    EmbaseSchema,
    EmbaseListSchema,
    EmbaseCreate,
    embaseCreateToApi,
    type EmbaseFsecHistoryItem,
    EmbaseFsecHistoryListSchema,
} from '../model';
import { embaseKeys } from './embase.keys';

/**
 * Fetch all embases
 */
export function useEmbases() {
    return useQuery({
        queryKey: embaseKeys.lists(),
        queryFn: async ({ signal }): Promise<Embase[]> => {
            return api.get('/embases/', EmbaseListSchema, signal);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

export async function fetchEmbase(uuid: string, signal?: AbortSignal): Promise<Embase> {
    return api.get(`/embases/${uuid}/`, EmbaseSchema, signal);
}

/**
 * Fetch single embase by UUID. Seedé depuis le cache liste → header instantané.
 */
export function useEmbase(uuid: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: embaseKeys.detail(uuid),
        queryFn: ({ signal }) => fetchEmbase(uuid, signal),
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<Embase>(queryClient, [embaseKeys.lists()], (e) => e.uuid === uuid),
    });
}

/**
 * Récupère une embase par son slug d'URL (slugify de l'identifier). Rétro-compatible :
 * bascule sur l'endpoint UUID si le paramètre est un UUID (anciens liens).
 */
export async function fetchEmbaseBySlug(slugOrUuid: string, signal?: AbortSignal): Promise<Embase> {
    const path = isUuid(slugOrUuid) ? `/embases/${slugOrUuid}/` : `/embases/by-slug/${encodeURIComponent(slugOrUuid)}/`;
    return api.get(path, EmbaseSchema, signal);
}

/**
 * Fetch single embase by slug. Seedé depuis le cache liste (match slug ou uuid).
 */
export function useEmbaseBySlug(slug: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: embaseKeys.detailBySlug(slug),
        queryFn: ({ signal }) => fetchEmbaseBySlug(slug, signal),
        enabled: Boolean(slug),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<Embase>(queryClient, [embaseKeys.lists()], (e) => e.slug === slug || e.uuid === slug),
    });
}

/**
 * Précharge le détail d'une embase (survol de ligne). No-op si déjà frais.
 */
export function usePrefetchEmbase() {
    const queryClient = useQueryClient();
    return useCallback(
        (uuid: string) => {
            if (!uuid) return;
            void queryClient.prefetchQuery({
                queryKey: embaseKeys.detail(uuid),
                queryFn: ({ signal }) => fetchEmbase(uuid, signal),
                ...QUERY_CACHE_CONFIG,
            });
        },
        [queryClient],
    );
}

/**
 * Create new embase
 */
export function useCreateEmbase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: EmbaseCreate): Promise<Embase> => {
            const apiData = embaseCreateToApi(data);
            return api.post('/embases/', apiData, EmbaseSchema);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: embaseKeys.lists() });
        },
    });
}

/**
 * Update embase
 */
export function useUpdateEmbase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: EmbaseCreate }): Promise<Embase> => {
            const apiData = embaseCreateToApi(data);
            return api.put(`/embases/${uuid}/`, apiData, EmbaseSchema);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: embaseKeys.lists() });
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug).
            queryClient.invalidateQueries({ queryKey: embaseKeys.details() });
        },
    });
}

/**
 * Delete embase
 */
export function useDeleteEmbase() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/embases/${uuid}/`);
        },
        onSuccess: (_, uuid) => {
            queryClient.invalidateQueries({ queryKey: embaseKeys.lists() });
            queryClient.removeQueries({ queryKey: embaseKeys.detail(uuid) });
        },
    });
}

/**
 * Fetch FSEC history for an embase (FSECs where this embase was used)
 */
export function useEmbaseFsecHistory(uuid: string) {
    return useQuery({
        queryKey: embaseKeys.fsecHistory(uuid),
        queryFn: async ({ signal }): Promise<EmbaseFsecHistoryItem[]> => {
            return api.get(`/embases/${uuid}/fsec-history/`, EmbaseFsecHistoryListSchema, signal);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}
