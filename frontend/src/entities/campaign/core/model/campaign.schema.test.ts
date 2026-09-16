/**
 * Campaign Schema Tests - Level 1 (Unit Tests)
 * @module entities/campaign/model
 *
 * Per Testing_Strategy.md: 100% coverage on mappers
 */

import { describe, it, expect } from 'vitest';
import { CampaignSchema, CampaignApiSchema, CampaignCreateSchema, campaignCreateToApi } from './campaign.schema';

describe('CampaignApiSchema', () => {
    it('should validate a valid API campaign response', () => {
        const validApiData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            type_id: 1,
            status_id: 2,
            installation_id: 3,
            name: 'Campagne Test',
            year: 2024,
            semester: 'S1',
            last_updated: '2024-01-15T10:30:00Z',
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            dtri_number: 42,
            description: 'Description test',
        };

        const result = CampaignApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
        const invalidData = {
            uuid: 'not-a-uuid',
            name: 'Test',
            year: 2024,
            semester: 'S1',
            type_id: null,
            status_id: null,
            installation_id: null,
            last_updated: null,
            start_date: null,
            end_date: null,
            dtri_number: null,
            description: null,
        };

        const result = CampaignApiSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('CampaignSchema (Transformation)', () => {
    it('should transform snake_case to camelCase', () => {
        const apiData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            type_id: 1,
            status_id: 2,
            installation_id: 3,
            name: 'Campagne Test',
            year: 2024,
            semester: 'S1',
            last_updated: '2024-01-15T10:30:00Z',
            start_date: '2024-01-01',
            end_date: '2024-06-30',
            dtri_number: 42,
            description: 'Description',
        };

        const result = CampaignSchema.parse(apiData);

        expect(result.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.typeId).toBe(1);
        expect(result.statusId).toBe(2);
        expect(result.installationId).toBe(3);
        expect(result.dtriNumber).toBe(42);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
        expect(result.startDate?.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should handle null dates correctly', () => {
        const apiData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            type_id: null,
            status_id: null,
            installation_id: null,
            name: 'Campagne',
            year: 2024,
            semester: 'S2',
            last_updated: null,
            start_date: null,
            end_date: null,
            dtri_number: null,
            description: null,
        };

        const result = CampaignSchema.parse(apiData);

        expect(result.startDate).toBeNull();
        expect(result.endDate).toBeNull();
        expect(result.typeId).toBeNull();
    });
});

describe('CampaignCreateSchema', () => {
    it('should validate valid creation data', () => {
        const createData = {
            name: 'Nouvelle Campagne',
            year: 2024,
            semester: 'S1' as const,
            typeId: 0,
            installationId: 0,
        };

        const result = CampaignCreateSchema.safeParse(createData);
        expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
        const invalidData = {
            name: '',
            year: 2024,
            semester: 'S1',
        };

        const result = CampaignCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject invalid semester', () => {
        const invalidData = {
            name: 'Test',
            year: 2024,
            semester: 'S3', // Invalid
        };

        const result = CampaignCreateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('campaignCreateToApi', () => {
    it('should transform camelCase to snake_case for API', () => {
        const createData = {
            name: 'Campagne',
            year: 2024,
            semester: 'S1' as const,
            typeId: 5,
            installationId: 0,
            startDate: new Date(2024, 2, 15), // Date à minuit LOCAL (comme un DatePicker) : assertion stable quel que soit le fuseau.
        };

        const apiData = campaignCreateToApi(createData);

        expect(apiData.name).toBe('Campagne');
        expect(apiData.type_id).toBe(5);
        expect(apiData.start_date).toBe('2024-03-15');
    });

    it('should preserve id 0 as a valid referential value (regression: || vs ??)', () => {
        const createData = {
            name: 'Minimal',
            year: 2024,
            semester: 'S2' as const,
            typeId: 0,
            installationId: 0,
        };

        const apiData = campaignCreateToApi(createData);

        expect(apiData.type_id).toBe(0);
        expect(apiData.installation_id).toBe(0);
        expect(apiData.status_id).toBeNull();
        expect(apiData.start_date).toBeNull();
        expect(apiData.end_date).toBeNull();
        expect(apiData.dtri_number).toBeNull();
        expect(apiData.description).toBeNull();
    });
});
