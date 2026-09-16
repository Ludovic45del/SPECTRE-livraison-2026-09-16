/**
 * FSEC Team API Service - TanStack Query Hooks
 * @module entities/fsec-team/api
 *
 * Endpoints verified from: cible/api/fsec/fsec_teams_controller.py
 * - GET /fsec-teams/fsec/{fsec_id}/ -> list by FSEC
 * - GET /fsec-teams/{uuid}/ -> detail
 * - POST /fsec-teams/ -> create
 * - PUT /fsec-teams/{uuid}/ -> update
 * - DELETE /fsec-teams/{uuid}/ -> delete
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { FsecTeam, FsecTeamSchema, FsecTeamListSchema } from '../model';
import { fsecTeamKeys } from './fsec-team.keys';

/**
 * Fetch FSEC teams by FSEC version UUID
 * Endpoint: GET /fsec-teams/fsec/{fsec_id}/
 */
export function useFsecTeamsByFsec(fsecId: string) {
    return useQuery({
        queryKey: fsecTeamKeys.byFsec(fsecId),
        queryFn: async ({ signal }): Promise<FsecTeam[]> => {
            const data = await api.get(`/fsec-teams/fsec/${fsecId}/`, undefined, signal);
            return FsecTeamListSchema.parse(data);
        },
        enabled: Boolean(fsecId),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Fetch single FSEC team member by UUID
 */
export function useFsecTeamMember(uuid: string) {
    return useQuery({
        queryKey: fsecTeamKeys.detail(uuid),
        queryFn: async ({ signal }): Promise<FsecTeam> => {
            const data = await api.get(`/fsec-teams/${uuid}/`, undefined, signal);
            return FsecTeamSchema.parse(data);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Add FSEC team member
 */
export function useAddFsecTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { fsec_version_id: string; role_id: number; name: string }): Promise<FsecTeam> => {
            // Backend expects fsec_id, not fsec_version_id
            const response = await api.post('/fsec-teams/', {
                fsec_id: data.fsec_version_id,
                role_id: data.role_id,
                name: data.name,
            });
            return FsecTeamSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: fsecTeamKeys.byFsec(variables.fsec_version_id),
            });
        },
    });
}

/**
 * Update FSEC team member
 */
export function useUpdateFsecTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            uuid: string;
            fsec_version_id: string;
            role_id: number;
            name: string;
        }): Promise<FsecTeam> => {
            // Backend expects fsec_id, not fsec_version_id
            const response = await api.put(`/fsec-teams/${data.uuid}/`, {
                fsec_id: data.fsec_version_id,
                role_id: data.role_id,
                name: data.name,
            });
            return FsecTeamSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: fsecTeamKeys.byFsec(variables.fsec_version_id),
            });
            queryClient.invalidateQueries({
                queryKey: fsecTeamKeys.detail(variables.uuid),
            });
        },
    });
}

/**
 * Delete FSEC team member
 */
export function useDeleteFsecTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { uuid: string; fsec_version_id: string }): Promise<void> => {
            await api.delete(`/fsec-teams/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: fsecTeamKeys.byFsec(variables.fsec_version_id),
            });
        },
    });
}
