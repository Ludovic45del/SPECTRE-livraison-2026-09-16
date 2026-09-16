/**
 * Embases List Page - Utils Tests
 * @module pages/embases
 */

import { describe, it, expect } from 'vitest';
import type { Embase } from '@entities/embase';
import type { EmbaseFilters } from '@features/embase';
import { filterEmbases, sortEmbases, getStatut } from './embase-list-utils';

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------

const createEmbase = (overrides: Partial<Embase> = {}): Embase => ({
    slug: 'emb-001',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    identifier: 'EMB-001',
    type: 'jet_de_gaz' as const,
    nombreVoies: 1 as 1 | 2,
    souffletV1: '',
    capteurV1: '',
    offsetV1Mv: null,
    mesurandeLieV1Mv: null,
    sensibiliteV1Mv: null,
    signalMeteocielV1Mv: null,
    capteurCiblePfeifferMbar: null,
    etendueV1Mbar: null,
    testEtancheiteHe: '',
    testCapteurMrg: '',
    etalonnageDate: null,
    observationsV1: '',
    operationnelleAimant: false,
    operationnelleBroche: false,
    localisationActuelle: '',
    coteVe: null,
    decalageAngulaire: '',
    chargementMcc: '',
    souffletV2: '',
    capteurV2: '',
    offsetV2Mv: null,
    mesurandeLieV2Mv: null,
    sensibiliteV2Mv: null,
    signalMeteocielV2Mv: null,
    capteurCiblePfeifferV2Mbar: null,
    etendueV2Mbar: null,
    testEtancheiteHeV2: '',
    testCapteurMrgV2: '',
    observationsV2: '',
    electrovanne: false,
    fsecHistory: '',
    lastEtalonnageDate: null,
    lastEtalonnageDateV1: null,
    lastEtalonnageDateV2: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
});

const defaultFilters: EmbaseFilters = {
    name: '',
    type: null,
    nombreVoies: [1, 2],
};

// ---------------------------------------------------------------------------
// filterEmbases
// ---------------------------------------------------------------------------

describe('filterEmbases', () => {
    const embases: Embase[] = [
        createEmbase({ identifier: 'EMB-001', type: 'jet_de_gaz', nombreVoies: 1 }),
        createEmbase({ identifier: 'EMB-002', type: 'hp', nombreVoies: 2 }),
        createEmbase({ identifier: 'EMB-003', type: 'bp', nombreVoies: 1 }),
        createEmbase({ identifier: 'TEST-004', type: 'hp', nombreVoies: 2 }),
    ];

    it('should return all embases when no filter is applied', () => {
        const result = filterEmbases(embases, defaultFilters);
        expect(result).toHaveLength(4);
    });

    it('should filter by name (case insensitive)', () => {
        const filters: EmbaseFilters = { ...defaultFilters, name: 'emb' };
        const result = filterEmbases(embases, filters);
        expect(result).toHaveLength(3);
        expect(result.every((e) => e.identifier.toLowerCase().includes('emb'))).toBe(true);
    });

    it('should filter by type', () => {
        const filters: EmbaseFilters = { ...defaultFilters, type: 'hp' };
        const result = filterEmbases(embases, filters);
        expect(result).toHaveLength(2);
        expect(result.every((e) => e.type === 'hp')).toBe(true);
    });

    it('should filter by nombreVoies', () => {
        const filters: EmbaseFilters = { ...defaultFilters, nombreVoies: [1] };
        const result = filterEmbases(embases, filters);
        expect(result).toHaveLength(2);
        expect(result.every((e) => e.nombreVoies === 1)).toBe(true);
    });

    it('should combine multiple filters', () => {
        const filters: EmbaseFilters = { name: 'emb', type: 'jet_de_gaz', nombreVoies: [1] };
        const result = filterEmbases(embases, filters);
        expect(result).toHaveLength(1);
        expect(result[0].identifier).toBe('EMB-001');
    });
});

// ---------------------------------------------------------------------------
// sortEmbases
// ---------------------------------------------------------------------------

describe('sortEmbases', () => {
    const embases: Embase[] = [
        createEmbase({ identifier: 'EMB-002', type: 'hp', localisationActuelle: 'Labo B' }),
        createEmbase({ identifier: 'EMB-001', type: 'bp', localisationActuelle: 'Labo A' }),
        createEmbase({ identifier: 'EMB-003', type: 'jet_de_gaz', localisationActuelle: 'Labo C' }),
    ];

    it('should sort by identifier ascending', () => {
        const result = sortEmbases(embases, 'identifier', 'asc');
        expect(result[0].identifier).toBe('EMB-001');
        expect(result[1].identifier).toBe('EMB-002');
        expect(result[2].identifier).toBe('EMB-003');
    });

    it('should sort by identifier descending', () => {
        const result = sortEmbases(embases, 'identifier', 'desc');
        expect(result[0].identifier).toBe('EMB-003');
        expect(result[1].identifier).toBe('EMB-002');
        expect(result[2].identifier).toBe('EMB-001');
    });

    it('should sort by type', () => {
        const result = sortEmbases(embases, 'type', 'asc');
        expect(result[0].type).toBe('bp');
        expect(result[1].type).toBe('hp');
        expect(result[2].type).toBe('jet_de_gaz');
    });
});

// ---------------------------------------------------------------------------
// getStatut
// ---------------------------------------------------------------------------

describe('getStatut', () => {
    it('should return Aimant when operationnelleAimant is true', () => {
        const embase = createEmbase({ operationnelleAimant: true, operationnelleBroche: false });
        const result = getStatut(embase);
        expect(result.label).toBe('Aimant');
        expect(result.color).toBe('#1976d2');
    });

    it('should return Broche when operationnelleBroche is true', () => {
        const embase = createEmbase({ operationnelleAimant: false, operationnelleBroche: true });
        const result = getStatut(embase);
        expect(result.label).toBe('Broche');
        expect(result.color).toBe('#7b1fa2');
    });

    it('should return dash when neither aimant nor broche is active', () => {
        const embase = createEmbase({ operationnelleAimant: false, operationnelleBroche: false });
        const result = getStatut(embase);
        expect(result.label).toBe('-');
        expect(result.color).toBe('');
    });
});
