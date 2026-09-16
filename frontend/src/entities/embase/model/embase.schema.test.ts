/**
 * Embase Schema Tests - Validation & Transformation
 * @module entities/embase/model
 *
 * Tests validation of EmbaseApiSchema (snake_case) and
 * transformation via EmbaseSchema (camelCase).
 */

import { describe, it, expect } from 'vitest';
import { EmbaseApiSchema, EmbaseSchema, EmbaseListSchema } from './embase.schema';

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------

const createValidApiData = (overrides: Record<string, unknown> = {}) => ({
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    identifier: 'EMB-001',
    type: 'jet_de_gaz',
    nombre_voies: 1,
    // VOIE V1
    soufflet_v1: 'S-100',
    capteur_v1: 'C-200',
    offset_v1_mv: 1.5,
    mesurande_lie_v1_mv: 2.0,
    sensibilite_v1_mv: 0.5,
    signal_meteociel_v1_mv: 3.0,
    capteur_cible_pfeiffer_mbar: 0.01,
    etendue_v1_mbar: 10.0,
    test_etancheite_he: 'OK',
    test_capteur_mrg: 'OK',
    etalonnage_date: '2024-06-15',
    observations_v1: 'RAS',
    // MECA
    operationnelle_aimant: true,
    operationnelle_broche: false,
    localisation_actuelle: 'Labo A',
    cote_ve: 12.5,
    decalage_angulaire: '45',
    chargement_mcc: 'OK',
    // VOIE V2
    soufflet_v2: '',
    capteur_v2: '',
    offset_v2_mv: null,
    mesurande_lie_v2_mv: null,
    sensibilite_v2_mv: null,
    signal_meteociel_v2_mv: null,
    capteur_cible_pfeiffer_v2_mbar: null,
    etendue_v2_mbar: null,
    test_etancheite_he_v2: '',
    test_capteur_mrg_v2: '',
    observations_v2: '',
    electrovanne: false,
    // Historique FSECs
    fsec_history: '',
    // Computed
    last_etalonnage_date: '2024-06-15',
    last_etalonnage_date_v1: '2024-06-15',
    last_etalonnage_date_v2: null,
    // Metadata
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-06-15T14:30:00Z',
    ...overrides,
});

// ---------------------------------------------------------------------------
// EmbaseApiSchema
// ---------------------------------------------------------------------------

describe('EmbaseApiSchema', () => {
    it('should validate a complete valid API response', () => {
        const data = createValidApiData();
        const result = EmbaseApiSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('should reject when required uuid field is missing', () => {
        const data = createValidApiData();
        delete (data as Record<string, unknown>).uuid;

        const result = EmbaseApiSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('should reject when required identifier field is missing', () => {
        const data = createValidApiData();
        delete (data as Record<string, unknown>).identifier;

        const result = EmbaseApiSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('should reject an invalid uuid format', () => {
        const data = createValidApiData({ uuid: 'not-a-uuid' });
        const result = EmbaseApiSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('should reject an invalid type value', () => {
        const data = createValidApiData({ type: 'invalid_type' });
        const result = EmbaseApiSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('should apply defaults for optional fields', () => {
        const minimalData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            identifier: 'EMB-MIN',
            type: 'hp',
        };

        const result = EmbaseApiSchema.safeParse(minimalData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.nombre_voies).toBe(1);
            expect(result.data.soufflet_v1).toBe('');
            expect(result.data.offset_v1_mv).toBeNull();
            expect(result.data.operationnelle_aimant).toBe(false);
            expect(result.data.electrovanne).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
// EmbaseSchema (Transformation snake_case -> camelCase)
// ---------------------------------------------------------------------------

describe('EmbaseSchema (Transformation)', () => {
    it('should transform snake_case to camelCase', () => {
        const apiData = createValidApiData();
        const result = EmbaseSchema.parse(apiData);

        expect(result.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.identifier).toBe('EMB-001');
        expect(result.type).toBe('jet_de_gaz');
        expect(result.nombreVoies).toBe(1);
        expect(result.souffletV1).toBe('S-100');
        expect(result.capteurV1).toBe('C-200');
        expect(result.offsetV1Mv).toBe(1.5);
        expect(result.operationnelleAimant).toBe(true);
        expect(result.operationnelleBroche).toBe(false);
        expect(result.localisationActuelle).toBe('Labo A');
        expect(result.chargementMcc).toBe('OK');
        expect(result.lastEtalonnageDate).toBe('2024-06-15');
        expect(result.createdAt).toBe('2024-01-10T08:00:00Z');
        expect(result.updatedAt).toBe('2024-06-15T14:30:00Z');
    });

    it('should handle null fields correctly', () => {
        const apiData = createValidApiData({
            offset_v1_mv: null,
            mesurande_lie_v1_mv: null,
            cote_ve: null,
            last_etalonnage_date: null,
            last_etalonnage_date_v1: null,
            last_etalonnage_date_v2: null,
            created_at: null,
            updated_at: null,
        });

        const result = EmbaseSchema.parse(apiData);

        expect(result.offsetV1Mv).toBeNull();
        expect(result.mesurandeLieV1Mv).toBeNull();
        expect(result.coteVe).toBeNull();
        expect(result.lastEtalonnageDate).toBeNull();
        expect(result.lastEtalonnageDateV1).toBeNull();
        expect(result.lastEtalonnageDateV2).toBeNull();
        expect(result.createdAt).toBeNull();
        expect(result.updatedAt).toBeNull();
    });

    it('should transform V2 fields', () => {
        const apiData = createValidApiData({
            soufflet_v2: 'S-V2',
            capteur_v2: 'C-V2',
            offset_v2_mv: 2.5,
            test_etancheite_he_v2: 'OK',
            electrovanne: true,
        });

        const result = EmbaseSchema.parse(apiData);

        expect(result.souffletV2).toBe('S-V2');
        expect(result.capteurV2).toBe('C-V2');
        expect(result.offsetV2Mv).toBe(2.5);
        expect(result.testEtancheiteHeV2).toBe('OK');
        expect(result.electrovanne).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// EmbaseListSchema
// ---------------------------------------------------------------------------

describe('EmbaseListSchema', () => {
    it('should validate an array of embases', () => {
        const apiList = [
            createValidApiData({ uuid: '111e4567-e89b-12d3-a456-426614174000', identifier: 'EMB-001' }),
            createValidApiData({ uuid: '222e4567-e89b-12d3-a456-426614174000', identifier: 'EMB-002' }),
        ];

        const result = EmbaseListSchema.parse(apiList);

        expect(result).toHaveLength(2);
        expect(result[0].uuid).toBe('111e4567-e89b-12d3-a456-426614174000');
        expect(result[1].uuid).toBe('222e4567-e89b-12d3-a456-426614174000');
        // Verify transformation happened (camelCase)
        expect(result[0].nombreVoies).toBeDefined();
        expect(result[1].localisationActuelle).toBeDefined();
    });

    it('should handle empty array', () => {
        const result = EmbaseListSchema.parse([]);
        expect(result).toEqual([]);
    });

    it('should reject if one item in array is invalid', () => {
        const apiList = [createValidApiData(), { uuid: 'invalid', identifier: 'EMB-BAD', type: 'unknown' }];

        const result = EmbaseListSchema.safeParse(apiList);
        expect(result.success).toBe(false);
    });
});
