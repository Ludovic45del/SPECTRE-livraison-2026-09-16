/**
 * Tests du composant UserSelect.
 *
 * Couvre :
 * - Filtrage par rôle (forwardé au backend via /users/lookup/?role=…)
 * - Inclusion automatique de chef_labo
 * - Sélection / désélection
 * - Valeur initiale (controlled)
 * - Gestion du loading
 * - Format affiché (Prénom Nom (matricule))
 */

import { describe, expect, it } from 'vitest';
import { setup, screen, waitFor, within } from '@test/test-utils';
import { useState } from 'react';
import { UserSelect } from './UserSelect';

function ControlledHarness({
    roles,
    alwaysIncludeChefLabo = true,
    initialValue = null,
}: {
    roles?: import('@entities/user').SpectreRole[];
    alwaysIncludeChefLabo?: boolean;
    initialValue?: string | null;
}) {
    const [value, setValue] = useState<string | null>(initialValue);
    return (
        <div>
            <UserSelect
                value={value}
                onChange={setValue}
                roles={roles}
                alwaysIncludeChefLabo={alwaysIncludeChefLabo}
                label="Métrologue"
            />
            <div data-testid="current-value">{value ?? 'empty'}</div>
        </div>
    );
}

describe('UserSelect', () => {
    it('affiche les utilisateurs filtrés par rôle (+ chef_labo par défaut)', async () => {
        const { user } = setup(<ControlledHarness roles={['metrologue']} />);

        await user.click(screen.getByLabelText('Métrologue'));

        // Wait for options to populate.
        await waitFor(() => {
            expect(screen.getByRole('option', { name: /Alice Martin/ })).toBeInTheDocument();
        });

        // metrologue + chef_labo => Alice Martin et Pierre Dupont
        expect(screen.getByRole('option', { name: /Alice Martin/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Pierre Dupont/ })).toBeInTheDocument();
        // IEC ne doit PAS apparaître
        expect(screen.queryByRole('option', { name: /Jean Bernard/ })).not.toBeInTheDocument();
    });

    it('exclut chef_labo si alwaysIncludeChefLabo=false', async () => {
        const { user } = setup(<ControlledHarness roles={['metrologue']} alwaysIncludeChefLabo={false} />);

        await user.click(screen.getByLabelText('Métrologue'));

        await waitFor(() => {
            expect(screen.getByRole('option', { name: /Alice Martin/ })).toBeInTheDocument();
        });
        expect(screen.queryByRole('option', { name: /Pierre Dupont/ })).not.toBeInTheDocument();
    });

    it('renvoie tous les users actifs si aucun rôle fourni', async () => {
        const { user } = setup(<ControlledHarness />);

        await user.click(screen.getByLabelText('Métrologue'));

        await waitFor(() => {
            expect(screen.getByRole('option', { name: /Alice Martin/ })).toBeInTheDocument();
        });
        expect(screen.getByRole('option', { name: /Jean Bernard/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Sophie Lefevre/ })).toBeInTheDocument();
    });

    it('format de chaque option : "Prénom Nom" (sans matricule)', async () => {
        const { user } = setup(<ControlledHarness roles={['metrologue']} />);

        await user.click(screen.getByLabelText('Métrologue'));

        const option = await screen.findByRole('option', { name: /Alice Martin/ });
        expect(within(option).getByText('Alice Martin')).toBeInTheDocument();
    });

    it('sélectionne un opérateur et propage l’uuid', async () => {
        const { user } = setup(<ControlledHarness roles={['metrologue']} />);

        await user.click(screen.getByLabelText('Métrologue'));
        const option = await screen.findByRole('option', { name: /Alice Martin/ });
        await user.click(option);

        expect(screen.getByTestId('current-value')).toHaveTextContent('22222222-2222-2222-2222-222222222222');
    });

    it('affiche la sélection initiale (controlled)', async () => {
        setup(<ControlledHarness roles={['metrologue']} initialValue="22222222-2222-2222-2222-222222222222" />);

        const input = await screen.findByLabelText('Métrologue');
        await waitFor(() => {
            expect(input).toHaveValue('Alice Martin');
        });
    });

    it('valeur hors annuaire (utilisateur désactivé) : repli affiché, FK conservée', async () => {
        // /users/lookup/ ne renvoie que les actifs : un uuid saisi avant la
        // désactivation ne doit ni afficher un champ vide ni perdre la valeur.
        setup(<ControlledHarness roles={['metrologue']} initialValue="99999999-9999-9999-9999-999999999999" />);

        const input = await screen.findByLabelText('Métrologue');
        await waitFor(() => {
            expect(input).toHaveValue('Utilisateur désactivé');
        });
        expect(screen.getByTestId('current-value')).toHaveTextContent('99999999-9999-9999-9999-999999999999');
    });
});
