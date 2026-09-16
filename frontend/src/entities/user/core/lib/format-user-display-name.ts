/**
 * Helpers de formatage du nom affichable d'un utilisateur.
 * @module entities/user/lib
 */

import type { User } from '../model/user.schema';
import type { UserLookup } from '../model/user-lookup.schema';

type DisplayableUser = Pick<User, 'firstName' | 'lastName' | 'username'>;

/**
 * Formate un user pour affichage dans un dropdown / une liste.
 *
 * Affiche "Prénom Nom" uniquement. Si aucun nom n'est renseigné, retombe
 * sur le matricule (username) pour ne jamais afficher une chaîne vide.
 */
export function formatUserDisplayName(user: DisplayableUser | UserLookup): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.username;
}
