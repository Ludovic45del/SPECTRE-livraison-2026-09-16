/**
 * Store de création + valeurs initiales (duplication R06).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { ITEM_KIND, StockCatalogItemSchema } from '@entities/stock-item';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';

import { useCreateItemStore } from './create-item.store';
import {
    buildConsumableDefaultValues,
    buildElementDefaultValues,
    EMPTY_CONSUMABLE_DEFAULTS,
    EMPTY_ELEMENT_DEFAULTS,
} from './prefill';

const ELEMENT = StockCatalogItemSchema.parse(
    createMockStockCatalogItem({
        kind: 'element',
        category: 'pieces_elementaires',
        name: 'Écran Au 12',
        reference: 'ECR-012',
        fsec_name: 'Cible-01',
        installation: 'OMEGA',
        status: 'reservee',
        caracteristique: 'Épaisseur 50 µm',
        matiere: 'Or',
        masse_mg: 12.5,
        fournisseur: 'CEA',
        boite: 'A3',
        emplacement: 'Étagère 2',
        remarques: 'Lot 7',
        unite: null,
        quantite: null,
        seuil_alerte: null,
    }),
);

const CONSUMABLE = StockCatalogItemSchema.parse(
    createMockStockCatalogItem({
        kind: 'consumable',
        category: 'colles',
        name: 'Araldite',
        reference: 'AR-100',
        unite: 'tubes',
        quantite: 9,
        seuil_alerte: 2,
        date_peremption: '2027-01-31',
    }),
);

describe('useCreateItemStore — duplication', () => {
    beforeEach(() => {
        useCreateItemStore.getState().reset();
    });

    it('open() démarre une création vierge à l’étape kind', () => {
        useCreateItemStore.getState().open();
        const s = useCreateItemStore.getState();
        expect(s.isOpen).toBe(true);
        expect(s.step).toBe('kind');
        expect(s.prefill).toBeNull();
    });

    it('openWithPrefill() saute à l’étape form avec le kind et l’item source', () => {
        useCreateItemStore.getState().openWithPrefill(CONSUMABLE);
        const s = useCreateItemStore.getState();
        expect(s.isOpen).toBe(true);
        expect(s.step).toBe('form');
        expect(s.selectedKind).toBe(ITEM_KIND.CONSUMABLE);
        expect(s.prefill).toBe(CONSUMABLE);
    });

    it('reset() vide le prefill (le prochain « Ajouter » repart vierge)', () => {
        useCreateItemStore.getState().openWithPrefill(ELEMENT);
        useCreateItemStore.getState().reset();
        expect(useCreateItemStore.getState().prefill).toBeNull();
        expect(useCreateItemStore.getState().isOpen).toBe(false);
    });

    it('open() après une duplication ne conserve pas le prefill', () => {
        useCreateItemStore.getState().openWithPrefill(ELEMENT);
        useCreateItemStore.getState().open();
        expect(useCreateItemStore.getState().prefill).toBeNull();
        expect(useCreateItemStore.getState().step).toBe('kind');
    });
});

describe('buildElementDefaultValues', () => {
    it('renvoie les valeurs vierges sans prefill', () => {
        expect(buildElementDefaultValues(null)).toBe(EMPTY_ELEMENT_DEFAULTS);
        expect(buildElementDefaultValues(undefined)).toBe(EMPTY_ELEMENT_DEFAULTS);
    });

    it('copie les caractéristiques, nom compris — seule la référence est vidée (R06)', () => {
        const values = buildElementDefaultValues(ELEMENT);
        // « Dupliquer et modifier juste la référence » : le nom est conservé,
        // l'unicité kind/name/reference est portée par la nouvelle référence.
        expect(values.name).toBe('Écran Au 12');
        expect(values.reference).toBe('');
        expect(values.batchQuantity).toBe(1);
        expect(values.category).toBe('pieces_elementaires');
        expect(values.installation).toBe('OMEGA');
        expect(values.caracteristique).toBe('Épaisseur 50 µm');
        expect(values.matiere).toBe('Or');
        expect(values.masseMg).toBe(12.5);
        expect(values.fournisseur).toBe('CEA');
        expect(values.boite).toBe('A3');
        expect(values.emplacement).toBe('Étagère 2');
        expect(values.remarques).toBe('Lot 7');
        // La destination déclarative est copiée (pas la réservation, ni le statut).
        expect(values.fsecName).toBe('Cible-01');
        expect('status' in values).toBe(false);
    });
});

describe('buildConsumableDefaultValues', () => {
    it('renvoie les valeurs vierges sans prefill', () => {
        expect(buildConsumableDefaultValues(null)).toBe(EMPTY_CONSUMABLE_DEFAULTS);
    });

    it('copie unité / seuil / péremption, vide le nom et remet la quantité à 0', () => {
        const values = buildConsumableDefaultValues(CONSUMABLE);
        expect(values.name).toBe('');
        expect(values.quantite).toBe(0);
        expect(values.reference).toBe('AR-100');
        expect(values.unite).toBe('tubes');
        expect(values.seuilAlerte).toBe(2);
        expect(values.datePeremption).toBeInstanceOf(Date);
    });
});
