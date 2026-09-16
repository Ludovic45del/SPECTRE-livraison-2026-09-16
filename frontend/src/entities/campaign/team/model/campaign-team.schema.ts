/**
 * Campaign Team Schema
 * @module entities/campaign-team/model
 */

import { z } from 'zod';
import { getCampaignRole } from '@entities/campaign/core/lib';

export const CampaignTeamApiSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
    role_id: z.number().int().nullable(),
    name: z.string().nullable(),
    user_uuid: z.string().uuid().nullable().optional(),
});

export const CampaignTeamSchema = CampaignTeamApiSchema.transform((api) => ({
    uuid: api.uuid,
    campaignUuid: api.campaign_uuid,
    role: getCampaignRole(api.role_id),
    name: api.name,
    userUuid: api.user_uuid ?? null,
}));

export type CampaignTeamMember = z.infer<typeof CampaignTeamSchema>;
export const CampaignTeamListSchema = z.array(CampaignTeamSchema);

export const CampaignTeamMemberCreateSchema = z.object({
    campaign_uuid: z.string().uuid(),
    role_id: z.number().int().min(0),
    name: z.string().max(200).nullable().optional(),
    user_uuid: z.string().uuid().nullable().optional(),
});

export type CampaignTeamMemberCreate = z.infer<typeof CampaignTeamMemberCreateSchema>;

export const CampaignTeamMemberUpdateSchema = CampaignTeamMemberCreateSchema.extend({
    uuid: z.string().uuid(),
});

export type CampaignTeamMemberUpdate = z.infer<typeof CampaignTeamMemberUpdateSchema>;

export const CampaignTeamMemberDeleteSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
});

export type CampaignTeamMemberDelete = z.infer<typeof CampaignTeamMemberDeleteSchema>;

/**
 * Schema pour le formulaire team (overview page).
 *
 * MOE est en texte libre (extérieur au labo) : on stocke un nom max 50.
 * RCE et IEC sont des UUID UserProfile (max 36 chars).
 */
export const CampaignTeamFormSchema = z.object({
    moeName: z.string().max(50, 'Nom MOE trop long (max 50 caractères)'),
    rceUserUuid: z.string().uuid().or(z.literal('')),
    iecUserUuid: z.string().uuid().or(z.literal('')),
});

export type CampaignTeamFormData = z.infer<typeof CampaignTeamFormSchema>;
