/**
 * Campaign Document Schema
 * @module entities/campaign-document/model
 */

import { z } from 'zod';
import { getCampaignDocumentSubtype, getCampaignDocumentType, getCampaignFileType } from '@entities/campaign/core/lib';

export const CampaignDocumentApiSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
    subtype_id: z.number().int().nullable(),
    file_type_id: z.number().int().nullable().optional(),
    name: z.string(),
    path: z.string(),
    date: z.string().nullable(), // ISO Date string
});

export const CampaignDocumentSchema = CampaignDocumentApiSchema.transform((api) => {
    const subtype = getCampaignDocumentSubtype(api.subtype_id);
    const type = subtype ? getCampaignDocumentType(subtype.typeId) : null;
    const fileType = getCampaignFileType(api.file_type_id || null);

    return {
        uuid: api.uuid,
        campaignUuid: api.campaign_uuid,
        subtype: subtype,
        type: type,
        fileType: fileType,
        name: api.name,
        path: api.path,
        date: api.date ? new Date(api.date) : null,
    };
});

export type CampaignDocument = z.infer<typeof CampaignDocumentSchema>;
export const CampaignDocumentListSchema = z.array(CampaignDocumentSchema);
