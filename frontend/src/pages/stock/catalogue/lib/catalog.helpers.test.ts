/**
 * Catalog helpers — colonnes, rattachement Campagne / FSEC (R01) et tri.
 */
import { describe, expect, it } from 'vitest';

import { StockCatalogItemSchema } from '@entities/stock-item';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';

import { CATALOG_COLUMNS, COLUMN_WIDTHS, getCatalogFsecAssignment, sortCatalogItems } from './catalog.helpers';

const item = (overrides: Parameters<typeof createMockStockCatalogItem>[0]) =>
    StockCatalogItemSchema.parse(createMockStockCatalogItem(overrides));

describe('CATALOG_COLUMNS / COLUMN_WIDTHS', () => {
    it('contient la colonne « Campagne / FSEC »', () => {
        expect(CATALOG_COLUMNS.map((c) => c.key)).toContain('assignedFsec');
        expect(CATALOG_COLUMNS.find((c) => c.key === 'assignedFsec')?.label).toBe('Campagne / FSEC');
    });

    it('totalise 100 % et suit l’ordre des colonnes (+ actions en dernier)', () => {
        const total = Object.values(COLUMN_WIDTHS).reduce((sum, w) => sum + parseFloat(w), 0);
        expect(total).toBe(100);
        expect(Object.keys(COLUMN_WIDTHS)).toEqual([...CATALOG_COLUMNS.map((c) => c.key), 'actions']);
    });
});

describe('getCatalogFsecAssignment', () => {
    it('renvoie la FSEC réellement réservée pour un élément non disponible', () => {
        const a = getCatalogFsecAssignment(
            item({
                kind: 'element',
                category: 'pieces_elementaires',
                status: 'reservee',
                assigned_fsec_name: 'Cible-01',
                assigned_campaign_name: '2026-LMJ_Alpha',
                assigned_fsec_slug: '2026-lmj-alpha-cible-01',
                fsec_name: 'Ancienne destination',
            }),
        );
        expect(a).toEqual({
            kind: 'assigned',
            fsecName: 'Cible-01',
            campaignName: '2026-LMJ_Alpha',
            fsecSlug: '2026-lmj-alpha-cible-01',
        });
    });

    it('retombe sur la destination déclarative pour un élément disponible', () => {
        const a = getCatalogFsecAssignment(
            item({ kind: 'element', category: 'pieces_elementaires', status: 'dispo', fsec_name: 'Cible-02' }),
        );
        expect(a.kind).toBe('declared');
        expect(a.fsecName).toBe('Cible-02');
        expect(a.campaignName).toBeNull();
    });

    it('retombe sur la destination déclarative si le rattachement calculé est absent (donnée héritée)', () => {
        const a = getCatalogFsecAssignment(
            item({ kind: 'element', category: 'pieces_elementaires', status: 'reservee', fsec_name: 'Cible-03' }),
        );
        expect(a.kind).toBe('declared');
        expect(a.fsecName).toBe('Cible-03');
    });

    it("renvoie 'none' pour un élément sans FSEC et pour un consommable", () => {
        expect(getCatalogFsecAssignment(item({ kind: 'element', status: 'dispo' })).kind).toBe('none');
        expect(getCatalogFsecAssignment(item({ kind: 'consumable', fsec_name: 'Cible-01' })).kind).toBe('none');
    });

    it('tolère un payload sans les champs calculés (rétro-compatibilité)', () => {
        const raw = createMockStockCatalogItem({ kind: 'element', status: 'affectee' }) as Record<string, unknown>;
        delete raw.assigned_fsec_name;
        delete raw.assigned_campaign_name;
        delete raw.assigned_fsec_slug;
        delete raw.matiere;
        delete raw.masse_mg;
        const parsed = StockCatalogItemSchema.parse(raw);
        expect(parsed.assignedFsecName).toBeNull();
        expect(parsed.masseMg).toBeNull();
        expect(getCatalogFsecAssignment(parsed).kind).toBe('none');
    });
});

describe('sortCatalogItems — colonne assignedFsec', () => {
    const reserved = item({
        kind: 'element',
        name: 'B',
        status: 'reservee',
        assigned_fsec_name: 'Cible-01',
        assigned_campaign_name: '2026-LMJ_Alpha',
    });
    const declared = item({ kind: 'element', name: 'C', status: 'dispo', fsec_name: 'Cible-00' });
    const none = item({ kind: 'consumable', name: 'A' });

    it('trie par campagne + FSEC et groupe les items sans rattachement en fin (asc)', () => {
        const sorted = sortCatalogItems([none, reserved, declared], 'assignedFsec', 'asc');
        expect(sorted.map((i) => i.name)).toEqual(['B', 'C', 'A']);
    });

    it('inverse l’ordre en desc', () => {
        const sorted = sortCatalogItems([none, reserved, declared], 'assignedFsec', 'desc');
        expect(sorted.map((i) => i.name)).toEqual(['A', 'C', 'B']);
    });
});
