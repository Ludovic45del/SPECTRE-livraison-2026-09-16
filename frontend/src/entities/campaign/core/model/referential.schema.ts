/**
 * Campaign Referential Schemas - Type, Status, Installation
 * @module entities/campaign/model
 *
 * Source: Legacy src/core/domain/campaign/referential/
 */

import { z } from 'zod';

// ============ Campaign Type ============
export const CampaignTypeApiSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    color: z.string().nullable().default('#666'),
});

export const CampaignTypeSchema = CampaignTypeApiSchema;
export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export const CampaignTypeListSchema = z.array(CampaignTypeApiSchema);

// ============ Campaign Status ============
export const CampaignStatusApiSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    color: z.string().nullable().default('#666'),
});

export const CampaignStatusSchema = CampaignStatusApiSchema;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export const CampaignStatusListSchema = z.array(CampaignStatusApiSchema);

// ============ Campaign Installation ============
export const CampaignInstallationApiSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    color: z.string().nullable().default('#666'),
});

export const CampaignInstallationSchema = CampaignInstallationApiSchema;
export type CampaignInstallation = z.infer<typeof CampaignInstallationSchema>;
export const CampaignInstallationListSchema = z.array(CampaignInstallationApiSchema);

// ============ Extended Campaign with nested objects ============
export const CampaignWithRelationsApiSchema = z.object({
    uuid: z.string().uuid(),
    slug: z.string().optional(),
    name: z.string().min(1),
    year: z.number().int(),
    semester: z.string(),
    last_updated: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    dtri_number: z.number().int().nullable(),
    description: z.string().nullable(),
    type: CampaignTypeApiSchema.nullable(),
    status: CampaignStatusApiSchema.nullable(),
    installation: CampaignInstallationApiSchema.nullable(),
});

export const CampaignWithRelationsSchema = CampaignWithRelationsApiSchema.transform((api) => ({
    uuid: api.uuid,
    slug: api.slug ?? '',
    name: api.name,
    year: api.year,
    semester: api.semester,
    lastUpdated: api.last_updated ? new Date(api.last_updated) : null,
    startDate: api.start_date ? new Date(api.start_date) : null,
    endDate: api.end_date ? new Date(api.end_date) : null,
    dtriNumber: api.dtri_number,
    description: api.description,
    type: api.type,
    status: api.status,
    installation: api.installation,
}));

export type CampaignWithRelations = z.infer<typeof CampaignWithRelationsSchema>;
