/**
 * planning.members — adapte la projection `UserLookup` au type `Membre` consommé par la grille planning.
 * @module features/planning/lib
 *
 * Note : `Membre.nom` sert de clé de jointure avec `PlanningMemberPeriod.memberName`
 * persisté côté backend. Toute évolution de la chaîne d'affichage doit rester stable.
 */
import { formatRoles, type SpectreRole, type UserLookup } from '@entities/user';
import type { Membre } from './planning.constants';

/** Ordre d'affichage hiérarchique des rôles dans la section Équipe. */
const MEMBER_ROLES_ORDER: readonly SpectreRole[] = [
    'chef_labo',
    'iec',
    'rce',
    'assembleur',
    'metrologue',
    'cryogenie',
    'alternant',
    'stagiaire',
];

const ROLE_ORDER_INDEX: ReadonlyMap<SpectreRole, number> = new Map(MEMBER_ROLES_ORDER.map((role, idx) => [role, idx]));

/** Convention SPECTRE : "NOM Prénom" (cf. table admin Users). Fallback sur `username`. */
function formatMemberName(user: UserLookup): string {
    const composed = `${user.lastName ?? ''} ${user.firstName ?? ''}`.replace(/\s+/g, ' ').trim();
    return composed || user.username;
}

/**
 * Construit la liste des membres affichés dans la section Équipe du planning.
 *
 * - Filtre les utilisateurs inactifs (les périodes existantes restent visibles via leur
 *   `memberName` même si l'utilisateur est désactivé, car portées par l'API planning).
 * - Trie par rôle principal (le plus haut dans la hiérarchie pour un membre
 *   multi-rôles, cf. `user.role` dérivé côté backend) puis alphabétiquement (FR).
 * - `nom` doit rester stable : il sert de clé de jointure avec `PlanningMemberPeriod.memberName`.
 */
export function usersToMembres(users: readonly UserLookup[]): Membre[] {
    return users
        .filter((u) => u.isActive)
        .map((u) => ({ user: u, nom: formatMemberName(u) }))
        .sort((a, b) => {
            const ra = ROLE_ORDER_INDEX.get(a.user.role) ?? Number.MAX_SAFE_INTEGER;
            const rb = ROLE_ORDER_INDEX.get(b.user.role) ?? Number.MAX_SAFE_INTEGER;
            if (ra !== rb) return ra - rb;
            return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
        })
        .map(({ user, nom }) => ({
            nom,
            fonction: formatRoles(user.roles),
        }));
}
