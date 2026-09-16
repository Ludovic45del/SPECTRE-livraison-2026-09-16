/**
 * CatalogToolbar — filtres avancés sans superposition label/valeur (R16).
 *
 * Régression : avec `displayEmpty`, le texte « — Tous — » s'affichait DANS le
 * champ fermé alors que le label outliné (« Type », …) n'était pas rétracté :
 * les deux textes se superposaient. Champ vide ⇒ seul le label est visible ;
 * l'option « — Tous — » reste sélectionnable dans le menu déroulant.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';

import { ITEM_KIND, ITEM_KIND_LABELS } from '@entities/stock-item';
import { renderWithProviders, screen, within } from '@test/test-utils';

import { useFilterCatalogStore } from '../model/filter-catalog.store';
import { CatalogToolbar } from './CatalogToolbar';

const PLACEHOLDER = '— Tous —';

const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /filtres/i }));
    return screen.findByText('Filtres avancés');
};

describe('CatalogToolbar — popover Filtres', () => {
    beforeEach(() => {
        useFilterCatalogStore.getState().reset();
    });

    it("n'affiche que le label dans les Select vides (pas de « — Tous — » superposé)", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CatalogToolbar />);

        await openFilters(user);

        // Les 3 Select sont présents, nommés par leur label…
        expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /statut élément/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /installation/i })).toBeInTheDocument();

        // …et aucun placeholder n'est rendu dans les champs fermés.
        expect(screen.queryByText(PLACEHOLDER)).not.toBeInTheDocument();
        for (const combobox of screen.getAllByRole('combobox')) {
            expect(combobox).not.toHaveTextContent(PLACEHOLDER);
        }
    });

    it('propose toujours « — Tous — » dans le menu et remet le filtre à null', async () => {
        const user = userEvent.setup();
        renderWithProviders(<CatalogToolbar />);

        await openFilters(user);

        const kindSelect = screen.getByRole('combobox', { name: /type/i });
        await user.click(kindSelect);
        const listbox = await screen.findByRole('listbox');
        expect(within(listbox).getByRole('option', { name: PLACEHOLDER })).toBeInTheDocument();

        // Sélection d'un type → filtre appliqué et affiché dans le champ.
        await user.click(within(listbox).getByRole('option', { name: ITEM_KIND_LABELS[ITEM_KIND.ELEMENT] }));
        expect(useFilterCatalogStore.getState().filters.kind).toBe(ITEM_KIND.ELEMENT);
        expect(screen.getByRole('combobox', { name: /type/i })).toHaveTextContent(ITEM_KIND_LABELS[ITEM_KIND.ELEMENT]);

        // Retour à « — Tous — » → filtre remis à null, champ de nouveau vide.
        await user.click(screen.getByRole('combobox', { name: /type/i }));
        await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: PLACEHOLDER }));
        expect(useFilterCatalogStore.getState().filters.kind).toBeNull();
        expect(screen.getByRole('combobox', { name: /type/i })).not.toHaveTextContent(PLACEHOLDER);
    });
});
