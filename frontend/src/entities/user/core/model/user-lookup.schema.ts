/**
 * User Lookup Schema — projection annuaire pour dropdowns + popovers d'infos.
 * @module entities/user/model
 *
 * Source of Truth: backend/app/api/user/user_lookup_controller.py
 *
 * Champs exposés : identité (uuid, username, first_name, last_name, avatar_url)
 * + rôles (cumulables) + is_active + coordonnées pratiques (laboratoire, service, numero,
 * bureau). Les champs sensibles (password, dashboard_preferences,
 * force_password_change) restent hors de cette projection.
 */

import { z } from 'zod';
import { SPECTRE_ROLES, type SpectreRole } from './user.schema';

const UserLookupApiSchema = z.object({
    uuid: z.string().uuid(),
    username: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    // `roles` fait foi ; `role` est le rôle principal dérivé (cf. user.schema).
    roles: z.array(z.enum(SPECTRE_ROLES)),
    role: z.enum(SPECTRE_ROLES),
    is_active: z.boolean(),
    laboratoire: z.string().default(''),
    service: z.string().default(''),
    numero: z.string().default(''),
    bureau: z.string().default(''),
    avatar_url: z.string().nullable().default(null),
});

export const UserLookupSchema = UserLookupApiSchema.transform((api) => ({
    uuid: api.uuid,
    username: api.username,
    firstName: api.first_name,
    lastName: api.last_name,
    roles: api.roles as SpectreRole[],
    role: api.role as SpectreRole,
    isActive: api.is_active,
    laboratoire: api.laboratoire,
    service: api.service,
    numero: api.numero,
    bureau: api.bureau,
    avatarUrl: api.avatar_url,
}));

export type UserLookup = z.infer<typeof UserLookupSchema>;

export const UserLookupListSchema = z.array(UserLookupSchema);
