/**
 * RubricFilterPills — interactions de filtrage rubrique.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { CATEGORY, ITEM_KIND, type StockCatalogItem } from '@entities/stock-item';
import { renderWithProviders, screen } from '@test/test-utils';

import { useFilterCatalogStore } from '../model/filter-catalog.store';
import { RubricFilterPills } from './RubricFilterPills';

const buildItem = (overrides: Partial<StockCatalogItem> = {}): StockCatalogItem =>
    ({
        uuid: crypto.randomUUID(),
        kind: ITEM_KIND.CONSUMABLE,
        category: CATEGORY.COLLES,
        structurationType: null,
        name: 'Test',
        reference: null,
        caracteristique: null,
        typeDeColle: null,
        fournisseur: null,
        remarques: null,
        unite: null,
        quantite: null,
        seuilAlerte: null,
        datePeremption: null,
        typeDAchat: null,
        fsecName: null,
        installation: null,
        status: null,
        materiauxMat: null,
        boite: null,
        emplacement: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
        ...overrides,
    }) as StockCatalogItem;

describe('RubricFilterPills', () => {
    beforeEach(() => {
        useFilterCatalogStore.getState().reset();
    });

    it('affiche les 4 rubriques + "Toutes" et le total', () => {
        const items = [
            buildItem({ category: CATEGORY.PIECES_ELEMENTAIRES, kind: ITEM_KIND.ELEMENT }),
            buildItem({ category: CATEGORY.PIECES_ELEMENTAIRES, kind: ITEM_KIND.ELEMENT }),
            buildItem({ category: CATEGORY.COLLES }),
        ];

        renderWithProviders(<RubricFilterPills items={items} />);

        expect(screen.getByText('Toutes les rubriques')).toBeInTheDocument();
        expect(screen.getByText('Pièces élémentaires')).toBeInTheDocument();
        expect(screen.getByText('Structuration')).toBeInTheDocument();
        expect(screen.getByText('Colles')).toBeInTheDocument();
        expect(screen.getByText('Autres')).toBeInTheDocument();
    });

    it('compte les trois types de structuration sous la pill unique', () => {
        const items = [
            buildItem({
                category: CATEGORY.STRUCTURATION,
                structurationType: 'standard',
                kind: ITEM_KIND.ELEMENT,
            }),
            buildItem({
                category: CATEGORY.STRUCTURATION,
                structurationType: 'speciale',
                kind: ITEM_KIND.ELEMENT,
            }),
            buildItem({
                category: CATEGORY.STRUCTURATION,
                structurationType: 'ec',
                kind: ITEM_KIND.ELEMENT,
            }),
        ];

        renderWithProviders(<RubricFilterPills items={items} />);

        const structPill = screen.getByText('Structuration').closest('button')!;
        expect(structPill).toHaveTextContent('3');
    });

    it('affiche le compteur correct par rubrique', () => {
        const items = [
            buildItem({ category: CATEGORY.PIECES_ELEMENTAIRES, kind: ITEM_KIND.ELEMENT }),
            buildItem({ category: CATEGORY.PIECES_ELEMENTAIRES, kind: ITEM_KIND.ELEMENT }),
            buildItem({ category: CATEGORY.COLLES }),
        ];

        renderWithProviders(<RubricFilterPills items={items} />);

        const piecesPill = screen.getByText('Pièces élémentaires').closest('button')!;
        expect(piecesPill).toHaveTextContent('2');

        const collesPill = screen.getByText('Colles').closest('button')!;
        expect(collesPill).toHaveTextContent('1');

        const structPill = screen.getByText('Structuration').closest('button')!;
        expect(structPill).toHaveTextContent('0');
    });

    it('clique une pill applique le filtre category dans le store', async () => {
        const { user } = await import('@testing-library/user-event').then((m) => ({
            user: m.default.setup(),
        }));
        renderWithProviders(<RubricFilterPills items={[]} />);

        const pill = screen.getByText('Colles').closest('button')!;
        await user.click(pill);

        expect(useFilterCatalogStore.getState().filters.category).toBe(CATEGORY.COLLES);
    });

    it('cliquer la pill active réinitialise le filtre', async () => {
        const { user } = await import('@testing-library/user-event').then((m) => ({
            user: m.default.setup(),
        }));
        useFilterCatalogStore.getState().setCategory(CATEGORY.COLLES);

        renderWithProviders(<RubricFilterPills items={[]} />);

        const pill = screen.getByText('Colles').closest('button')!;
        await user.click(pill);

        expect(useFilterCatalogStore.getState().filters.category).toBeNull();
    });

    it('clique "Toutes les rubriques" remet le filtre à null', async () => {
        const { user } = await import('@testing-library/user-event').then((m) => ({
            user: m.default.setup(),
        }));
        useFilterCatalogStore.getState().setCategory(CATEGORY.STRUCTURATION);

        renderWithProviders(<RubricFilterPills items={[]} />);

        const allPill = screen.getByText('Toutes les rubriques').closest('button')!;
        await user.click(allPill);

        expect(useFilterCatalogStore.getState().filters.category).toBeNull();
    });
});
