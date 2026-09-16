/**
 * User Zod Schema - Validation & Transformation
 * @module entities/user/model
 *
 * Source of Truth: backend/app/domain/user/models/user_bean.py
 * API Format: snake_case -> Domain Format: camelCase
 */

import { z } from 'zod';

/**
 * Roles metier SPECTRE
 */
export const SPECTRE_ROLES = [
    'chef_labo',
    'iec',
    'rce',
    'assembleur',
    'metrologue',
    'cryogenie',
    'stagiaire',
    'alternant',
] as const;

export type SpectreRole = (typeof SPECTRE_ROLES)[number];

// Constantes nominatives (réutilisées dans les filtres UserSelect par contexte).
export const ROLE_CHEF_LABO: SpectreRole = 'chef_labo';
export const ROLE_IEC: SpectreRole = 'iec';
export const ROLE_RCE: SpectreRole = 'rce';
export const ROLE_ASSEMBLEUR: SpectreRole = 'assembleur';
export const ROLE_METROLOGUE: SpectreRole = 'metrologue';
export const ROLE_CRYOGENIE: SpectreRole = 'cryogenie';
export const ROLE_STAGIAIRE: SpectreRole = 'stagiaire';
export const ROLE_ALTERNANT: SpectreRole = 'alternant';

/**
 * Tous les rôles "opérateur" du laboratoire (groupe permission `operateur` +
 * `chef_labo`). Exclut stagiaire/alternant qui sont en lecteur seul.
 *
 * Utilisé pour filtrer les dropdowns d'opérateur des étapes gaz, étanchéité,
 * perméation, dépressurisation, repressurisation.
 */
export const SPECTRE_OPERATOR_ROLES: readonly SpectreRole[] = [
    ROLE_CHEF_LABO,
    ROLE_IEC,
    ROLE_RCE,
    ROLE_ASSEMBLEUR,
    ROLE_METROLOGUE,
    ROLE_CRYOGENIE,
] as const;

export const ROLE_LABELS: Record<SpectreRole, string> = {
    chef_labo: 'Chef de laboratoire',
    iec: 'IEC',
    rce: 'RCE',
    assembleur: 'Assembleur',
    metrologue: 'Métrologue',
    cryogenie: 'Cryogénie',
    stagiaire: 'Stagiaire',
    alternant: 'Alternant',
};

/**
 * Libellés des rôles d'un membre, dans l'ordre hiérarchique fourni par l'API.
 * Repli sur le code brut pour un rôle inconnu (tolérance au versioning API).
 */
export function formatRoles(roles: readonly SpectreRole[]): string {
    return roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ');
}

const PERMISSION_GROUPS = ['admin', 'operateur', 'lecteur'] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];
export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
    admin: 'Administrateur',
    operateur: 'Opérateur',
    lecteur: 'Lecteur',
};

/**
 * Raw API response schema (snake_case from Backend)
 */
