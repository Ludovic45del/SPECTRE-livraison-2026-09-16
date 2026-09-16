/**
 * Tests formatIndicatorsPeriod — libellé de période des pages indicateurs (R18).
 * @module features/indicators/filter-indicators/model
 */

import { describe, it, expect } from 'vitest';
import { formatIndicatorsPeriod } from './format-indicators-period';

describe('formatIndicatorsPeriod', () => {
    it('formate un semestre filtré en période compacte', () => {
        expect(formatIndicatorsPeriod(2027, 1)).toBe('2027-S1');
        expect(formatIndicatorsPeriod(2027, 2)).toBe('2027-S2');
    });

    it("formate l'année entière comme un intervalle S1/S2", () => {
        expect(formatIndicatorsPeriod(2027, null)).toBe('2027-S1/2027-S2');
    });
});
