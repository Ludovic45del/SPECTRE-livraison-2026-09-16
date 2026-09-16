/**
 * Tests du composant PersonCard.
 *
 * Couvre :
 * - identité (nom, matricule), rôle et coordonnées renseignées
 * - numéro rendu en lien `tel:` (espaces retirés)
 * - repli sur les initiales en l'absence de photo
 * - masquage des lignes de coordonnées vides
 */

import { describe, expect, it, vi } from 'vitest';
import { setup, screen } from '@test/test-utils';
import type { UserLookup } from '@entities/user';
import { PersonCard } from './PersonCard';

const alice: UserLookup = {
    uuid: '22222222-2222-2222-2222-222222222222',
    username: 'amartin',
    firstName: 'Alice',
    lastName: 'Martin',
    roles: ['metrologue'],
    role: 'metrologue',
    isActive: true,
    laboratoire: 'LMJ',
    service: 'Métrologie',
    numero: '01 23 45 67 02',
    bureau: 'B-202',
    avatarUrl: null,
};

const stagiaireSansCoordonnees: UserLookup = {
    uuid: '77777777-7777-7777-7777-777777777777',
    username: 'sstagiaire',
    firstName: 'Sophie',
    lastName: 'Lefevre',
    roles: ['stagiaire'],
    role: 'stagiaire',
    isActive: true,
    laboratoire: '',
    service: '',
    numero: '',
    bureau: '',
    avatarUrl: null,
};

describe('PersonCard', () => {
    it("affiche l'identité, le rôle et les coordonnées renseignées", () => {
        setup(<PersonCard person={alice} />);

        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
        expect(screen.getByText('amartin')).toBeInTheDocument();
        expect(screen.getByText('Métrologue')).toBeInTheDocument();
        expect(screen.getByText('Métrologie')).toBeInTheDocument();
        expect(screen.getByText('LMJ')).toBeInTheDocument();
        expect(screen.getByText('B-202')).toBeInTheDocument();
    });

    it('rend le numéro en lien tel: sans espaces', () => {
        setup(<PersonCard person={alice} />);

        const tel = screen.getByText('01 23 45 67 02');
        expect(tel).toHaveAttribute('href', 'tel:0123456702');
    });

    it("replie sur les initiales quand aucune photo n'est fournie", () => {
        setup(<PersonCard person={alice} />);

        expect(screen.getByText('AM')).toBeInTheDocument();
    });

    it('masque les lignes de coordonnées vides', () => {
        setup(<PersonCard person={stagiaireSansCoordonnees} />);

        expect(screen.getByText('Sophie Lefevre')).toBeInTheDocument();
        expect(screen.getByText('Stagiaire')).toBeInTheDocument();
        // Aucune coordonnée renseignée → aucune valeur de contact rendue.
        expect(screen.queryByText('LMJ')).not.toBeInTheDocument();
    });

    it("sans adminActions : pas de menu d'actions", () => {
        setup(<PersonCard person={alice} />);
        expect(screen.queryByRole('button', { name: /Actions pour/ })).not.toBeInTheDocument();
    });

    it("avec adminActions : menu d'actions + badge « Désactivé » pour un compte inactif", async () => {
        const onEdit = vi.fn();
        const adminActions = { onEdit, onResetPassword: vi.fn(), onToggleActive: vi.fn() };
        const { user } = setup(<PersonCard person={{ ...alice, isActive: false }} adminActions={adminActions} />);

        expect(screen.getByText('Désactivé')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Actions pour Alice Martin' }));
        // Compte inactif → l'action de bascule propose la réactivation.
        expect(screen.getByRole('menuitem', { name: 'Réactiver' })).toBeInTheDocument();
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        expect(onEdit).toHaveBeenCalledTimes(1);
    });
});
