/**
 * Tests du composant RoleMultiSelect.
 *
 * Couvre :
 * - proposition de tous les rôles métier SPECTRE
 * - sélection multiple → liste de rôles propagée
 * - réordonnancement selon la hiérarchie, quel que soit l'ordre de clic
 * - valeur initiale (controlled) rendue en chips
 */

import { describe, expect, it } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import { useState } from 'react';
import type { SpectreRole } from '../core/model/user.schema';
import { RoleMultiSelect } from './RoleMultiSelect';

function ControlledHarness({ initialValue = [] }: { initialValue?: SpectreRole[] }) {
    const [value, setValue] = useState<SpectreRole[]>(initialValue);
    return (
        <div>
            <RoleMultiSelect value={value} onChange={setValue} />
            <div data-testid="current-value">{value.join(',') || 'empty'}</div>
        </div>
    );
}

describe('RoleMultiSelect', () => {
    it('propose tous les rôles métier', async () => {
        const { user } = setup(<ControlledHarness />);

        await user.click(screen.getByLabelText('Rôles'));

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Chef de laboratoire' })).toBeInTheDocument();
        });
        expect(screen.getByRole('option', { name: 'Métrologue' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Stagiaire' })).toBeInTheDocument();
    });

    it('cumule plusieurs rôles et les réordonne par hiérarchie', async () => {
        const { user } = setup(<ControlledHarness />);

        await user.click(screen.getByLabelText('Rôles'));
        // Clic dans le désordre : métrologue avant chef de laboratoire.
        await user.click(await screen.findByRole('option', { name: 'Métrologue' }));
        await user.click(await screen.findByRole('option', { name: 'Chef de laboratoire' }));

        expect(screen.getByTestId('current-value')).toHaveTextContent('chef_labo,metrologue');
    });

    it('affiche la valeur initiale en chips', () => {
        setup(<ControlledHarness initialValue={['assembleur', 'metrologue']} />);

        expect(screen.getByText('Assembleur')).toBeInTheDocument();
        expect(screen.getByText('Métrologue')).toBeInTheDocument();
    });
});
