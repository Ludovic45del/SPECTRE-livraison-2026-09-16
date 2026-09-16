/**
 * Gas Steps Schema Tests - Level 1 (Unit Tests)
 * @module entities/fsec/steps/model
 *
 * Tests for all 6 gas step schemas:
 * - AirtightnessStep (Step ID: 10)
 * - GasFillingBpStep (Step ID: 11)
 * - GasFillingHpStep (Step ID: 9)
 * - PermeationStep (Step ID: 12)
 * - DepressurizationStep (Step ID: 13)
 * - RepressurizationStep (Step ID: 14)
 */

import { describe, it, expect } from 'vitest';
import { AirtightnessStepApiSchema, AirtightnessStepSchema, AirtightnessStepListSchema } from './airtightness.schema';
import { GasFillingBpStepApiSchema, GasFillingBpStepSchema, GasFillingBpStepListSchema } from './gas-filling-bp.schema';
import { GasFillingHpStepApiSchema, GasFillingHpStepSchema, GasFillingHpStepListSchema } from './gas-filling-hp.schema';
import { PermeationStepApiSchema, PermeationStepSchema, PermeationStepListSchema } from './permeation.schema';
import {
    DepressurizationStepApiSchema,
    DepressurizationStepSchema,
    DepressurizationStepListSchema,
} from './depressurization.schema';
import {
    RepressurizationStepApiSchema,
    RepressurizationStepSchema,
    RepressurizationStepListSchema,
} from './repressurization.schema';

// Test data factory
const createApiData = (overrides = {}) => ({
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
    operator: 'Jean Dupont',
    gas_type: 'Helium',
    ...overrides,
});

