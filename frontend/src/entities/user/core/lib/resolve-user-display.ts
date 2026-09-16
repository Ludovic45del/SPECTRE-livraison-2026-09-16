/**
 * Résout le nom à afficher pour un opérateur durant la phase de coexistence
 * FK + nom legacy.
 *
 * Priorité :
 * 1. Si `userUuid` fourni et matche un user de la liste → "Prénom Nom (matricule)"
 * 2. Sinon retombe sur `legacyName`
 * 3. Sinon chaîne vide
 */

import type { UserLookup } from '../model/user-lookup.schema';
import { formatUserDisplayName } from './format-user-display-name';

export function resolveUserDisplay(
    userUuid: string | null | undefined,
    legacyName: string | null | undefined,
    users: UserLookup[] | undefined,
): string {
    if (userUuid && users) {
        const match = users.find((u) => u.uuid === userUuid);
        if (match) {
            return formatUserDisplayName(match);
        }
    }
    return legacyName ?? '';
}
