/**
 * Tests de la sous-page « Carte » (plan du centre).
 *
 * Couvre l'affichage de la surface encadrée (en-tête + action plein écran) et
 * l'ouverture du plein écran.
 */

import { describe, expect, it } from 'vitest';
import { setup, screen } from '@test/test-utils';
import EquipeCartePage from './carte';

describe('EquipeCartePage', () => {
    it("affiche la surface « Plan du centre » et l'action plein écran", () => {
        setup(<EquipeCartePage />);

        expect(screen.getByText('Plan du centre')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Afficher le plan en plein écran' })).toBeInTheDocument();
    });

    it("ouvre le plein écran au clic sur l'action dédiée", async () => {
        const { user } = setup(<EquipeCartePage />);

        await user.click(screen.getByRole('button', { name: 'Afficher le plan en plein écran' }));

        expect(await screen.findByRole('button', { name: 'Fermer le plein écran' })).toBeInTheDocument();
    });
});
