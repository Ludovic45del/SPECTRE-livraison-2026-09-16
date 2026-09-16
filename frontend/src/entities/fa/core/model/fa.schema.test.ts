/**
 * FA Schema Tests - Level 1 (Unit Tests)
 * @module entities/fa/model
 *
 * Tests validation and transformation of FA schemas
 */

import { describe, it, expect } from 'vitest';
import {
    FaApiSchema,
    FaSchema,
    FaCreateSchema,
    FaUpdateSchema,
    FaListSchema,
    faCreateToApi,
    faUpdateToApi,
} from './fa.schema';

// Test data factory
const createValidApiData = (overrides = {}) => ({
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
    status_id: 0,
    type_id: 1,
    criticality_id: 2,
    identifier: 'FA_2024_Campagne_Test_FSEC_01',
    fsec_step_id: 1,
    fsec_step_other: null,
    discoverer: 'John Doe',
    event_date: '2024-01-15',
    observation: 'Anomalie détectée',
    location_equipment: 'Banc 1',
    quick_analysis: 'Défaut de soudure',
    immediate_measures: 'Arrêt production',
    iec_validation_open: false,
    iec_validation_open_date: null,
    iec_validation_open_name: null,
    cause: null,
    experience_impact: null,
    iec_validation_progress: false,
    iec_validation_progress_name: null,
    closure_validation: null,
    closure_date: null,
    closure_validator_name: null,
    created_at: '2024-01-15T10:30:00Z',
    last_updated: '2024-01-15T10:30:00Z',
    ...overrides,
});

describe('FaApiSchema', () => {
    it('should validate a valid API FA response', () => {
        const validApiData = createValidApiData();
        const result = FaApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should validate FA with all phases filled', () => {
        const fullApiData = createValidApiData({
            status_id: 2, // Clos
            type_id: 0,
            criticality_id: 3,
            iec_validation_open: true,
            iec_validation_open_date: '2024-01-20',
            iec_validation_open_name: 'Validator 1',
            cause: 'Cause identifiée',
            experience_impact: 'Impact modéré',
            iec_validation_progress: true,
            iec_validation_progress_name: 'Validator 2',
            closure_validation: 'Fermeture validée',
            closure_date: '2024-01-30',
            closure_validator_name: 'Chef Labo',
        });

        const result = FaApiSchema.safeParse(fullApiData);
        expect(result.success).toBe(true);
    });

    it('should reject missing required uuid field', () => {
        const invalidData = createValidApiData();
        delete (invalidData as Record<string, unknown>).uuid;

        const result = FaApiSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject invalid uuid format', () => {
        const invalidData = createValidApiData({ uuid: 'not-a-uuid' });

        const result = FaApiSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should accept null for nullable fields', () => {
        const dataWithNulls = createValidApiData({
            status_id: null,
            type_id: null,
            criticality_id: null,
            fsec_step_id: null,
            fsec_step_other: null,
            event_date: null,
            location_equipment: null,
            immediate_measures: null,
            cause: null,
            experience_impact: null,
            closure_validation: null,
            closure_date: null,
            closure_validator_name: null,
            created_at: null,
            last_updated: null,
        });

        const result = FaApiSchema.safeParse(dataWithNulls);
        expect(result.success).toBe(true);
    });
});

