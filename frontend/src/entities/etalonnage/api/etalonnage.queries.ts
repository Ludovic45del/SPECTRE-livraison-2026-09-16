/**
 * Etalonnage API Service - TanStack Query Hooks
 * @module entities/etalonnage/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    type Etalonnage,
    type EtalonnageCreateApi,
    EtalonnageSchema,
    EtalonnageListSchema,
    EtalonnageCreateApiSchema,
} from '../model';
import { etalonnageKeys } from './etalonnage.keys';
import { embaseKeys } from '@entities/embase/api/embase.keys';

/**
 * Fetch all etalonnages for an embase
 */
export function useEtalonnages(embaseUuid: string, voie?: 1 | 2) {
    return useQuery({
        queryKey: voie ? etalonnageKeys.byEmbaseVoie(embaseUuid, voie) : etalonnageKeys.byEmbase(embaseUuid),
        queryFn: async ({ signal }): Promise<Etalonnage[]> => {
            const params = new URLSearchParams({ embase_uuid: embaseUuid });
            if (voie) params.append('voie', String(voie));
            return api.get(`/etalonnages/?${params.toString()}`, EtalonnageListSchema, signal);
        },
        enabled: Boolean(embaseUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Create a new etalonnage
 */
export function useCreateEtalonnage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: EtalonnageCreateApi): Promise<Etalonnage> => {
            const validated = EtalonnageCreateApiSchema.parse(data);
            return api.post('/etalonnages/', validated, EtalonnageSchema);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: etalonnageKeys.byEmbase(variables.embase_uuid) });
            queryClient.invalidateQueries({ queryKey: embaseKeys.detail(variables.embase_uuid) });
        },
    });
}

/**
 * Delete an etalonnage
 */
export function useDeleteEtalonnage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ uuid }: { uuid: string; embaseUuid: string }): Promise<void> => {
            await api.delete(`/etalonnages/${uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: etalonnageKeys.byEmbase(variables.embaseUuid) });
            queryClient.invalidateQueries({ queryKey: embaseKeys.detail(variables.embaseUuid) });
        },
    });
}
