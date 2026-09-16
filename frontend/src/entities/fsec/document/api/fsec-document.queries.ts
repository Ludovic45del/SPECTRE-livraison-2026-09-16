/**
 * FSEC Document API Service - TanStack Query Hooks
 * @module entities/fsec-document/api
 *
 * Endpoints verified from: cible/api/fsec/fsec_documents_controller.py
 * - GET /fsec-documents/fsec/{fsec_id}/ -> list by FSEC
 * - GET /fsec-documents/{uuid}/ -> detail
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, formatDateToIso } from '@shared/lib';
import { FsecDocument, FsecDocumentSchema, FsecDocumentListSchema } from '../model';
import { fsecDocumentKeys } from './fsec-document.keys';

/**
 * Fetch FSEC documents by FSEC version UUID
 * Endpoint: GET /fsec-documents/fsec/{fsec_id}/
 */
export function useFsecDocumentsByFsec(fsecId: string) {
    return useQuery({
        queryKey: fsecDocumentKeys.byFsec(fsecId),
        queryFn: async ({ signal }): Promise<FsecDocument[]> => {
            const data = await api.get(`/fsec-documents/fsec/${fsecId}/`, undefined, signal);
            return FsecDocumentListSchema.parse(data);
        },
        enabled: Boolean(fsecId),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single FSEC document by UUID
 */
export function useFsecDocument(uuid: string) {
    return useQuery({
        queryKey: fsecDocumentKeys.detail(uuid),
        queryFn: async ({ signal }): Promise<FsecDocument> => {
            const data = await api.get(`/fsec-documents/${uuid}/`, undefined, signal);
            return FsecDocumentSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Create a new FSEC document
 * Endpoint: POST /fsec-documents/
 */
export function useCreateFsecDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { fsec_id: string; subtype_id: number; name: string; path: string }) => {
            const result = await api.post('/fsec-documents/', {
                ...data,
                // Date du jour en composantes locales (toISOString() décalerait à J-1 entre 00h et 01h/02h).
                date: formatDateToIso(new Date()),
            });
            return FsecDocumentSchema.parse(result);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: fsecDocumentKeys.byFsec(variables.fsec_id) });
        },
    });
}

/**
 * Delete a FSEC document
 * Endpoint: DELETE /fsec-documents/{uuid}/
 */
export function useDeleteFsecDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsec_id: string }) => {
            await api.delete(`/fsec-documents/${data.uuid}/`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: fsecDocumentKeys.byFsec(variables.fsec_id) });
        },
    });
}