describe('FaSchema (Transformation)', () => {
    it('should transform snake_case to camelCase', () => {
        const apiData = createValidApiData();
        const result = FaSchema.parse(apiData);

        expect(result.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.fsecVersionId).toBe('223e4567-e89b-12d3-a456-426614174001');
        expect(result.statusId).toBe(0);
        expect(result.typeId).toBe(1);
        expect(result.criticalityId).toBe(2);
        expect(result.identifier).toBe('FA_2024_Campagne_Test_FSEC_01');
        expect(result.fsecStepId).toBe(1);
        expect(result.discoverer).toBe('John Doe');
        expect(result.observation).toBe('Anomalie détectée');
        expect(result.locationEquipment).toBe('Banc 1');
        expect(result.quickAnalysis).toBe('Défaut de soudure');
        expect(result.immediateMeasures).toBe('Arrêt production');
        expect(result.iecValidationOpen).toBe(false);
    });

    it('should transform string dates to Date objects', () => {
        const apiData = createValidApiData({
            event_date: '2024-01-15',
            iec_validation_open_date: '2024-01-20',
            closure_date: '2024-01-30',
            created_at: '2024-01-15T10:30:00Z',
            last_updated: '2024-01-16T14:00:00Z',
        });

        const result = FaSchema.parse(apiData);

        expect(result.eventDate).toBeInstanceOf(Date);
        expect(result.iecValidationOpenDate).toBeInstanceOf(Date);
        expect(result.closureDate).toBeInstanceOf(Date);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle null date fields', () => {
        const apiData = createValidApiData({
            event_date: null,
            iec_validation_open_date: null,
            closure_date: null,
            created_at: null,
            last_updated: null,
        });

        const result = FaSchema.parse(apiData);

        expect(result.eventDate).toBeNull();
        expect(result.iecValidationOpenDate).toBeNull();
        expect(result.closureDate).toBeNull();
        expect(result.createdAt).toBeNull();
        expect(result.lastUpdated).toBeNull();
    });

    it('should transform Phase En Cours fields', () => {
        const apiData = createValidApiData({
            cause: 'Cause identifiée',
            experience_impact: 'Impact sur production',
            iec_validation_progress: true,
            iec_validation_progress_name: 'IEC Validator',
        });

        const result = FaSchema.parse(apiData);

        expect(result.cause).toBe('Cause identifiée');
        expect(result.experienceImpact).toBe('Impact sur production');
        expect(result.iecValidationProgress).toBe(true);
        expect(result.iecValidationProgressName).toBe('IEC Validator');
    });

    it('should transform Phase Clos fields', () => {
        const apiData = createValidApiData({
            closure_validation: 'Fermeture validée',
            closure_date: '2024-01-30',
            closure_validator_name: 'Chef Labo',
        });

        const result = FaSchema.parse(apiData);

        expect(result.closureValidation).toBe('Fermeture validée');
        expect(result.closureDate).toBeInstanceOf(Date);
        expect(result.closureValidatorName).toBe('Chef Labo');
    });
});

describe('FaListSchema', () => {
    it('should transform an array of FA API responses', () => {
        const apiList = [
            createValidApiData({ uuid: '111e4567-e89b-12d3-a456-426614174000' }),
            createValidApiData({ uuid: '222e4567-e89b-12d3-a456-426614174000' }),
        ];

        const result = FaListSchema.parse(apiList);

        expect(result).toHaveLength(2);
        expect(result[0].uuid).toBe('111e4567-e89b-12d3-a456-426614174000');
        expect(result[1].uuid).toBe('222e4567-e89b-12d3-a456-426614174000');
        // Verify transformation happened
        expect(result[0].fsecVersionId).toBeDefined();
    });

    it('should handle empty array', () => {
        const result = FaListSchema.parse([]);
        expect(result).toEqual([]);
    });
});

describe('FaCreateSchema', () => {
    it('should validate valid create data', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie détectée',
            quickAnalysis: 'Analyse rapide',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(true);
    });

    it('should validate with optional fields', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            fsecStepId: 1,
            fsecStepOther: 'Autre précision',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie détectée',
            locationEquipment: 'Banc 1',
            quickAnalysis: 'Analyse rapide',
            immediateMeasures: 'Mesures immédiates',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(true);
    });

    it('should reject missing required fsecVersionId', () => {
        const createData = {
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie',
            quickAnalysis: 'Analyse',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
    });

    it('should reject invalid fsecVersionId format', () => {
        const createData = {
            fsecVersionId: 'not-a-uuid',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie',
            quickAnalysis: 'Analyse',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('FSEC requis');
        }
    });

    it('should reject empty discoverer', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discoverer: '',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie',
            quickAnalysis: 'Analyse',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
    });

    it('should reject missing eventDate', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discoverer: 'John Doe',
            observation: 'Anomalie',
            quickAnalysis: 'Analyse',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
    });

    it('should reject empty observation', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: '',
            quickAnalysis: 'Analyse',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
    });

    it('should reject empty quickAnalysis', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie',
            quickAnalysis: '',
        };

        const result = FaCreateSchema.safeParse(createData);
        expect(result.success).toBe(false);
    });
});

