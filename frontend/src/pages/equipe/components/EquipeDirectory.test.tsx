/**
 * Tests du présentationnel EquipeDirectory.
 *
 * Couvre les deux modes :
 * - lecture seule (tout utilisateur) : pas de barre admin, inactifs masqués
 * - admin (chef de labo) : filtre Actifs/Tous, bouton Ajouter, menu d'actions
 *   par carte (callbacks invoqués avec l'uuid).
 */

import { describe, expect, it, vi } from 'vitest';
import { setup, screen } from '@test/test-utils';
import { EquipeDirectory } from './EquipeDirectory';
import type { PersonCardData } from './PersonCard';

const people: PersonCardData[] = [
    {
        uuid: '1',
        username: 'chef',
        firstName: 'Pierre',
        lastName: 'Dupont',
        roles: ['chef_labo'],
        role: 'chef_labo',
        isActive: true,
        laboratoire: 'LMJ',
        service: 'SEPI',
        numero: '',
        bureau: 'B-101',
        avatarUrl: null,
    },
    {
        uuid: '3',
        username: 'old',
        firstName: 'Old',
        lastName: 'Inactif',
        roles: ['assembleur'],
        role: 'assembleur',
        isActive: false,
        laboratoire: '',
        service: '',
        numero: '',
        bureau: '',
        avatarUrl: null,
    },
];

describe('EquipeDirectory', () => {
    it('mode lecture seule : pas de barre admin et inactifs masqués', () => {
        setup(<EquipeDirectory people={people} isLoading={false} error={null} />);

        expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
        expect(screen.queryByText('Old Inactif')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Actions pour/ })).not.toBeInTheDocument();
    });

    it('mode admin : Actifs/Tous, Ajouter et actions par carte', async () => {
        const onAdd = vi.fn();
        const onAction = vi.fn();
        const { user } = setup(
            <EquipeDirectory people={people} isLoading={false} error={null} admin={{ onAdd, onAction }} />,
        );

        // Actifs par défaut → l'inactif est masqué.
        expect(screen.queryByText('Old Inactif')).not.toBeInTheDocument();

        // Tous → l'inactif apparaît.
        await user.click(screen.getByRole('button', { name: 'Tous' }));
        expect(await screen.findByText('Old Inactif')).toBeInTheDocument();

        // Ajouter délègue au conteneur.
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));
        expect(onAdd).toHaveBeenCalledTimes(1);

        // Action depuis la carte → callback avec uuid + type.
        await user.click(screen.getByRole('button', { name: 'Actions pour Pierre Dupont' }));
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        expect(onAction).toHaveBeenCalledWith('1', 'edit');
    });
});
