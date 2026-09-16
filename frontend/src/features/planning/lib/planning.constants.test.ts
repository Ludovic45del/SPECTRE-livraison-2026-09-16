/**
 * Tests for Phase 3 Map-based lookup helpers in planning.constants.ts.
 *
 * Covers: PERIODES_MAP, getPeriodeMeta, LAB_EVENT_CATEGORIES_MAP, getEventCategoryMeta.
 *
 * Note: Row ID helpers are tested in planning.utils.test.ts and are not duplicated here.
 */
import { describe, it, expect } from 'vitest';

import { STEP_LABELS } from '@entities/planning/core/model/planning.schema';
import {
    PERIODES,
    PERIODES_MAP,
    getPeriodeMeta,
    LAB_EVENT_CATEGORIES,
    LAB_EVENT_CATEGORIES_MAP,
    getEventCategoryMeta,
    STEP_AVAILABILITY_CONFIG,
    getStepAvailabilityConfig,
} from './planning.constants';

// ====================== getPeriodeMeta ======================

describe('getPeriodeMeta', () => {
    const validValues = ['congés', 'mission', 'formation', 'rtt', 'maladie', 'télétravail'] as const;

    it.each(validValues)('returns a Periode for valid value "%s"', (value) => {
        const result = getPeriodeMeta(value);
        expect(result).toBeDefined();
        expect(result!.value).toBe(value);
    });

    it('returns undefined for an unknown value', () => {
        expect(getPeriodeMeta('unknown')).toBeUndefined();
        expect(getPeriodeMeta('')).toBeUndefined();
    });

    it('returned object matches the corresponding PERIODES entry', () => {
        for (const periode of PERIODES) {
            const result = getPeriodeMeta(periode.value);
            expect(result).toBe(periode); // same reference
        }
    });
});

// ====================== getEventCategoryMeta ======================

describe('getEventCategoryMeta', () => {
    const validLabels = ['Maintenance', 'Panne', 'Installation', 'Calibration', 'Nettoyage', 'Autre'] as const;

    it.each(validLabels)('returns a LabEventCategory for valid label "%s"', (label) => {
        const result = getEventCategoryMeta(label);
        expect(result).toBeDefined();
        expect(result!.label).toBe(label);
    });

    it('returns undefined for an unknown label', () => {
        expect(getEventCategoryMeta('unknown')).toBeUndefined();
        expect(getEventCategoryMeta('')).toBeUndefined();
    });

    it('returned object matches the corresponding LAB_EVENT_CATEGORIES entry', () => {
        for (const category of LAB_EVENT_CATEGORIES) {
            const result = getEventCategoryMeta(category.label);
            expect(result).toBe(category); // same reference
        }
    });
});

// ====================== PERIODES_MAP ======================

describe('PERIODES_MAP', () => {
    it('has the same size as the PERIODES array', () => {
        expect(PERIODES_MAP.size).toBe(PERIODES.length);
    });

    it('contains every entry from the PERIODES array', () => {
        for (const periode of PERIODES) {
            expect(PERIODES_MAP.has(periode.value)).toBe(true);
            expect(PERIODES_MAP.get(periode.value)).toBe(periode);
        }
    });
});

// ====================== getStepAvailabilityConfig ======================

describe('getStepAvailabilityConfig', () => {
    it('returns the Assemblage config (salle B1)', () => {
        expect(getStepAvailabilityConfig('Assemblage')).toEqual({
            fonctionFilter: 'Assembleur',
            fonctionLabel: 'Assembleurs',
            salleName: 'B1',
        });
    });

    it('returns the Métrologie config (salle B2)', () => {
        expect(getStepAvailabilityConfig('Métrologie')).toEqual({
            fonctionFilter: 'Métrologue',
            fonctionLabel: 'Métrologues',
            salleName: 'B2',
        });
    });

    it('returns undefined for steps without an availability block', () => {
        for (const label of ['Réception cibles', 'Gaz', 'Livraison', 'Tir']) {
            expect(getStepAvailabilityConfig(label)).toBeUndefined();
        }
    });

    it('is accent-strict (a label without accents has no config)', () => {
        expect(getStepAvailabilityConfig('Metrologie')).toBeUndefined();
        expect(getStepAvailabilityConfig('')).toBeUndefined();
    });

    it('every config key is a real PLANNING_STEP label (guards accent typos)', () => {
        for (const key of Object.keys(STEP_AVAILABILITY_CONFIG)) {
            expect(STEP_LABELS).toContain(key);
        }
    });
});

// ====================== LAB_EVENT_CATEGORIES_MAP ======================

describe('LAB_EVENT_CATEGORIES_MAP', () => {
    it('has the same size as the LAB_EVENT_CATEGORIES array', () => {
        expect(LAB_EVENT_CATEGORIES_MAP.size).toBe(LAB_EVENT_CATEGORIES.length);
    });

    it('contains every entry from the LAB_EVENT_CATEGORIES array', () => {
        for (const category of LAB_EVENT_CATEGORIES) {
            expect(LAB_EVENT_CATEGORIES_MAP.has(category.label)).toBe(true);
            expect(LAB_EVENT_CATEGORIES_MAP.get(category.label)).toBe(category);
        }
    });
});
