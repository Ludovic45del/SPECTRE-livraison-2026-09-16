/**
 * Campaign Document Queries
 * @module entities/campaign-document/api
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { CampaignDocumentListSchema, CampaignDocument } from '../model';
import { campaignDocumentKeys } from './campaign-document.keys';

/**
 * Fetch documents for a campaign
 */
export function useCampaignDocuments(campaignUuid: string) {
    return useQuery({
        queryKey: campaignDocumentKeys.byParent(campaignUuid),
        queryFn: async ({ signal }): Promise<CampaignDocument[]> => {
            const data = await api.get(`/campaign-documents/campaign/${campaignUuid}/`, undefined, signal);
            return CampaignDocumentListSchema.parse(data);
        },
        enabled: Boolean(campaignUuid),
        ...QUERY_CACHE_CONFIG,
    });
}
