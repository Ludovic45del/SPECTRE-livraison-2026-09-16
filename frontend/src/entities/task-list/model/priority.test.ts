/**
 * Priority helpers tests — ordre, libellés FR, couleurs.
 * @module entities/task-list/model
 */

import { describe, it, expect } from 'vitest';
import {
    PRIORITIES_DESC,
    PRIORITY_LABELS,
    PRIORITY_MUI_COLORS,
    PRIORITY_ORDER,
    PRIORITY_SX_COLORS,
    comparePriority,
} from './priority';
import { TASK_PRIORITIES } from './task-list.schema';

describe('PRIORITY_ORDER', () => {
    it('ordonne critical > high > normal > low', () => {
        expect(PRIORITY_ORDER.critical).toBe(3);
        expect(PRIORITY_ORDER.high).toBe(2);
        expect(PRIORITY_ORDER.normal).toBe(1);
        expect(PRIORITY_ORDER.low).toBe(0);
    });
});

describe('PRIORITY_LABELS / couleurs', () => {
    it('fournit un libellé FR et des couleurs pour chaque priorité', () => {
        for (const p of TASK_PRIORITIES) {
            expect(PRIORITY_LABELS[p]).toBeTruthy();
            expect(PRIORITY_MUI_COLORS[p]).toBeTruthy();
            expect(PRIORITY_SX_COLORS[p]).toBeTruthy();
        }
        expect(PRIORITY_LABELS.critical).toBe('Critique');
        expect(PRIORITY_LABELS.high).toBe('Haute');
        expect(PRIORITY_LABELS.normal).toBe('Normale');
        expect(PRIORITY_LABELS.low).toBe('Basse');
        expect(PRIORITY_MUI_COLORS.critical).toBe('error');
        expect(PRIORITY_MUI_COLORS.high).toBe('warning');
        expect(PRIORITY_MUI_COLORS.normal).toBe('info');
        expect(PRIORITY_MUI_COLORS.low).toBe('default');
    });
});

describe('comparePriority', () => {
    it('trie en ordre décroissant (critical en premier)', () => {
        const sorted = [...TASK_PRIORITIES].sort(comparePriority);
        expect(sorted).toEqual(['critical', 'high', 'normal', 'low']);
        expect(sorted).toEqual([...PRIORITIES_DESC]);
    });

    it('retourne 0 pour deux priorités égales', () => {
        expect(comparePriority('normal', 'normal')).toBe(0);
        expect(comparePriority('critical', 'low')).toBeLessThan(0);
        expect(comparePriority('low', 'critical')).toBeGreaterThan(0);
    });
});
