/**
 * Stock Catalog Item — TanStack Query Key Factory.
 */

import type { CategoryCode, ElementStatus, Installation, ItemKind } from '../model/stock.constants';

export interface StockCatalogListFilters {
    kind: ItemKind | null;
    category: CategoryCode | null;
    status: ElementStatus | null;
    installation: Installation | null;
    search: string;
}

export const stockCatalogKeys = {
    all: ['stock-catalog'] as const,
    lists: () => [...stockCatalogKeys.all, 'list'] as const,
    list: (filters: StockCatalogListFilters) => [...stockCatalogKeys.lists(), filters] as const,
    details: () => [...stockCatalogKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...stockCatalogKeys.details(), uuid] as const,
    /** Prochain numéro de série global pour une structuration (aperçu mode paquet). */
    nextStructurationNumber: () => [...stockCatalogKeys.all, 'next-structuration-number'] as const,
};

export const stockAlertKeys = {
    all: ['stock-alerts'] as const,
};

export const stockMovementKeys = {
    all: ['stock-movements'] as const,
    /** Historique des mouvements d'un item du catalogue. */
    byItem: (uuid: string) => [...stockMovementKeys.all, uuid] as const,
};
