/**
 * FSEC Team Zod Schema - Validation & Transformation
 * @module entities/fsec-team/model
 *
 * Source of Truth: cible/domain/fsec/models/fsec_teams_bean.py
 */

import { z } from 'zod';

/**
 * Raw API response schema (snake_case from Backend)
 */
export const FsecTeamApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_id: z.string().uuid(),
    role_id: z.number().int().nullable(),
    name: z.string().nullable(),
    user_uuid: z.string().uuid().nullable().optional(),
});

/**
 * Domain schema with camelCase transformation
 */
export const FsecTeamSchema = FsecTeamApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecId: api.fsec_id,
    roleId: api.role_id,
    name: api.name,
    userUuid: api.user_uuid ?? null,
}));

export type FsecTeam = z.infer<typeof FsecTeamSchema>;
export type FsecTeamApi = z.input<typeof FsecTeamSchema>;

/**
 * Schema for FSEC Team list response
 */
export const FsecTeamListSchema = z.array(FsecTeamSchema);
