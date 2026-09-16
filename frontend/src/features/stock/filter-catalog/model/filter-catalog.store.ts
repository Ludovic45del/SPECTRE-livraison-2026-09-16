/**
 * Catalog Filter Store — Zustand.
 *
 * Persiste localement (en mémoire) les filtres actifs du Catalogue Stock.
 * Aucun stockage navigateur : les filtres sont resets à chaque rechargement.
 */

import { create } from 'zustand';
import type { CategoryCode, ElementStatus, Installation, ItemKind } from '@entities/stock-item';

export interface CatalogFilters {
    search: string;
    kind: ItemKind | null;
    category: CategoryCode | null;
    status: ElementStatus | null;
    installation: Installation | null;
}

const INITIAL_FILTERS: CatalogFilters = {
    search: '',
    kind: null,
    category: null,
    status: null,
    installation: null,
};

interface FilterCatalogState {
    filters: CatalogFilters;
    setSearch: (search: string) => void;
    setKind: (kind: ItemKind | null) => void;
    setCategory: (category: CategoryCode | null) => void;
    setStatus: (status: ElementStatus | null) => void;
    setInstallation: (installation: Installation | null) => void;
    reset: () => void;
}

export const useFilterCatalogStore = create<FilterCatalogState>((set) => ({
    filters: INITIAL_FILTERS,
    setSearch: (search) => set((state) => ({ filters: { ...state.filters, search } })),
    setKind: (kind) => set((state) => ({ filters: { ...state.filters, kind } })),
    setCategory: (category) => set((state) => ({ filters: { ...state.filters, category } })),
    setStatus: (status) => set((state) => ({ filters: { ...state.filters, status } })),
    setInstallation: (installation) => set((state) => ({ filters: { ...state.filters, installation } })),
    reset: () => set({ filters: INITIAL_FILTERS }),
}));

/** Compte les filtres actifs hors recherche texte (utilisé par le bouton "Filtres"). */
export function countActiveAdvancedFilters(filters: CatalogFilters): number {
    let n = 0;
    if (filters.kind) n += 1;
    if (filters.category) n += 1;
    if (filters.status) n += 1;
    if (filters.installation) n += 1;
    return n;
}
