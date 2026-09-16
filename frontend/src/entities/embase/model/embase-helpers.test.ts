/**
 * Embase Helpers Tests - Type labels, colors & etalonnage status
 * @module entities/embase/model
 */

import { describe, it, expect } from 'vitest';
import { getEtalonnageStatus, EMBASE_TYPE_LABELS, EMBASE_TYPE_COLORS } from './embase-helpers';

// ---------------------------------------------------------------------------
// getEtalonnageStatus
// ---------------------------------------------------------------------------

describe('getEtalonnageStatus', () => {
    it('should return valid status for a recent date (less than 1 month ago)', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 5);
        const result = getEtalonnageStatus(recentDate.toISOString());

        expect(result.status).toBe('valid');
        expect(result.label).toBe('Étalonné');
        expect(result.color).toBe('#4caf50');
    });

    it('should return expired status for a date older than 1 month', () => {
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 2);
        const result = getEtalonnageStatus(oldDate.toISOString());

        expect(result.status).toBe('expired');
        expect(result.label).toBe('Étalonnage expiré');
        expect(result.color).toBe('#f44336');
    });

    it('should return none status when date is null', () => {
        const result = getEtalonnageStatus(null);

        expect(result.status).toBe('none');
        expect(result.label).toBe('Pas étalonné');
        expect(result.color).toBe('#ff9800');
    });
});

// ---------------------------------------------------------------------------
// EMBASE_TYPE_LABELS
// ---------------------------------------------------------------------------

describe('EMBASE_TYPE_LABELS', () => {
    it('should contain all 3 embase types', () => {
        expect(EMBASE_TYPE_LABELS).toHaveProperty('jet_de_gaz');
        expect(EMBASE_TYPE_LABELS).toHaveProperty('hp');
        expect(EMBASE_TYPE_LABELS).toHaveProperty('bp');
    });

    it('should have correct French labels', () => {
        expect(EMBASE_TYPE_LABELS.jet_de_gaz).toBe('Jet de Gaz');
        expect(EMBASE_TYPE_LABELS.hp).toBe('HP');
        expect(EMBASE_TYPE_LABELS.bp).toBe('BP');
    });
});

// ---------------------------------------------------------------------------
// EMBASE_TYPE_COLORS
// ---------------------------------------------------------------------------

describe('EMBASE_TYPE_COLORS', () => {
    it('should contain all 3 embase types', () => {
        expect(EMBASE_TYPE_COLORS).toHaveProperty('jet_de_gaz');
        expect(EMBASE_TYPE_COLORS).toHaveProperty('hp');
        expect(EMBASE_TYPE_COLORS).toHaveProperty('bp');
    });

    it('should map to valid MUI color values', () => {
        expect(EMBASE_TYPE_COLORS.jet_de_gaz).toBe('primary');
        expect(EMBASE_TYPE_COLORS.hp).toBe('secondary');
        expect(EMBASE_TYPE_COLORS.bp).toBe('warning');
    });
});