const UserApiSchema = z.object({
    uuid: z.string().uuid(),
    username: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    // `roles` fait foi : un membre peut cumuler plusieurs rôles métier.
    // `role` est le rôle PRINCIPAL dérivé côté backend (le plus haut dans la
    // hiérarchie SPECTRE_ROLES) — pratique pour la couleur d'accent et le tri.
    roles: z.array(z.enum(SPECTRE_ROLES)),
    role: z.enum(SPECTRE_ROLES),
    permission_group: z.string(),
    laboratoire: z.string(),
    service: z.string(),
    numero: z.string(),
    bureau: z.string(),
    avatar_url: z.string().nullable().default(null),
    signature_url: z.string().nullable().default(null),
    is_active: z.boolean(),
    force_password_change: z.boolean(),
    last_login: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

/**
 * Shared mapping function: snake_case API -> camelCase domain
 */
function mapUserApiToUser(api: z.infer<typeof UserApiSchema>) {
    return {
        uuid: api.uuid,
        username: api.username,
        firstName: api.first_name,
        lastName: api.last_name,
        roles: api.roles as SpectreRole[],
        role: api.role as SpectreRole,
        permissionGroup: api.permission_group,
        laboratoire: api.laboratoire,
        service: api.service,
        numero: api.numero,
        bureau: api.bureau,
        avatarUrl: api.avatar_url,
        signatureUrl: api.signature_url,
        isActive: api.is_active,
        forcePasswordChange: api.force_password_change,
        lastLogin: api.last_login,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
    };
}

/**
 * Domain schema with camelCase transformation
 */
export const UserSchema = UserApiSchema.transform(mapUserApiToUser);

export type User = z.infer<typeof UserSchema>;

export const UserListSchema = z.array(UserSchema);

/**
 * Schema de reponse creation — inclut le mot de passe temporaire (fourni par
 * l'admin ou généré côté serveur), renvoyé une seule fois pour être communiqué
 * au nouvel utilisateur. Celui-ci devra le changer à sa première connexion
 * (force_password_change).
 */
const UserCreatedApiSchema = UserApiSchema.extend({
    generated_password: z.string(),
});

export const UserCreatedSchema = UserCreatedApiSchema.transform((api) => ({
    ...mapUserApiToUser(api),
    generatedPassword: api.generated_password,
}));

export type UserCreated = z.infer<typeof UserCreatedSchema>;

/**
 * Schema reponse reset password — renvoie le mot de passe temporaire généré
 * (l'ancien est immédiatement invalidé, changement obligatoire à la première
 * connexion).
 */
export const PasswordResetResponseSchema = z
    .object({
        message: z.string(),
        username: z.string(),
        generated_password: z.string(),
    })
    .transform((api) => ({
        message: api.message,
        username: api.username,
        generatedPassword: api.generated_password,
    }));

export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;

/**
 * Schema pour la définition du mot de passe initial via lien d'activation.
 */
export const SetInitialPasswordFormSchema = z
    .object({
        newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
        confirmPassword: z.string().min(1, 'La confirmation est requise'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
    });

export type SetInitialPasswordForm = z.infer<typeof SetInitialPasswordFormSchema>;

export const SetInitialPasswordResponseSchema = z.object({
    message: z.string(),
});

export type SetInitialPasswordResponse = z.infer<typeof SetInitialPasswordResponseSchema>;

/**
 * Schema pour la creation d'un utilisateur (input formulaire)
 */
export const UserCreateFormSchema = z.object({
    username: z.string().min(3, 'Le matricule doit contenir au moins 3 caractères'),
    firstName: z.string().optional().default(''),
    lastName: z.string().optional().default(''),
    roles: z.array(z.enum(SPECTRE_ROLES)).min(1, 'Au moins un rôle est requis'),
    laboratoire: z.string().optional().default(''),
    service: z.string().optional().default(''),
    numero: z.string().optional().default(''),
    bureau: z.string().optional().default(''),
    // Champ vide = mot de passe temporaire généré côté serveur. Sinon min 8 caractères.
    password: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional(),
    ),
});

export type UserCreateForm = z.infer<typeof UserCreateFormSchema>;

/**
 * Transform UserCreateForm to API format (camelCase -> snake_case)
 */
export function userCreateToApi(data: UserCreateForm): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName,
        roles: data.roles,
        laboratoire: data.laboratoire,
        service: data.service,
        numero: data.numero,
        bureau: data.bureau,
    };
    if (data.password) {
        payload.password = data.password;
    }
    return payload;
}

/**
 * Schema pour la modification d'un utilisateur
 */
export const UserUpdateFormSchema = z.object({
    firstName: z.string().optional().default(''),
    lastName: z.string().optional().default(''),
    roles: z.array(z.enum(SPECTRE_ROLES)).min(1, 'Au moins un rôle est requis'),
    laboratoire: z.string().optional().default(''),
    service: z.string().optional().default(''),
    numero: z.string().optional().default(''),
    bureau: z.string().optional().default(''),
});

export type UserUpdateForm = z.infer<typeof UserUpdateFormSchema>;

export function userUpdateToApi(data: UserUpdateForm): Record<string, unknown> {
    return {
        first_name: data.firstName,
        last_name: data.lastName,
        roles: data.roles,
        laboratoire: data.laboratoire,
        service: data.service,
        numero: data.numero,
        bureau: data.bureau,
    };
}

/**
 * Schema pour la modification de son propre profil (self-update).
 * N'inclut pas le rôle (réservé aux admins) ni le matricule (immuable).
 */
export const SelfProfileUpdateFormSchema = z.object({
    firstName: z.string().optional().default(''),
    lastName: z.string().optional().default(''),
    laboratoire: z.string().optional().default(''),
    service: z.string().optional().default(''),
    numero: z.string().optional().default(''),
    bureau: z.string().optional().default(''),
});

export type SelfProfileUpdateForm = z.infer<typeof SelfProfileUpdateFormSchema>;

export function selfProfileUpdateToApi(data: SelfProfileUpdateForm): Record<string, unknown> {
    return {
        first_name: data.firstName,
        last_name: data.lastName,
        laboratoire: data.laboratoire,
        service: data.service,
        numero: data.numero,
        bureau: data.bureau,
    };
}

/**
 * Schema pour le changement de mot de passe
 */
export const ChangePasswordFormSchema = z
    .object({
        currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
        newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
        confirmPassword: z.string().min(1, 'La confirmation est requise'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: "Le nouveau mot de passe doit être différent de l'ancien",
        path: ['newPassword'],
    });

export type ChangePasswordForm = z.infer<typeof ChangePasswordFormSchema>;

/**
 * Schema reponse changement de mot de passe
 */
export const ChangePasswordResponseSchema = z.object({
    message: z.string(),
});

export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;
