/**
 * CatalogTab — intégration filtre rubrique + compteurs.
 *
 * Régression : les compteurs des pills de rubrique doivent refléter le total
 * de chaque rubrique (filtré par les AUTRES filtres), pas le résultat filtré
 * par la rubrique active. Le filtrage `category` étant fait côté serveur,
 * sélectionner une rubrique ne doit pas ramener les autres compteurs à 0.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { renderWithProviders, screen, waitFor, within } from '@test/test-utils';
import { server } from '@test/mocks/server';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';
import { useCreateItemStore } from '@features/stock/create-item';
import { useFilterCatalogStore } from '@features/stock/filter-catalog';

import { CatalogTab } from './CatalogTab';

/**
 * Récupère le bouton-pill d'une rubrique. Le même libellé apparaît aussi dans
 * le RubricBadge (Chip) des lignes du tableau ; on remonte donc au <button>
 * ancêtre, que seules les pills possèdent.
 */
const pillByLabel = (label: string): HTMLElement => {
    const pill = screen
        .getAllByText(label)
        .map((el) => el.closest('button'))
        .find((btn): btn is HTMLButtonElement => btn !== null);
    if (!pill) throw new Error(`Pill rubrique introuvable : ${label}`);
    return pill;
};

const PIECE_1 = createMockStockCatalogItem({
    kind: 'element',
    category: 'pieces_elementaires',
    name: 'Vis titane M3',
    status: 'reservee',
    matiere: 'Titane',
    masse_mg: 0.8,
    assigned_fsec_name: 'Cible-01',
    assigned_campaign_name: '2026-LMJ_Alpha',
    assigned_fsec_slug: '2026-lmj-alpha-cible-01',
});
const PIECE_2 = createMockStockCatalogItem({
    kind: 'element',
    category: 'pieces_elementaires',
    name: 'Écrou inox M4',
    status: 'dispo',
});
const COLLE_1 = createMockStockCatalogItem({
    kind: 'consumable',
    category: 'colles',
    name: 'Colle Araldite 2011',
    quantite: 10,
    seuil_alerte: 2,
});

const ALL_ITEMS = [PIECE_1, PIECE_2, COLLE_1];

/** Handler qui mime le filtrage serveur par `category`. */
const catalogHandlerFilteringByCategory = http.get('/api/v1/stock/catalog/', ({ request }) => {
    const category = new URL(request.url).searchParams.get('category');
    const items = category ? ALL_ITEMS.filter((i) => i.category === category) : ALL_ITEMS;
    return HttpResponse.json(items);
});

describe('CatalogTab — compteurs de rubrique', () => {
    beforeEach(() => {
        useFilterCatalogStore.getState().reset();
        useCreateItemStore.getState().reset();
        server.use(catalogHandlerFilteringByCategory);
    });

    afterEach(() => {
        server.resetHandlers();
        useFilterCatalogStore.getState().reset();
        useCreateItemStore.getState().reset();
    });

    it('affiche la colonne « Campagne / FSEC » avec la FSEC réservée (R01)', async () => {
        renderWithProviders(<CatalogTab />);

        await screen.findByText('Colle Araldite 2011');

        expect(screen.getByText('Campagne / FSEC')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Cible-01' })).toBeInTheDocument();
        expect(screen.getByText('2026-LMJ_Alpha')).toBeInTheDocument();
    });

    it('ouvre la modale de création pré-remplie via « Dupliquer » (R06)', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CatalogTab />);

        await screen.findByText('Colle Araldite 2011');

        await user.click(screen.getByRole('button', { name: 'Dupliquer Vis titane M3' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Dupliquer — Vis titane M3')).toBeInTheDocument();
        // Formulaire élément directement (étape kind sautée) : nom conservé
        // (R06 — « modifier juste la référence »), matière copiée.
        expect(within(dialog).getByLabelText(/^nom/i)).toHaveValue('Vis titane M3');
        expect(within(dialog).getByLabelText(/référence/i)).toHaveValue('');
        expect(within(dialog).getByLabelText(/matière/i)).toHaveValue('Titane');
        expect(within(dialog).getByLabelText(/masse \[mg\]/i)).toHaveValue(0.8);
        expect(useCreateItemStore.getState().selectedKind).toBe('element');

        // Fermer vide le prefill : le prochain « Ajouter » repart vierge.
        await user.click(within(dialog).getByRole('button', { name: /fermer/i }));
        await waitFor(() => expect(useCreateItemStore.getState().prefill).toBeNull());
    });

    it('affiche le total réel de chaque rubrique au chargement', async () => {
        renderWithProviders(<CatalogTab />);

        await screen.findByText('Colle Araldite 2011');

        expect(pillByLabel('Toutes les rubriques')).toHaveTextContent('3');
        expect(pillByLabel('Pièces élémentaires')).toHaveTextContent('2');
        expect(pillByLabel('Colles')).toHaveTextContent('1');
    });

    it('garde les compteurs des autres rubriques quand une rubrique est sélectionnée', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CatalogTab />);

        await screen.findByText('Colle Araldite 2011');

        await user.click(pillByLabel('Pièces élémentaires'));

        // Le filtre serveur a bien restreint le tableau aux pièces…
        await waitFor(() => {
            expect(screen.queryByText('Colle Araldite 2011')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Vis titane M3')).toBeInTheDocument();

        // …mais les compteurs restent calculés sur l'ensemble (régression : pas de 0).
        expect(pillByLabel('Colles')).toHaveTextContent('1');
        expect(pillByLabel('Toutes les rubriques')).toHaveTextContent('3');
        expect(pillByLabel('Pièces élémentaires')).toHaveTextContent('2');
    });
});
