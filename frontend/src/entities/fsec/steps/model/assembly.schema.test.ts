/**
 * Assembly Step Schema Tests - Level 1 (Unit Tests)
 * @module entities/steps/model
 */

import { describe, it, expect } from 'vitest';
import { AssemblyStepSchema } from './assembly.schema';

describe('AssemblyStepSchema', () => {
    it('should transform API response correctly', () => {
        const apiData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
            operator: 'Assembleur Dupont',
            operator_user_uuid: '323e4567-e89b-12d3-a456-426614174002',
            operator_user_uuids: ['323e4567-e89b-12d3-a456-426614174002', '623e4567-e89b-12d3-a456-426614174005'],
            start_date: '2024-01-15',
            end_date: '2024-01-20',
            comments: 'Step completed',
            machine_uuids: ['423e4567-e89b-12d3-a456-426614174003', '523e4567-e89b-12d3-a456-426614174004'],
        };

        const result = AssemblyStepSchema.parse(apiData);

        expect(result.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.fsecVersionId).toBe('223e4567-e89b-12d3-a456-426614174001');
        expect(result.operator).toBe('Assembleur Dupont');
        expect(result.operatorUserUuid).toBe('323e4567-e89b-12d3-a456-426614174002');
        expect(result.operatorUserUuids).toEqual([
            '323e4567-e89b-12d3-a456-426614174002',
            '623e4567-e89b-12d3-a456-426614174005',
        ]);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
        expect(result.machineUuids).toEqual([
            '423e4567-e89b-12d3-a456-426614174003',
            '523e4567-e89b-12d3-a456-426614174004',
        ]);
    });

    it('should handle null optional fields', () => {
        const apiData = {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
            operator: null,
            operator_user_uuid: null,
            start_date: null,
            end_date: null,
            comments: null,
            machine_uuids: [],
        };

        const result = AssemblyStepSchema.parse(apiData);

        expect(result.operator).toBeNull();
        expect(result.operatorUserUuid).toBeNull();
        expect(result.operatorUserUuids).toEqual([]);
        expect(result.startDate).toBeNull();
        expect(result.endDate).toBeNull();
        expect(result.comments).toBeNull();
        expect(result.machineUuids).toEqual([]);
    });
});
