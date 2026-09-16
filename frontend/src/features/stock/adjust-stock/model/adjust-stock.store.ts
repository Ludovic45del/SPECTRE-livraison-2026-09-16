/**
 * Adjust Stock Dialog Store — Zustand.
 *
 * Pilote l'ouverture du dialog d'ajustement de stock (ajout / retrait) pour
 * un consommable. On garde l'item complet en mémoire (et non juste son uuid)
 * afin d'afficher la quantité courante et l'unité sans refetch.
 *
 * Calqué sur `features/stock/edit-item/model/edit-item.store`.
 */

import { create } from 'zustand';
import type { StockCatalogItem } from '@entities/stock-item';

interface AdjustStockState {
    isOpen: boolean;
    item: StockCatalogItem | null;
    open: (item: StockCatalogItem) => void;
    close: () => void;
}

export const useAdjustStockStore = create<AdjustStockState>((set) => ({
    isOpen: false,
    item: null,
    open: (item) => set({ isOpen: true, item }),
    close: () => set({ isOpen: false, item: null }),
}));
