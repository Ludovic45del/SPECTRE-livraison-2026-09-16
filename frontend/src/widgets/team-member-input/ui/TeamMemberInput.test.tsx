/**
 * Tests du composant TeamMemberInput.
 *
 * Vérifie le switching :
 * - MOE / TCI → TextField (saisie libre)
 * - autres rôles (RCE, IEC, ASSEMBLEUR, METROLOGUE, OPERATEUR_PHOTOS) → UserSelect
 *
 * Vérifie aussi que la valeur émise garde l'invariant : exactement un des
 * deux champs (`name` ou `userUuid`) est non null à la fois.
 */

import { describe, expect, it, vi } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import { TeamMemberInput } from './TeamMemberInput';

describe('TeamMemberInput', () => {
    describe('texte libre (MOE/TCI)', () => {
        it('affiche un TextField pour MOE et propage le name', async () => {
            const onChange = vi.fn();
            const { user } = setup(
                <TeamMemberInput
                    roleLabel="MOE"
                    value={{ name: '', userUuid: null }}
                    onChange={onChange}
                    label="MOE"
                />,
            );

            const input = screen.getByLabelText('MOE');
            await user.type(input, 'Externe Maitre');

            // Dernier appel : name = dernier caractère tape, userUuid = null
            const calls = onChange.mock.calls;
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall.userUuid).toBeNull();
            expect(typeof lastCall.name).toBe('string');
        });

        it('affiche un TextField pour TCI', () => {
            setup(
                <TeamMemberInput
                    roleLabel="TCI"
                    value={{ name: 'Mr. TCI Externe', userUuid: null }}
                    onChange={vi.fn()}
                    label="TCI"
                />,
            );

            expect(screen.getByLabelText('TCI')).toHaveValue('Mr. TCI Externe');
        });
    });

    describe('UserSelect (autres rôles)', () => {
        it('affiche un Autocomplete pour METROLOGUE et propage userUuid', async () => {
            const onChange = vi.fn();
            const { user } = setup(
                <TeamMemberInput
                    roleLabel="METROLOGUE"
                    value={{ name: null, userUuid: null }}
                    onChange={onChange}
                    label="Métrologue"
                />,
            );

            await user.click(screen.getByLabelText('Métrologue'));
            const option = await screen.findByRole('option', { name: /Alice Martin/ });
            await user.click(option);

            await waitFor(() => {
                expect(onChange).toHaveBeenCalledWith({
                    name: null,
                    userUuid: '22222222-2222-2222-2222-222222222222',
                });
            });
        });

        it('OPERATEUR_PHOTOS → aucun filtre, affiche stagiaires inclus', async () => {
            const { user } = setup(
                <TeamMemberInput
                    roleLabel="OPERATEUR_PHOTOS"
                    value={{ name: null, userUuid: null }}
                    onChange={vi.fn()}
                    label="Opérateur Photos"
                />,
            );

            await user.click(screen.getByLabelText('Opérateur Photos'));
            await waitFor(() => {
                expect(screen.getByRole('option', { name: /Sophie Lefevre/ })).toBeInTheDocument();
            });
        });
    });
});
