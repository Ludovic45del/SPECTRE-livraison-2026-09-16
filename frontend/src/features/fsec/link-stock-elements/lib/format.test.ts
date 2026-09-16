import { describe, expect, it } from 'vitest';
import { EMPTY_VALUE, formatMasseMg } from './format';

describe('formatMasseMg', () => {
    it('affiche le séparateur pour une masse absente', () => {
        expect(formatMasseMg(null)).toBe(EMPTY_VALUE);
        expect(formatMasseMg(undefined)).toBe(EMPTY_VALUE);
        expect(formatMasseMg(Number.NaN)).toBe(EMPTY_VALUE);
    });

    it('élimine le bruit binaire des flottants', () => {
        // 0.1 + 0.2 en JS = 0.30000000000000004 → ne doit jamais s'afficher tel quel.
        expect(formatMasseMg(0.1 + 0.2)).toBe('0,3');
    });

    it('conserve jusqu’à 3 décimales, virgule décimale fr', () => {
        expect(formatMasseMg(12.5)).toBe('12,5');
        expect(formatMasseMg(0.0004)).toBe('0');
        // 1.2346 (et non 1.2345, dont la représentation binaire est 1.23449…).
        expect(formatMasseMg(1.2346)).toBe('1,235');
        expect(formatMasseMg(42)).toBe('42');
    });
});
