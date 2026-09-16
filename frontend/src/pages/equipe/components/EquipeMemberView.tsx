/**
 * EquipeMemberView — annuaire en lecture seule (tout utilisateur authentifié).
 * @module pages/equipe
 *
 * Alimente l'annuaire via la projection publique `/users/lookup/` (actifs).
 */

import { useUserLookup } from '@entities/user';
import { EquipeDirectory } from './EquipeDirectory';

export function EquipeMemberView() {
    const { data: people, isLoading, error } = useUserLookup();
    return <EquipeDirectory people={people} isLoading={isLoading} error={error} />;
}
