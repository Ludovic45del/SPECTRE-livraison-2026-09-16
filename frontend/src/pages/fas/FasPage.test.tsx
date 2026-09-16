import { describe, it, expect } from 'vitest';
import type { Fa } from '@entities/fa';
import { sortFas } from '@entities/fa';

// ============================================================================
// Test Data
// ============================================================================

const createMockFa = (overrides: Partial<Fa> = {}): Fa => ({
    slug: 'fa-2025-fsec01',
    fsecSlug: null,
    campaignSlug: null,
    uuid: '00000000-0000-0000-0000-000000000001',
    fsecVersionId: '00000000-0000-0000-0000-000000000010',
    identifier: 'FA_2025_FSEC01',
    statusId: 0,
    typeId: null,
    criticalityId: 1,
    fsecStepId: null,
    fsecStepOther: null,
    discoverer: 'Jean Dupont',
    discovererUserUuid: null,
    eventDate: new Date('2025-02-15'),
    observation: 'Observation test',
    locationEquipment: null,
    quickAnalysis: 'Analyse test',
    immediateMeasures: null,
    iecValidationOpen: false,
    iecValidationOpenDate: null,
    iecValidationOpenName: null,
    iecValidationOpenUserUuid: null,
    cause: null,
    experienceImpact: null,
    iecValidationProgress: false,
    iecValidationProgressName: null,
    iecValidationProgressUserUuid: null,
    closureValidation: null,
    closureDate: null,
    closureValidatorName: null,
    closureValidatorUserUuid: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    lastUpdated: new Date('2025-01-15T10:00:00Z'),
    fsecName: null,
    fsecDisplayName: null,
    installation: null,
    ...overrides,
});

interface FaWithFsec extends Fa {
    fsecIndex?: number;
}

const testFas: FaWithFsec[] = [
    { ...createMockFa(), fsecName: 'FSEC-01', fsecIndex: 0 },
    {
        ...createMockFa({
            uuid: '00000000-0000-0000-0000-000000000002',
            identifier: 'FA_2024_FSEC03',
            statusId: 2,
            criticalityId: 0,
            eventDate: new Date('2024-06-20'),
        }),
        fsecName: 'FSEC-03',
        fsecIndex: 2,
    },
    {
        ...createMockFa({
            uuid: '00000000-0000-0000-0000-000000000003',
            identifier: 'FA_2025_FSEC02',
            statusId: 1,
            criticalityId: 3,
            eventDate: new Date('2025-03-10'),
        }),
        fsecName: 'FSEC-02',
        fsecIndex: 1,
    },
];

// ============================================================================
// sortFas Tests
// ============================================================================

describe('sortFas', () => {
    it('should sort by identifier ascending', () => {
        const sorted = sortFas(testFas, 'identifier', 'asc');
        expect(sorted[0].identifier).toBe('FA_2024_FSEC03');
        expect(sorted[1].identifier).toBe('FA_2025_FSEC01');
        expect(sorted[2].identifier).toBe('FA_2025_FSEC02');
    });

    it('should sort by identifier descending', () => {
        const sorted = sortFas(testFas, 'identifier', 'desc');
        expect(sorted[0].identifier).toBe('FA_2025_FSEC02');
        expect(sorted[2].identifier).toBe('FA_2024_FSEC03');
    });

    it('should sort by eventDate ascending', () => {
        const sorted = sortFas(testFas, 'eventDate', 'asc');
        expect(sorted[0].identifier).toBe('FA_2024_FSEC03'); // 2024-06-20
        expect(sorted[1].identifier).toBe('FA_2025_FSEC01'); // 2025-02-15
        expect(sorted[2].identifier).toBe('FA_2025_FSEC02'); // 2025-03-10
    });

    it('should sort by eventDate descending', () => {
        const sorted = sortFas(testFas, 'eventDate', 'desc');
        expect(sorted[0].identifier).toBe('FA_2025_FSEC02'); // 2025-03-10
        expect(sorted[2].identifier).toBe('FA_2024_FSEC03'); // 2024-06-20
    });

    it('should sort by status ascending', () => {
        const sorted = sortFas(testFas, 'status', 'asc');
        expect(sorted[0].statusId).toBe(0); // Ouvert
        expect(sorted[1].statusId).toBe(1); // En cours
        expect(sorted[2].statusId).toBe(2); // Clos
    });

    it('should sort by criticality ascending', () => {
        const sorted = sortFas(testFas, 'criticality', 'asc');
        expect(sorted[0].criticalityId).toBe(0);
        expect(sorted[1].criticalityId).toBe(1);
        expect(sorted[2].criticalityId).toBe(3);
    });

    it('should sort by fsec name ascending', () => {
        const sorted = sortFas(testFas, 'fsec', 'asc');
        expect(sorted[0].fsecName).toBe('FSEC-01');
        expect(sorted[1].fsecName).toBe('FSEC-02');
        expect(sorted[2].fsecName).toBe('FSEC-03');
    });

    it('should not mutate original array', () => {
        const original = [...testFas];
        sortFas(testFas, 'identifier', 'asc');
        expect(testFas.map((f) => f.identifier)).toEqual(original.map((f) => f.identifier));
    });

    it('should handle empty array', () => {
        const sorted = sortFas([], 'identifier', 'asc');
        expect(sorted).toEqual([]);
    });

    it('should handle single item array', () => {
        const single = [testFas[0]];
        const sorted = sortFas(single, 'identifier', 'asc');
        expect(sorted).toHaveLength(1);
    });

    it('should handle null eventDate (sorted last)', () => {
        const fasWithNull: FaWithFsec[] = [
            { ...createMockFa({ eventDate: null }), fsecName: 'A', fsecIndex: 0 },
            {
                ...createMockFa({ eventDate: new Date('2025-01-01'), uuid: '00000000-0000-0000-0000-000000000099' }),
                fsecName: 'B',
                fsecIndex: 1,
            },
        ];
        const sorted = sortFas(fasWithNull, 'eventDate', 'asc');
        // null eventDate maps to epoch 0, so it comes first in asc
        expect(sorted[0].eventDate).toBeNull();
    });

    it('should handle null criticalityId', () => {
        const fasWithNull: FaWithFsec[] = [
            { ...createMockFa({ criticalityId: null }), fsecName: 'A', fsecIndex: 0 },
            {
                ...createMockFa({ criticalityId: 2, uuid: '00000000-0000-0000-0000-000000000099' }),
                fsecName: 'B',
                fsecIndex: 1,
            },
        ];
        const sorted = sortFas(fasWithNull, 'criticality', 'asc');
        // null maps to -1, so comes first in asc
        expect(sorted[0].criticalityId).toBeNull();
    });
});
