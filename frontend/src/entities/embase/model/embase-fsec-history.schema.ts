/**
 * Embase FSEC History Schema
 * @module entities/embase/model
 */

import { z } from 'zod';

export const EmbaseFsecHistoryItemSchema = z
    .object({
        fsec_uuid: z.string(),
        fsec_version_uuid: z.string(),
        fsec_name: z.string(),
        campaign_name: z.string().nullable(),
        campaign_uuid: z.string().nullable(),
        date_of_fulfilment: z.string().nullable(),
        gas_type: z.string().nullable(),
    })
    .transform((api) => ({
        fsecUuid: api.fsec_uuid,
        fsecVersionUuid: api.fsec_version_uuid,
        fsecName: api.fsec_name,
        campaignName: api.campaign_name,
        campaignUuid: api.campaign_uuid,
        dateOfFulfilment: api.date_of_fulfilment,
        gasType: api.gas_type,
    }));

export type EmbaseFsecHistoryItem = z.output<typeof EmbaseFsecHistoryItemSchema>;

export const EmbaseFsecHistoryListSchema = z.array(EmbaseFsecHistoryItemSchema);
