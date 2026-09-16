/**
 * Tests du composant UserMultiSelect.
 *
 * Couvre :
 * - Filtrage par rôle (+ chef_labo par défaut)
 * - Sélection multiple → liste d'uuids propagée
 * - Valeur initiale (controlled) rendue en chips
 */

import { describe, expect, it } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import { useState } from 'react';
import { UserMultiSelect } from './UserMultiSelect';

const LUCIE_UUID = '44444444-4444-4444-4444-444444444444'; // assembleur
const PIERRE_UUID = '11111111-1111-1111-1111-111111111111'; // chef_labo

function ControlledHarness({
    roles,
    initialValue = [],
}: {
    roles?: import('@entities/user').SpectreRole[];
    initialValue?: string[];
}) {
    const [value, setValue] = useState<string[]>(initialValue);
    return (
        <div>
            <UserMultiSelect value={value} onChange={setValue} roles={roles} label="Assembleurs" />
            <div data-testid="current-value">{value.join(',') || 'empty'}</div>
        </div>
    );
}

describe('UserMultiSelect', () => {
    it('affiche les utilisateurs filtrés par rôle (+ chef_labo)', async () => {
        const { user } = setup(<ControlledHarness roles={['assembleur']} />);

        await user.click(screen.getByLabelText('Assembleurs'));

        await waitFor(() => {
            expect(screen.getByRole('option', { name: /Lucie Petit/ })).toBeInTheDocument();
        });
        // assembleur + chef_labo
        expect(screen.getByRole('option', { name: /Pierre Dupont/ })).toBeInTheDocument();
        // metrologue ne doit PAS apparaître
        expect(screen.queryByRole('option', { name: /Alice Martin/ })).not.toBeInTheDocument();
    });

    it('sélectionne plusieurs opérateurs et propage la liste d’uuids', async () => {
        const { user } = setup(<ControlledHarness roles={['assembleur']} />);

        await user.click(screen.getByLabelText('Assembleurs'));
        await user.click(await screen.findByRole('option', { name: /Lucie Petit/ }));

        // Le popup se ferme après sélection → on le rouvre pour le 2e.
        await user.click(screen.getByLabelText('Assembleurs'));
        await user.click(await screen.findByRole('option', { name: /Pierre Dupont/ }));

        await waitFor(() => {
            expect(screen.getByTestId('current-value')).toHaveTextContent(`${LUCIE_UUID},${PIERRE_UUID}`);
        });
    });

    it('affiche la sélection initiale en chips (controlled)', async () => {
        setup(<ControlledHarness roles={['assembleur']} initialValue={[LUCIE_UUID, PIERRE_UUID]} />);

        // Les deux opérateurs sont rendus en chips.
        await waitFor(() => {
            expect(screen.getByText('Lucie Petit')).toBeInTheDocument();
        });
        expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
    });
});
