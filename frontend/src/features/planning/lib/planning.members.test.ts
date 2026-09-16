/**
 * Tests pour l'adaptateur User → Membre du planning.
 */
import { describe, it, expect } from 'vitest';
import type { UserLookup } from '@entities/user';
import { usersToMembres } from './planning.members';

/**
 * `roles` fait foi, `role` est le rôle principal dérivé côté backend. La
 * factory les garde cohérents : préciser `roles` suffit, `role` en découle.
 */
function makeUser(overrides: Partial<UserLookup> = {}): UserLookup {
    const roles = overrides.roles ?? [overrides.role ?? 'assembleur'];
    return {
        uuid: '00000000-0000-4000-8000-000000000000',
        username: 'jdoe',
        firstName: 'Jean',
        lastName: 'Doe',
        laboratoire: '',
        service: '',
        numero: '',
        bureau: '',
        avatarUrl: null,
        isActive: true,
        ...overrides,
        roles,
        role: roles[0],
    };
}

describe('usersToMembres', () => {
    it('mappe nom = "NOM Prénom" et fonction = libellé du rôle', () => {
        const result = usersToMembres([makeUser({ lastName: 'Dupont', firstName: 'Jean', role: 'assembleur' })]);
        expect(result).toEqual([{ nom: 'Dupont Jean', fonction: 'Assembleur' }]);
    });

    it('exclut les utilisateurs inactifs', () => {
        const result = usersToMembres([
            makeUser({ uuid: 'u1', lastName: 'Actif', isActive: true }),
            makeUser({ uuid: 'u2', lastName: 'Inactif', isActive: false }),
        ]);
        expect(result.map((m) => m.nom)).toEqual(['Actif Jean']);
    });

    it('retombe sur le username si nom et prénom sont vides', () => {
        const result = usersToMembres([makeUser({ firstName: '', lastName: '', username: 'matricule42' })]);
        expect(result[0].nom).toBe('matricule42');
    });

    it('trie par hiérarchie de rôle puis alphabétiquement (FR)', () => {
        const users = [
            makeUser({ uuid: 'u1', lastName: 'Zoé', firstName: '', role: 'stagiaire' }),
            makeUser({ uuid: 'u2', lastName: 'Bernard', firstName: '', role: 'chef_labo' }),
            makeUser({ uuid: 'u3', lastName: 'Étienne', firstName: '', role: 'assembleur' }),
            makeUser({ uuid: 'u4', lastName: 'Albert', firstName: '', role: 'assembleur' }),
            makeUser({ uuid: 'u5', lastName: 'Charles', firstName: '', role: 'iec' }),
        ];
        const result = usersToMembres(users);
        expect(result.map((m) => `${m.fonction}/${m.nom.trim()}`)).toEqual([
            'Chef de laboratoire/Bernard',
            'IEC/Charles',
            'Assembleur/Albert',
            'Assembleur/Étienne',
            'Stagiaire/Zoé',
        ]);
    });

    it('concatène les libellés pour un membre multi-rôles', () => {
        const result = usersToMembres([
            makeUser({ lastName: 'Poly', firstName: 'Val', roles: ['assembleur', 'metrologue'] }),
        ]);
        expect(result).toEqual([{ nom: 'Poly Val', fonction: 'Assembleur · Métrologue' }]);
    });

    it('trie un membre multi-rôles sur son rôle principal', () => {
        const users = [
            makeUser({ uuid: 'u1', lastName: 'Zoé', firstName: '', roles: ['stagiaire'] }),
            makeUser({ uuid: 'u2', lastName: 'Poly', firstName: '', roles: ['chef_labo', 'metrologue'] }),
        ];
        expect(usersToMembres(users).map((m) => m.nom.trim())).toEqual(['Poly', 'Zoé']);
    });

    it('normalise les espaces multiples dans le nom composé', () => {
        const result = usersToMembres([makeUser({ lastName: '  Dupont  ', firstName: '  Jean  ' })]);
        expect(result[0].nom).toBe('Dupont Jean');
    });

    it('retourne une liste vide pour une entrée vide', () => {
        expect(usersToMembres([])).toEqual([]);
    });
});
