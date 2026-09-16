/**
 * FSEC Schema Tests - Level 1 (Unit Tests)
 * @module entities/fsec/model
 *
 * Per Testing_Strategy.md: 100% coverage on mappers
 */

import { describe, it, expect } from 'vitest';
import { FsecSchema, FsecApiSchema, fsecCreateToApi } from './fsec.schema';

describe('FsecApiSchema', () => {
    it('should validate a valid API FSEC response', () => {
        const validApiData = {
            version_uuid: '123e4567-e89b-12d3-a456-426614174000',
            fsec_uuid: '223e4567-e89b-12d3-a456-426614174001',
            campaign_id: '323e4567-e89b-12d3-a456-426614174002',
            status_id: 1,
            category_id: 2,
            rack_id: 3,
            name: 'FSEC-001',
            comments: 'Test comments',
            last_updated: '2024-01-15T10:30:00Z',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            delivery_date: '2024-02-01',
            shooting_date: '2024-03-01',
            preshooting_pressure: 15.5,
            experience_srxx: 'SR-2024-001',
            localisation: 'Zone A',
            depressurization_failed: false,
        };

        const result = FsecApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
        const invalidData = {
            version_uuid: '123e4567-e89b-12d3-a456-426614174000',
            // Missing fsec_uuid
            name: 'Test',
            is_active: true,
        };

        const result = FsecApiSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('FsecSchema (Transformation)', () => {
    it('should transform snake_case to camelCase', () => {
        const apiData = {
            version_uuid: '123e4567-e89b-12d3-a456-426614174000',
            fsec_uuid: '223e4567-e89b-12d3-a456-426614174001',
            campaign_id: '323e4567-e89b-12d3-a456-426614174002',
            status_id: 5,
            category_id: 2,
            rack_id: null,
            name: 'FSEC-TEST',
            comments: null,
            last_updated: '2024-01-15T10:30:00Z',
            is_active: true,
            created_at: null,
            delivery_date: '2024-02-15',
            shooting_date: null,
            preshooting_pressure: 12.3,
            experience_srxx: 'SR-001',
            localisation: 'Zone B',
            depressurization_failed: null,
        };

        const result = FsecSchema.parse(apiData);

        expect(result.versionUuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.fsecUuid).toBe('223e4567-e89b-12d3-a456-426614174001');
        expect(result.campaignId).toBe('323e4567-e89b-12d3-a456-426614174002');
        expect(result.statusId).toBe(5);
        expect(result.categoryId).toBe(2);
        expect(result.rackId).toBeNull();
        expect(result.isActive).toBe(true);
        expect(result.deliveryDate).toBeInstanceOf(Date);
        expect(result.preshootingPressure).toBe(12.3);
        expect(result.experienceSrxx).toBe('SR-001');
        expect(result.localisation).toBe('Zone B');
    });

    it('should handle null workflow fields', () => {
        const apiData = {
            version_uuid: '123e4567-e89b-12d3-a456-426614174000',
            fsec_uuid: '223e4567-e89b-12d3-a456-426614174001',
            campaign_id: null,
            status_id: null,
            category_id: null,
            rack_id: null,
            name: 'Minimal FSEC',
            comments: null,
            last_updated: null,
            is_active: false,
            created_at: null,
            delivery_date: null,
            shooting_date: null,
            preshooting_pressure: null,
            experience_srxx: null,
            localisation: null,
            depressurization_failed: null,
        };

        const result = FsecSchema.parse(apiData);

        expect(result.deliveryDate).toBeNull();
        expect(result.shootingDate).toBeNull();
        expect(result.preshootingPressure).toBeNull();
        expect(result.depressurizationFailed).toBeNull();
        expect(result.isActive).toBe(false);
    });
});

describe('fsecCreateToApi', () => {
    it('should transform create data to API format', () => {
        const createData = {
            name: 'New FSEC',
            campaignId: '123e4567-e89b-12d3-a456-426614174000',
            statusId: 1,
            deliveryDate: new Date(2024, 4, 1), // Date à minuit LOCAL (comme un DatePicker) : assertion stable quel que soit le fuseau.
        };

        const apiData = fsecCreateToApi(createData);

        expect(apiData.name).toBe('New FSEC');
        expect(apiData.campaign_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(apiData.status_id).toBe(1);
        expect(apiData.delivery_date).toBe('2024-05-01');
    });
});
