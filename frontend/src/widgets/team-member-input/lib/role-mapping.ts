/**
 * Mapping des libellés de rôle métier (côté Teams) vers les SpectreRoles
 * pour le filtre UserSelect.
 *
 * Source de vérité côté backend :
 * - backend/app/data/campaign/campaign_roles.csv
 * - backend/app/data/fsec/fsec_roles.csv
 *
 * Cas particuliers :
 * - MOE et TCI sont gérés en texte libre (membre extérieur au labo) → ne
 *   passent pas par UserSelect, donc absents de cette table.
 * - OPERATEUR_PHOTOS → undefined (aucun filtre, prendre n'importe quel user
 *   actif y compris stagiaire/alternant).
 */

import type { SpectreRole } from '@entities/user';

/** Libellés de rôles tels que présents dans les CSV référentiels (CampaignRoles + FsecRoles). */
export type TeamRoleLabel = 'MOE' | 'RCE' | 'IEC' | 'ASSEMBLEUR' | 'METROLOGUE' | 'OPERATEUR_PHOTOS' | 'TCI';

/** Labels qui restent en texte libre (membres extérieurs au labo). */
export const FREE_TEXT_TEAM_ROLES: readonly TeamRoleLabel[] = ['MOE', 'TCI'] as const;

/**
 * Filtres de rôles SPECTRE par libellé de rôle Teams. `undefined` = pas de filtre.
 * Les rôles "free text" (MOE/TCI) sont absents : ils sont gérés en amont par
 * `isFreeTextTeamRole`.
 */
export const TEAM_ROLE_TO_SPECTRE_ROLES: Partial<Record<TeamRoleLabel, SpectreRole[] | undefined>> = {
    RCE: ['rce'],
    IEC: ['iec'],
    ASSEMBLEUR: ['assembleur'],
    METROLOGUE: ['metrologue'],
    // Aucune restriction : tout user actif peut prendre des photos
    // (y compris stagiaire/alternant — décision métier).
    OPERATEUR_PHOTOS: undefined,
};

export function isFreeTextTeamRole(role: TeamRoleLabel): boolean {
    return FREE_TEXT_TEAM_ROLES.includes(role);
}

export function getRolesForTeamLabel(role: TeamRoleLabel): SpectreRole[] | undefined {
    return TEAM_ROLE_TO_SPECTRE_ROLES[role];
}
