/**
 * Create Catalog Item Modal Store — Zustand.
 *
 * Pilote le flux de création en 2 étapes :
 * 1. Choix du kind (élément sérialisé / consommable)
 * 2. Formulaire adaptatif au kind
 *
 * Duplication (R06) : `openWithPrefill(item)` ouvre directement le formulaire
 * du kind de l'item avec ses valeurs pré-remplies (le nom est vidé par les
 * shells pour respecter l'unicité kind/name/reference). `prefill` est remis à
 * `null` par `open()` et `reset()` pour qu'un « Ajouter » ultérieur reparte vierge.
 */

import { create } from 'zustand';
import { ITEM_KIND, type ItemKind, type StockCatalogItem } from '@entities/stock-item';

type Step = 'kind' | 'form';

interface CreateItemState {
    isOpen: boolean;
    step: Step;
    selectedKind: ItemKind;
    /** Item source d'une duplication, ou `null` pour une création vierge. */
    prefill: StockCatalogItem | null;
    open: () => void;
    /** Ouvre le formulaire pré-rempli à partir d'un item existant (duplication). */
    openWithPrefill: (item: StockCatalogItem) => void;
    close: () => void;
    selectKind: (kind: ItemKind) => void;
    goToKindStep: () => void;
    goToFormStep: () => void;
    reset: () => void;
}

const INITIAL_KIND: ItemKind = ITEM_KIND.ELEMENT;

export const useCreateItemStore = create<CreateItemState>((set) => ({
    isOpen: false,
    step: 'kind',
    selectedKind: INITIAL_KIND,
    prefill: null,

    open: () => set({ isOpen: true, step: 'kind', selectedKind: INITIAL_KIND, prefill: null }),
    openWithPrefill: (item) => set({ isOpen: true, step: 'form', selectedKind: item.kind, prefill: item }),
    close: () => set({ isOpen: false }),
    selectKind: (kind) => set({ selectedKind: kind }),
    goToKindStep: () => set({ step: 'kind' }),
    goToFormStep: () => set({ step: 'form' }),
    reset: () => set({ isOpen: false, step: 'kind', selectedKind: INITIAL_KIND, prefill: null }),
}));