describe('FaUpdateSchema', () => {
    it('should validate valid update data', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            observation: 'Nouvelle observation',
        };

        const result = FaUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(true);
    });

    it('should validate Phase En Cours update', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            typeId: 0,
            criticalityId: 2,
            cause: 'Cause identifiée',
            experienceImpact: 'Impact modéré',
        };

        const result = FaUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(true);
    });

    it('should validate status update', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            statusId: 1,
        };

        const result = FaUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(true);
    });

    it('should reject missing uuid', () => {
        const updateData = {
            observation: 'New observation',
        };

        const result = FaUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(false);
    });

    it('should accept nullable fields', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            cause: null,
            typeId: null,
            criticalityId: null,
        };

        const result = FaUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(true);
    });
});

describe('faCreateToApi', () => {
    it('should transform create data to API format', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            fsecStepId: 1,
            fsecStepOther: null,
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie détectée',
            locationEquipment: 'Banc 1',
            quickAnalysis: 'Défaut de soudure',
            immediateMeasures: 'Arrêt production',
        };

        const apiData = faCreateToApi(createData);

        expect(apiData.fsec_version_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(apiData.fsec_step_id).toBe(1);
        expect(apiData.fsec_step_other).toBeNull();
        expect(apiData.discoverer_user_uuid).toBe('11111111-1111-1111-1111-111111111111');
        expect(apiData.event_date).toBe('2024-01-15');
        expect(apiData.observation).toBe('Anomalie détectée');
        expect(apiData.location_equipment).toBe('Banc 1');
        expect(apiData.quick_analysis).toBe('Défaut de soudure');
        expect(apiData.immediate_measures).toBe('Arrêt production');
    });

    it('should handle undefined optional fields', () => {
        const createData = {
            fsecVersionId: '123e4567-e89b-12d3-a456-426614174000',
            discovererUserUuid: '11111111-1111-1111-1111-111111111111',
            eventDate: new Date('2024-01-15'),
            observation: 'Anomalie',
            quickAnalysis: 'Analyse',
        };

        const apiData = faCreateToApi(createData);

        expect(apiData.fsec_step_id).toBeNull();
        expect(apiData.fsec_step_other).toBeNull();
        expect(apiData.location_equipment).toBeNull();
        expect(apiData.immediate_measures).toBeNull();
    });
});

describe('faUpdateToApi', () => {
    it('should only include provided fields', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            observation: 'Nouvelle observation',
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(apiData.observation).toBe('Nouvelle observation');
        expect(apiData).not.toHaveProperty('status_id');
        expect(apiData).not.toHaveProperty('cause');
    });

    it('should transform Phase En Cours fields', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            typeId: 0,
            criticalityId: 2,
            cause: 'Cause identifiée',
            experienceImpact: 'Impact modéré',
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.type_id).toBe(0);
        expect(apiData.criticality_id).toBe(2);
        expect(apiData.cause).toBe('Cause identifiée');
        expect(apiData.experience_impact).toBe('Impact modéré');
    });

    it('should transform date to ISO string', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            eventDate: new Date('2024-01-20'),
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.event_date).toBe('2024-01-20');
    });

    it('should handle null values', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            cause: null,
            typeId: null,
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.cause).toBeNull();
        expect(apiData.type_id).toBeNull();
    });

    it('should transform status update', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            statusId: 1,
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.status_id).toBe(1);
    });

    it('should transform closure fields', () => {
        const updateData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            closureValidation: 'Fermeture validée',
        };

        const apiData = faUpdateToApi(updateData);

        expect(apiData.closure_validation).toBe('Fermeture validée');
    });
});
