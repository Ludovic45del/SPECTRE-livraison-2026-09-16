/**
 * Campaign Team Queries
 * @module entities/campaign-team/api
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    CampaignTeamApiSchema,
    CampaignTeamListSchema,
    CampaignTeamMember,
    CampaignTeamMemberCreate,
    CampaignTeamMemberDelete,
    CampaignTeamMemberUpdate,
} from '../model';
import { campaignTeamKeys } from './campaign-team.keys';

/**
 * Fetch team members for a campaign
 */
export function useCampaignTeam(campaignUuid: string) {
    return useQuery({
        queryKey: campaignTeamKeys.byParent(campaignUuid),
        queryFn: async ({ signal }): Promise<CampaignTeamMember[]> => {
            const data = await api.get(`/campaign-teams/campaign/${campaignUuid}/`, undefined, signal);
            return CampaignTeamListSchema.parse(data);
        },
        enabled: Boolean(campaignUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Add a team member
 */
export function useAddTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CampaignTeamMemberCreate) => {
            const response = await api.post('/campaign-teams/', data);
            return CampaignTeamApiSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: campaignTeamKeys.byParent(variables.campaign_uuid),
            });
        },
    });
}

/**
 * Update a team member
 */
export function useUpdateTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CampaignTeamMemberUpdate) => {
            const response = await api.put(`/campaign-teams/${data.uuid}/`, {
                campaign_uuid: data.campaign_uuid,
                role_id: data.role_id,
                name: data.name ?? null,
                user_uuid: data.user_uuid ?? null,
            });
            return CampaignTeamApiSchema.parse(response);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: campaignTeamKeys.byParent(variables.campaign_uuid),
            });
        },
    });
}

/**
 * Delete a team member
 */
export function useDeleteTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CampaignTeamMemberDelete) => {
            await api.delete(`/campaign-teams/${data.uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: campaignTeamKeys.byParent(variables.campaign_uuid),
            });
        },
    });
}
