/**
 * Catalog filter store — Zustand setters + reset + counter.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { CATEGORY, ELEMENT_STATUS, INSTALLATION, ITEM_KIND } from '@entities/stock-item';

import { countActiveAdvancedFilters, useFilterCatalogStore } from './filter-catalog.store';

describe('useFilterCatalogStore', () => {
    beforeEach(() => {
        useFilterCatalogStore.getState().reset();
    });

    it('démarre avec tous les filtres à vide', () => {
        const { filters } = useFilterCatalogStore.getState();
        expect(filters.search).toBe('');
        expect(filters.kind).toBeNull();
        expect(filters.category).toBeNull();
        expect(filters.status).toBeNull();
        expect(filters.installation).toBeNull();
    });

    it('setKind / setCategory / setStatus / setInstallation actualisent isolément', () => {
        const store = useFilterCatalogStore.getState();
        store.setKind(ITEM_KIND.ELEMENT);
        store.setCategory(CATEGORY.STRUCTURATION);
        store.setStatus(ELEMENT_STATUS.RESERVEE);
        store.setInstallation(INSTALLATION.LMJ);
        store.setSearch('cible');

        const { filters } = useFilterCatalogStore.getState();
        expect(filters.kind).toBe(ITEM_KIND.ELEMENT);
        expect(filters.category).toBe(CATEGORY.STRUCTURATION);
        expect(filters.status).toBe(ELEMENT_STATUS.RESERVEE);
        expect(filters.installation).toBe(INSTALLATION.LMJ);
        expect(filters.search).toBe('cible');
    });

    it('reset() remet les valeurs initiales', () => {
        const store = useFilterCatalogStore.getState();
        store.setKind(ITEM_KIND.ELEMENT);
        store.setSearch('foo');
        store.reset();

        const { filters } = useFilterCatalogStore.getState();
        expect(filters.kind).toBeNull();
        expect(filters.search).toBe('');
    });
});

describe('countActiveAdvancedFilters', () => {
    it('ignore la recherche texte', () => {
        expect(
            countActiveAdvancedFilters({
                search: 'cible',
                kind: null,
                category: null,
                status: null,
                installation: null,
            }),
        ).toBe(0);
    });

    it('compte chaque filtre avancé activé', () => {
        expect(
            countActiveAdvancedFilters({
                search: '',
                kind: ITEM_KIND.ELEMENT,
                category: CATEGORY.STRUCTURATION,
                status: null,
                installation: INSTALLATION.LMJ,
            }),
        ).toBe(3);
    });
});
