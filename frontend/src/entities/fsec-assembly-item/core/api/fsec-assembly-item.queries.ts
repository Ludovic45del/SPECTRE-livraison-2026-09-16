/**
 * FsecAssemblyItem — TanStack Query hooks (CDC §5.3, §5.4).
 *
 *   GET    /fsec-assembly-items/fsec/:fsec_uuid/      → tableau récap (détail enrichi)
 *   POST   /fsec-assembly-items/                      → ajout
 *   PATCH  /fsec-assembly-items/:uuid/                → MAJ sort_order/remarque
 *   DELETE /fsec-assembly-items/:uuid/                → libération + suppression
 *   GET    /stock/catalog/available-for-fsec/:uuid/   → items assignables
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { StockCatalogItemListSchema, type StockCatalogItem } from '@entities/stock-item';

import {
    FsecAssemblyItemDetailListSchema,
    FsecAssemblyItemSchema,
    type FsecAssemblyItem,
    type FsecAssemblyItemCreatePayload,
    type FsecAssemblyItemDetail,
    type FsecAssemblyItemPatchPayload,
} from '../model/fsec-assembly-item.schema';
import { fsecAssemblyKeys } from './fsec-assembly-item.keys';

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Tableau récap d'une FSEC (joint sur catalog_item). */
export function useFsecAssemblyItems(fsecUuid: string | null | undefined) {
    return useQuery({
        queryKey: fsecAssemblyKeys.listByFsec(fsecUuid ?? ''),
        queryFn: async ({ signal }): Promise<FsecAssemblyItemDetail[]> => {
            return api.get(`/fsec-assembly-items/fsec/${fsecUuid}/`, FsecAssemblyItemDetailListSchema, signal);
        },
        enabled: Boolean(fsecUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/** Items assignables à une FSEC (consommables actifs + éléments dispo ou déjà attribués). */
export function useAvailableForFsec(fsecUuid: string | null | undefined) {
    return useQuery({
        queryKey: fsecAssemblyKeys.availableForFsec(fsecUuid ?? ''),
        queryFn: async ({ signal }): Promise<StockCatalogItem[]> => {
            return api.get(`/stock/catalog/available-for-fsec/${fsecUuid}/`, StockCatalogItemListSchema, signal);
        },
        enabled: Boolean(fsecUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAddAssemblyItem(fsecUuid: string | null | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: FsecAssemblyItemCreatePayload): Promise<FsecAssemblyItem> => {
            const response = await api.post('/fsec-assembly-items/', payload);
            return FsecAssemblyItemSchema.parse(response);
        },
        onSuccess: () => {
            if (fsecUuid) {
                queryClient.invalidateQueries({
                    queryKey: fsecAssemblyKeys.listByFsec(fsecUuid),
                });
                queryClient.invalidateQueries({
                    queryKey: fsecAssemblyKeys.availableForFsec(fsecUuid),
                });
            }
            queryClient.invalidateQueries({ queryKey: ['stock-catalog'] });
        },
    });
}

export function usePatchAssemblyItem(fsecUuid: string | null | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uuid,
            data,
        }: {
            uuid: string;
            data: FsecAssemblyItemPatchPayload;
        }): Promise<FsecAssemblyItem> => {
            const response = await api.patch(`/fsec-assembly-items/${uuid}/`, data);
            return FsecAssemblyItemSchema.parse(response);
        },
        onSuccess: () => {
            if (fsecUuid) {
                queryClient.invalidateQueries({
                    queryKey: fsecAssemblyKeys.listByFsec(fsecUuid),
                });
            }
        },
    });
}

export function useRemoveAssemblyItem(fsecUuid: string | null | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/fsec-assembly-items/${uuid}/`);
        },
        onSuccess: () => {
            if (fsecUuid) {
                queryClient.invalidateQueries({
                    queryKey: fsecAssemblyKeys.listByFsec(fsecUuid),
                });
                queryClient.invalidateQueries({
                    queryKey: fsecAssemblyKeys.availableForFsec(fsecUuid),
                });
            }
            queryClient.invalidateQueries({ queryKey: ['stock-catalog'] });
        },
    });
}
