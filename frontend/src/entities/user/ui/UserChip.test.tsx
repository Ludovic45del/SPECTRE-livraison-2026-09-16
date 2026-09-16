/**
 * Tests du composant UserChip.
 *
 * Couvre :
 * - userUuid résolu → affiche "Prénom Nom" cliquable + popover
 * - userUuid absent + fallbackText → affiche le texte sans popover
 * - userUuid + fallbackText absents → affiche emptyText
 * - Le popover liste les infos disponibles (laboratoire, service, bureau, numéro)
 * - Les lignes vides sont masquées
 */

import { describe, expect, it } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import { UserChip } from './UserChip';

const ALICE_UUID = '22222222-2222-2222-2222-222222222222';
const STAGIAIRE_UUID = '77777777-7777-7777-7777-777777777777';

describe('UserChip', () => {
    it('affiche "Prénom Nom" cliquable quand userUuid est résolu', async () => {
        setup(<UserChip userUuid={ALICE_UUID} />);
        const trigger = await screen.findByRole('button', { name: /Alice Martin/ });
        expect(trigger).toHaveTextContent('Alice Martin');
    });

    it("ouvre un popover au clic avec les infos d'annuaire", async () => {
        const { user } = setup(<UserChip userUuid={ALICE_UUID} />);
        const trigger = await screen.findByRole('button', { name: /Alice Martin/ });
        await user.click(trigger);

        await waitFor(() => {
            expect(screen.getByText('Métrologue')).toBeInTheDocument();
        });
        expect(screen.getByText('LMJ')).toBeInTheDocument();
        expect(screen.getByText('Métrologie')).toBeInTheDocument();
        expect(screen.getByText('B-202')).toBeInTheDocument();
        expect(screen.getByText('01 23 45 67 02')).toBeInTheDocument();
    });

    it('masque les lignes vides dans le popover (laboratoire/bureau/etc.)', async () => {
        const { user } = setup(<UserChip userUuid={STAGIAIRE_UUID} />);
        const trigger = await screen.findByRole('button', { name: /Sophie Lefevre/ });
        await user.click(trigger);

        await waitFor(() => {
            expect(screen.getByText('Stagiaire')).toBeInTheDocument();
        });
        // Matricule toujours affiché (champ obligatoire)
        expect(screen.getByText('Matricule')).toBeInTheDocument();
        expect(screen.getByText('sstagiaire')).toBeInTheDocument();
        // Champs vides masqués pour le stagiaire
        expect(screen.queryByText('Bureau')).not.toBeInTheDocument();
        expect(screen.queryByText('Laboratoire')).not.toBeInTheDocument();
        expect(screen.queryByText('Service')).not.toBeInTheDocument();
        expect(screen.queryByText('Numéro')).not.toBeInTheDocument();
    });

    it('affiche le fallbackText sans popover si userUuid absent', () => {
        setup(<UserChip fallbackText="Maître Externe" />);
        expect(screen.getByText('Maître Externe')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('affiche emptyText par défaut si rien fourni', () => {
        setup(<UserChip />);
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('affiche emptyText custom si fourni', () => {
        setup(<UserChip emptyText="Non assigné" />);
        expect(screen.getByText('Non assigné')).toBeInTheDocument();
    });
});
