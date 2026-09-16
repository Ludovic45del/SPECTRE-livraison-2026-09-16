/**
 * Stock helpers — formatters + predicates (tests purs).
 */
import { describe, it, expect } from 'vitest';

import { StockCatalogItemSchema, type StockCatalogItemApi } from '../model/stock-item.schema';
import {
    formatLocation,
    formatQuantity,
    getCategoryLabel,
    isExpired,
    isExpiringSoon,
    isLowStock,
} from './stock-item.helpers';

const baseApi: StockCatalogItemApi = {
    uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    kind: 'consumable',
    category: 'colles',
    structuration_type: null,
    name: 'Araldite',
    reference: null,
    caracteristique: null,
    type_de_colle: null,
    fournisseur: null,
    remarques: null,
    unite: 'tubes',
    quantite: 5,
    seuil_alerte: 2,
    date_peremption: null,
    type_d_achat: null,
    fsec_name: null,
    installation: null,
    status: null,
    materiaux_mat: null,
    boite: null,
    emplacement: null,
    is_active: true,
    created_at: null,
    updated_at: null,
};

const parseItem = (overrides: Partial<StockCatalogItemApi> = {}) =>
    StockCatalogItemSchema.parse({ ...baseApi, ...overrides });

describe('isLowStock', () => {
    it('retourne true quand quantite ≤ seuil', () => {
        expect(isLowStock(parseItem({ quantite: 1, seuil_alerte: 2 }))).toBe(true);
        expect(isLowStock(parseItem({ quantite: 2, seuil_alerte: 2 }))).toBe(true);
    });

    it('retourne false quand quantite > seuil', () => {
        expect(isLowStock(parseItem({ quantite: 3, seuil_alerte: 2 }))).toBe(false);
    });

    it('retourne false sans seuil défini', () => {
        expect(isLowStock(parseItem({ seuil_alerte: null }))).toBe(false);
    });

    it('retourne false sur un élément (jamais en stock bas)', () => {
        const elementItem = parseItem({
            kind: 'element',
            category: 'pieces_elementaires',
            quantite: null,
            seuil_alerte: null,
            unite: null,
        });
        expect(isLowStock(elementItem)).toBe(false);
    });
});

describe('isExpired', () => {
    const today = new Date('2026-04-25T12:00:00Z');

    it('retourne true si date_peremption < aujourd’hui', () => {
        expect(isExpired(parseItem({ date_peremption: '2026-04-01' }), today)).toBe(true);
    });

    it('retourne true si date_peremption = aujourd’hui (même jour)', () => {
        expect(isExpired(parseItem({ date_peremption: '2026-04-25' }), today)).toBe(true);
    });

    it('retourne false si date_peremption > aujourd’hui', () => {
        expect(isExpired(parseItem({ date_peremption: '2026-04-26' }), today)).toBe(false);
    });

    it('retourne false sans date_peremption', () => {
        expect(isExpired(parseItem({ date_peremption: null }), today)).toBe(false);
    });
});

describe('isExpiringSoon', () => {
    const today = new Date('2026-04-25T12:00:00Z');

    it('retourne true si date dans la fenêtre 30 jours', () => {
        expect(isExpiringSoon(parseItem({ date_peremption: '2026-05-10' }), today)).toBe(true);
    });

    it('retourne false si déjà périmé', () => {
        expect(isExpiringSoon(parseItem({ date_peremption: '2026-04-01' }), today)).toBe(false);
    });

    it('retourne false si > 30 jours', () => {
        expect(isExpiringSoon(parseItem({ date_peremption: '2026-06-30' }), today)).toBe(false);
    });
});

describe('formatLocation / formatQuantity', () => {
    it('formatLocation joint boite et emplacement', () => {
        expect(formatLocation(parseItem({ boite: 'Boîte 1', emplacement: 'Étagère 3' }))).toBe('Boîte 1 · Étagère 3');
    });

    it('formatLocation retourne — si rien', () => {
        expect(formatLocation(parseItem({ boite: null, emplacement: null }))).toBe('—');
    });

    it('formatQuantity affiche "N unite"', () => {
        expect(formatQuantity(parseItem({ quantite: 7, unite: 'tubes' }))).toBe('7 tubes');
    });

    it('formatQuantity retourne — si quantite ou unite null', () => {
        expect(formatQuantity(parseItem({ quantite: null, unite: 'tubes' }))).toBe('—');
        expect(formatQuantity(parseItem({ quantite: 7, unite: null }))).toBe('—');
    });
});

describe('getCategoryLabel', () => {
    it('retourne le libellé FR depuis le code', () => {
        expect(getCategoryLabel('pieces_elementaires')).toBe('Pièces élémentaires');
        expect(getCategoryLabel('colles')).toBe('Colles');
    });

    it('retourne — si code null/undefined', () => {
        expect(getCategoryLabel(null)).toBe('—');
        expect(getCategoryLabel(undefined)).toBe('—');
    });
});
