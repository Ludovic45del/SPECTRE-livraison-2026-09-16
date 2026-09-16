/**
 * Tests de la sous-page « Équipe » (annuaire du personnel).
 *
 * Couvre :
 * - liste à plat du personnel (une carte par membre, sans regroupement)
 * - recherche plein-texte (filtre les cartes)
 * - état vide quand aucun membre ne correspond
 *
 * Données via le handler MSW `/api/v1/users/lookup/` (mockUserLookup, 7 membres
 * actifs couvrant 7 rôles).
 */

import { describe, expect, it } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import EquipeAnnuairePage from './annuaire';

describe('EquipeAnnuairePage', () => {
    it('liste le personnel en cartes (sans regroupement par rôle)', async () => {
        setup(<EquipeAnnuairePage />);

        expect(await screen.findByText('Pierre Dupont')).toBeInTheDocument();
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();

        // Plus d'en-têtes de section par rôle : les rôles ne sont qu'une puce de carte.
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    it('filtre le personnel via la recherche plein-texte', async () => {
        const { user } = setup(<EquipeAnnuairePage />);
        await screen.findByText('Pierre Dupont');

        const searchBox = screen.getByLabelText('Rechercher un membre du personnel');
        await user.type(searchBox, 'Alice');

        await waitFor(() => expect(screen.queryByText('Pierre Dupont')).not.toBeInTheDocument());
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    });

    it('affiche un état vide quand aucun membre ne correspond', async () => {
        const { user } = setup(<EquipeAnnuairePage />);
        await screen.findByText('Pierre Dupont');

        const searchBox = screen.getByLabelText('Rechercher un membre du personnel');
        await user.type(searchBox, 'zzzzz-introuvable');

        expect(await screen.findByText(/Aucun membre ne correspond/)).toBeInTheDocument();
    });
});