describe('AirtightnessStepSchema', () => {
    const validApiData = createApiData({
        leak_rate_dtri: 'DTRI-001',
        experiment_pressure: 1.5,
        airtightness_test_duration: 30,
        date_of_fulfilment: '2024-01-15',
    });

    it('should validate a valid API response', () => {
        const result = AirtightnessStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform snake_case to camelCase', () => {
        const result = AirtightnessStepSchema.parse(validApiData);

        expect(result.uuid).toBe(validApiData.uuid);
        expect(result.fsecVersionId).toBe(validApiData.fsec_version_id);
        expect(result.leakRateDtri).toBe('DTRI-001');
        expect(result.experimentPressure).toBe(1.5);
        expect(result.airtightnessTestDuration).toBe(30);
        expect(result.operator).toBe('Jean Dupont');
        expect(result.dateOfFulfilment).toBeInstanceOf(Date);
    });

    it('should handle null fields', () => {
        const nullData = createApiData({
            leak_rate_dtri: null,
            experiment_pressure: null,
            airtightness_test_duration: null,
            date_of_fulfilment: null,
        });

        const result = AirtightnessStepSchema.parse(nullData);

        expect(result.leakRateDtri).toBeNull();
        expect(result.experimentPressure).toBeNull();
        expect(result.airtightnessTestDuration).toBeNull();
        expect(result.dateOfFulfilment).toBeNull();
    });

    it('should parse list correctly', () => {
        const listData = [validApiData, { ...validApiData, uuid: '333e4567-e89b-12d3-a456-426614174002' }];
        const result = AirtightnessStepListSchema.parse(listData);

        expect(result).toHaveLength(2);
        expect(result[0].uuid).toBe(validApiData.uuid);
        expect(result[1].uuid).toBe('333e4567-e89b-12d3-a456-426614174002');
    });

    it('should reject invalid UUID', () => {
        const invalidData = { ...validApiData, uuid: 'not-a-uuid' };
        const result = AirtightnessStepApiSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('GasFillingBpStepSchema', () => {
    const validApiData = createApiData({
        leak_rate_dtri: 'DTRI-002',
        experiment_pressure: 2.5,
        leak_test_duration: 45,
        date_of_fulfilment: '2024-02-20',
        gas_base: 100,
        gas_container: 5,
        observations: 'Test observations',
    });

    it('should validate a valid API response', () => {
        const result = GasFillingBpStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform snake_case to camelCase', () => {
        const result = GasFillingBpStepSchema.parse(validApiData);

        expect(result.leakRateDtri).toBe('DTRI-002');
        expect(result.experimentPressure).toBe(2.5);
        expect(result.leakTestDuration).toBe(45);
        expect(result.gasBase).toBe(100);
        expect(result.gasContainer).toBe(5);
        expect(result.observations).toBe('Test observations');
    });

    it('should handle null fields', () => {
        const nullData = createApiData({
            leak_rate_dtri: null,
            experiment_pressure: null,
            leak_test_duration: null,
            date_of_fulfilment: null,
            gas_base: null,
            gas_container: null,
            observations: null,
        });

        const result = GasFillingBpStepSchema.parse(nullData);

        expect(result.gasBase).toBeNull();
        expect(result.gasContainer).toBeNull();
        expect(result.observations).toBeNull();
    });

    it('should parse list correctly', () => {
        const result = GasFillingBpStepListSchema.parse([validApiData]);
        expect(result).toHaveLength(1);
    });
});

describe('GasFillingHpStepSchema', () => {
    const validApiData = createApiData({
        embase_id: null,
        embase_identifier: null,
        leak_rate_dtri: 'DTRI-003',
        experiment_pressure: 150.0,
        date_of_fulfilment: '2024-03-10',
        gas_base: 200,
        gas_container: 10,
        observations: 'HP test',
    });

    it('should validate a valid API response', () => {
        const result = GasFillingHpStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform correctly', () => {
        const result = GasFillingHpStepSchema.parse(validApiData);

        expect(result.experimentPressure).toBe(150.0);
        expect(result.gasBase).toBe(200);
        expect(result.gasContainer).toBe(10);
    });

    it('should parse list correctly', () => {
        const result = GasFillingHpStepListSchema.parse([validApiData]);
        expect(result).toHaveLength(1);
    });
});

describe('PermeationStepSchema', () => {
    const validApiData = createApiData({
        target_pressure: 50.0,
        start_date: '2024-04-01T08:00:00Z',
        estimated_end_date: '2024-04-15T18:00:00Z',
        sensor_pressure: 48.5,
        computed_shot_pressure: 49.2,
    });

    it('should validate a valid API response', () => {
        const result = PermeationStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform correctly with dates', () => {
        const result = PermeationStepSchema.parse(validApiData);

        expect(result.targetPressure).toBe(50.0);
        expect(result.sensorPressure).toBe(48.5);
        expect(result.computedShotPressure).toBe(49.2);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.estimatedEndDate).toBeInstanceOf(Date);
    });

    it('should handle null dates', () => {
        const nullData = createApiData({
            target_pressure: null,
            start_date: null,
            estimated_end_date: null,
            sensor_pressure: null,
            computed_shot_pressure: null,
        });

        const result = PermeationStepSchema.parse(nullData);

        expect(result.startDate).toBeNull();
        expect(result.estimatedEndDate).toBeNull();
    });
});

describe('DepressurizationStepSchema', () => {
    const validApiData = createApiData({
        date_of_fulfilment: '2024-05-01',
        pressure_gauge: 1.2,
        enclosure_pressure_measured: 0.8,
        start_time: '2024-05-01T09:00:00Z',
        end_time: '2024-05-01T12:00:00Z',
        observations: 'Depressurization complete',
        depressurization_time_before_firing: 180,
        computed_pressure_before_firing: 0.5,
    });

    it('should validate a valid API response', () => {
        const result = DepressurizationStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform correctly', () => {
        const result = DepressurizationStepSchema.parse(validApiData);

        expect(result.pressureGauge).toBe(1.2);
        expect(result.enclosurePressureMeasured).toBe(0.8);
        expect(result.depressurizationTimeBeforeFiring).toBe(180);
        expect(result.computedPressureBeforeFiring).toBe(0.5);
        expect(result.startTime).toBeInstanceOf(Date);
        expect(result.endTime).toBeInstanceOf(Date);
    });

    it('should handle null fields', () => {
        const nullData = createApiData({
            date_of_fulfilment: null,
            pressure_gauge: null,
            enclosure_pressure_measured: null,
            start_time: null,
            end_time: null,
            observations: null,
            depressurization_time_before_firing: null,
            computed_pressure_before_firing: null,
        });

        const result = DepressurizationStepSchema.parse(nullData);

        expect(result.pressureGauge).toBeNull();
        expect(result.startTime).toBeNull();
        expect(result.endTime).toBeNull();
    });
});

describe('RepressurizationStepSchema', () => {
    const validApiData = createApiData({
        start_date: '2024-06-01T10:00:00Z',
        estimated_end_date: '2024-06-02T10:00:00Z',
        sensor_pressure: 100.0,
        computed_pressure: 98.5,
    });

    it('should validate a valid API response', () => {
        const result = RepressurizationStepApiSchema.safeParse(validApiData);
        expect(result.success).toBe(true);
    });

    it('should transform correctly', () => {
        const result = RepressurizationStepSchema.parse(validApiData);

        expect(result.sensorPressure).toBe(100.0);
        expect(result.computedPressure).toBe(98.5);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.estimatedEndDate).toBeInstanceOf(Date);
    });

    it('should handle null fields', () => {
        const nullData = createApiData({
            start_date: null,
            estimated_end_date: null,
            sensor_pressure: null,
            computed_pressure: null,
        });

        const result = RepressurizationStepSchema.parse(nullData);

        expect(result.sensorPressure).toBeNull();
        expect(result.computedPressure).toBeNull();
        expect(result.startDate).toBeNull();
    });
});

describe('Schema edge cases', () => {
    it('should handle empty list', () => {
        expect(AirtightnessStepListSchema.parse([])).toEqual([]);
        expect(GasFillingBpStepListSchema.parse([])).toEqual([]);
        expect(GasFillingHpStepListSchema.parse([])).toEqual([]);
        expect(PermeationStepListSchema.parse([])).toEqual([]);
        expect(DepressurizationStepListSchema.parse([])).toEqual([]);
        expect(RepressurizationStepListSchema.parse([])).toEqual([]);
    });

    it('should handle large numbers', () => {
        const data = createApiData({
            experiment_pressure: 999999.99,
            leak_rate_dtri: 'A'.repeat(200),
            leak_test_duration: null,
            date_of_fulfilment: null,
            gas_base: null,
            gas_container: null,
            observations: null,
        });

        const result = GasFillingBpStepSchema.parse(data);
        expect(result.experimentPressure).toBe(999999.99);
    });

    it('should handle ISO date strings', () => {
        const data = createApiData({
            start_date: '2024-12-31T23:59:59.999Z',
            estimated_end_date: '2025-01-01T00:00:00.000Z',
            target_pressure: null,
            sensor_pressure: null,
            computed_shot_pressure: null,
        });

        const result = PermeationStepSchema.parse(data);
        expect(result.startDate?.getUTCFullYear()).toBe(2024);
        expect(result.estimatedEndDate?.getUTCFullYear()).toBe(2025);
    });
});
