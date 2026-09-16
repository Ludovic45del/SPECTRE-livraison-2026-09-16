/**
 * Tests for planning pure utility functions.
 *
 * Covers: computeWeeklyColumns, computeGroupHeaders, computeTimeline,
 *         columnToWeekNums, dateRangeOverlapsColumn, isFsecStepDone,
 *         row-id helpers from constants, bar-utils, grid-utils.
 */
import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/fr';

import {
    computeWeeklyColumns,
    computeGroupHeaders,
    computeTimeline,
    columnToWeekNums,
    dateRangeOverlapsColumn,
    isFsecStepDone,
} from './planning.utils';

import {
    memberRowId,
    labRowId,
    campaignRowId,
    campaignStepHeaderRowId,
    campaignFsecRowId,
    machineUuidFromRowId,
    WEEKLY_COLS,
} from './planning.constants';

import {
    itemOverlapsColumn,
    getBarPosition,
    getBarBorderRadius,
    getBarSpanCount,
    calculateResizePreview,
    calculateDragPreview,
} from './planning.bar-utils';

import { resolveWeekState } from './planning.grid-utils';

dayjs.extend(isoWeek);
dayjs.locale('fr');

// ====================== computeWeeklyColumns ======================

describe('computeWeeklyColumns', () => {
    it('returns WEEKLY_COLS columns', () => {
        const cols = computeWeeklyColumns('2025-03-15');
        expect(cols).toHaveLength(WEEKLY_COLS);
    });

    it('starts on a Monday (isoWeekday 1)', () => {
        const cols = computeWeeklyColumns('2025-06-01');
        for (const col of cols) {
            expect(col.start.isoWeekday()).toBe(1);
        }
    });

    it('each column spans exactly 7 days', () => {
        const cols = computeWeeklyColumns('2025-01-10');
        for (const col of cols) {
            expect(col.end.diff(col.start, 'day')).toBe(6); // Mon-Sun
        }
    });

    it('columns are contiguous (no gap, no overlap)', () => {
        const cols = computeWeeklyColumns('2025-04-01');
        for (let i = 1; i < cols.length; i++) {
            const prevEnd = cols[i - 1].end.startOf('day');
            const curStart = cols[i].start.startOf('day');
            expect(curStart.diff(prevEnd, 'day')).toBe(1);
        }
    });

    it('keys are unique', () => {
        const cols = computeWeeklyColumns('2025-05-15');
        const keys = cols.map((c) => c.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('marks at most one column as current week', () => {
        const cols = computeWeeklyColumns(dayjs().format('YYYY-MM-DD'));
        const currentCols = cols.filter((c) => c.isCurrent);
        expect(currentCols.length).toBeLessThanOrEqual(1);
    });

    it('dayOfWeek is null for weekly columns', () => {
        const cols = computeWeeklyColumns('2025-02-01');
        for (const col of cols) {
            expect(col.dayOfWeek).toBeNull();
        }
    });
});

// ====================== computeGroupHeaders ======================

describe('computeGroupHeaders', () => {
    it('returns empty array for empty columns', () => {
        expect(computeGroupHeaders([])).toEqual([]);
    });

    it('colSpan sum equals total column count', () => {
        const cols = computeWeeklyColumns('2025-03-15');
        const headers = computeGroupHeaders(cols);
        const totalSpan = headers.reduce((sum, h) => sum + h.colSpan, 0);
        expect(totalSpan).toBe(cols.length);
    });

    it('labels are capitalised', () => {
        const cols = computeWeeklyColumns('2025-01-01');
        const headers = computeGroupHeaders(cols);
        for (const h of headers) {
            expect(h.label[0]).toBe(h.label[0].toUpperCase());
        }
    });
});

// ====================== computeTimeline ======================

describe('computeTimeline', () => {
    it('returns both columns and groupHeaders', () => {
        const tl = computeTimeline('2025-06-01');
        expect(tl.columns).toHaveLength(WEEKLY_COLS);
        expect(tl.groupHeaders.length).toBeGreaterThan(0);
    });
});

// ====================== columnToWeekNums ======================

describe('columnToWeekNums', () => {
    it('returns single-element array with column weekNum', () => {
        const cols = computeWeeklyColumns('2025-03-01');
        const result = columnToWeekNums(cols[0]);
        expect(result).toEqual([cols[0].weekNum]);
    });
});

// ====================== dateRangeOverlapsColumn ======================

describe('dateRangeOverlapsColumn', () => {
    // Build a column for week 10 of 2025 (Mon 3 Mar – Sun 9 Mar)
    const cols = computeWeeklyColumns('2025-03-01');
    const week10 = cols.find((c) => c.weekNum === 10 && c.year === 2025)!;

    it('overlap: range fully inside column', () => {
        expect(dateRangeOverlapsColumn({ startDate: '2025-03-04', endDate: '2025-03-06' }, week10)).toBe(true);
    });

    it('overlap: range exactly matches column', () => {
        const start = week10.start.format('YYYY-MM-DD');
        const end = week10.end.format('YYYY-MM-DD');
        expect(dateRangeOverlapsColumn({ startDate: start, endDate: end }, week10)).toBe(true);
    });

    it('overlap: range spans multiple weeks including column', () => {
        expect(dateRangeOverlapsColumn({ startDate: '2025-02-25', endDate: '2025-03-20' }, week10)).toBe(true);
    });

    it('no overlap: range entirely before column', () => {
        expect(dateRangeOverlapsColumn({ startDate: '2025-02-01', endDate: '2025-02-28' }, week10)).toBe(false);
    });

    it('no overlap: range entirely after column', () => {
        expect(dateRangeOverlapsColumn({ startDate: '2025-03-10', endDate: '2025-03-20' }, week10)).toBe(false);
    });

    it('returns false for null dates', () => {
        expect(dateRangeOverlapsColumn({ startDate: null, endDate: null }, week10)).toBe(false);
    });
});

// ====================== isFsecStepDone ======================

describe('isFsecStepDone', () => {
    it('done when statusId >= minStatusForDone', () => {
        expect(isFsecStepDone({ statusId: 3, shootingDate: null }, { minStatusForDone: 3 })).toBe(true);
    });

    it('not done when statusId < minStatusForDone', () => {
        expect(isFsecStepDone({ statusId: 2, shootingDate: null }, { minStatusForDone: 3 })).toBe(false);
    });

    it('done when useShootingDate and shootingDate is set', () => {
        expect(isFsecStepDone({ statusId: null, shootingDate: new Date() }, { useShootingDate: true })).toBe(true);
    });

    it('not done when useShootingDate and shootingDate is null', () => {
        expect(isFsecStepDone({ statusId: null, shootingDate: null }, { useShootingDate: true })).toBe(false);
    });

    it('returns false when no criteria defined', () => {
        expect(isFsecStepDone({ statusId: 10, shootingDate: new Date() }, {})).toBe(false);
    });

    it('handles null statusId with minStatusForDone', () => {
        expect(isFsecStepDone({ statusId: null, shootingDate: null }, { minStatusForDone: 1 })).toBe(false);
    });

    // Comparaison par rang de workflow, pas par id : la Vérification scellement (16)
    // se situe entre Scellement (3) et Photos (4) ; les seuils Gaz/Livraison/Tir
    // (5/6/7) ne sont donc pas atteints malgré 16 > 7.
    it('Vérification scellement (16) : étapes Réception/Assemblage/Métrologie faites, Gaz/Livraison/Tir non', () => {
        const fsec = { statusId: 16, shootingDate: null };
        expect(isFsecStepDone(fsec, { minStatusForDone: 1 })).toBe(true);
        expect(isFsecStepDone(fsec, { minStatusForDone: 2 })).toBe(true);
        expect(isFsecStepDone(fsec, { minStatusForDone: 3 })).toBe(true);
        expect(isFsecStepDone(fsec, { minStatusForDone: 5 })).toBe(false);
        expect(isFsecStepDone(fsec, { minStatusForDone: 6 })).toBe(false);
        expect(isFsecStepDone(fsec, { minStatusForDone: 7 })).toBe(false);
    });

    // Étapes gaz (9..14) : entre Photos (4) et Disponible (5) dans le workflow.
    it.each([
        ['Remplissage HP', 9],
        ['Test étanchéité BP', 10],
        ['Re-pressurisation', 14],
    ])('statut gaz %s : Métrologie faite, Gaz (seuil Disponible) / Livraison / Tir non', (_label, statusId) => {
        const fsec = { statusId, shootingDate: null };
        expect(isFsecStepDone(fsec, { minStatusForDone: 3 })).toBe(true);
        expect(isFsecStepDone(fsec, { minStatusForDone: 5 })).toBe(false);
        expect(isFsecStepDone(fsec, { minStatusForDone: 6 })).toBe(false);
        expect(isFsecStepDone(fsec, { minStatusForDone: 7 })).toBe(false);
    });

    it('Disponible (5) valide le seuil Gaz mais pas Livraison ; Tirée (7) valide tout', () => {
        expect(isFsecStepDone({ statusId: 5, shootingDate: null }, { minStatusForDone: 5 })).toBe(true);
        expect(isFsecStepDone({ statusId: 5, shootingDate: null }, { minStatusForDone: 6 })).toBe(false);
        expect(isFsecStepDone({ statusId: 7, shootingDate: null }, { minStatusForDone: 5 })).toBe(true);
        expect(isFsecStepDone({ statusId: 7, shootingDate: null }, { minStatusForDone: 7 })).toBe(true);
    });

    // Statuts de pause : figent l'avancement, aucune étape n'est « faite »
    // même si statusId >= seuil ou que la date de tir est renseignée.
    it.each([
        ['HS', 8],
        ['Décision MOE', 15],
    ])('not done for paused status %s even when statusId >= minStatusForDone', (_label, statusId) => {
        expect(isFsecStepDone({ statusId, shootingDate: null }, { minStatusForDone: 1 })).toBe(false);
        expect(isFsecStepDone({ statusId, shootingDate: null }, { minStatusForDone: 7 })).toBe(false);
    });

    it.each([
        ['HS', 8],
        ['Décision MOE', 15],
    ])('not done for paused status %s even on a shooting-date step', (_label, statusId) => {
        expect(isFsecStepDone({ statusId, shootingDate: new Date() }, { useShootingDate: true })).toBe(false);
    });
});

// ====================== Row ID helpers ======================

describe('row ID helpers', () => {
    it('memberRowId produces correct format', () => {
        expect(memberRowId('Alice')).toBe('member:Alice');
    });

    it('labRowId produces correct format', () => {
        expect(labRowId('abc-123')).toBe('lab:abc-123');
    });

    it('campaignRowId produces correct format', () => {
        expect(campaignRowId('uuid1', 'Assemblage')).toBe('campaign:uuid1#Assemblage');
    });

    it('campaignStepHeaderRowId produces correct format', () => {
        expect(campaignStepHeaderRowId('uuid1', 'Tir')).toBe('campaign-step:uuid1#Tir');
    });

    it('campaignFsecRowId produces correct format', () => {
        expect(campaignFsecRowId('uuid1', 'Tir', 'fsec1')).toBe('campaign-fsec:uuid1#Tir#fsec1');
    });

    it('machineUuidFromRowId extracts uuid from lab row', () => {
        expect(machineUuidFromRowId('lab:abc-123')).toBe('abc-123');
    });

    it('machineUuidFromRowId returns null for non-lab row', () => {
        expect(machineUuidFromRowId('member:Alice')).toBeNull();
    });
});

// ====================== bar-utils ======================

describe('itemOverlapsColumn', () => {
    const cols = computeWeeklyColumns('2025-04-01');
    const col = cols[2]; // some week in April

    it('overlaps when range covers column', () => {
        const item = {
            startDate: col.start.subtract(2, 'day').format('YYYY-MM-DD'),
            endDate: col.end.add(2, 'day').format('YYYY-MM-DD'),
        };
        expect(itemOverlapsColumn(item, col)).toBe(true);
    });

    it('does not overlap when range is before column', () => {
        const item = {
            startDate: col.start.subtract(20, 'day').format('YYYY-MM-DD'),
            endDate: col.start.subtract(10, 'day').format('YYYY-MM-DD'),
        };
        expect(itemOverlapsColumn(item, col)).toBe(false);
    });
});

describe('getBarPosition', () => {
    const cols = computeWeeklyColumns('2025-05-01');

    it('returns single when item spans exactly one column', () => {
        const item = {
            startDate: cols[3].start.format('YYYY-MM-DD'),
            endDate: cols[3].end.format('YYYY-MM-DD'),
        };
        expect(getBarPosition(item, cols, 3)).toBe('single');
    });

    it('returns start for first column of multi-span', () => {
        const item = {
            startDate: cols[3].start.format('YYYY-MM-DD'),
            endDate: cols[5].end.format('YYYY-MM-DD'),
        };
        expect(getBarPosition(item, cols, 3)).toBe('start');
    });

    it('returns middle for inner column', () => {
        const item = {
            startDate: cols[3].start.format('YYYY-MM-DD'),
            endDate: cols[5].end.format('YYYY-MM-DD'),
        };
        expect(getBarPosition(item, cols, 4)).toBe('middle');
    });

    it('returns end for last column of multi-span', () => {
        const item = {
            startDate: cols[3].start.format('YYYY-MM-DD'),
            endDate: cols[5].end.format('YYYY-MM-DD'),
        };
        expect(getBarPosition(item, cols, 5)).toBe('end');
    });
});

describe('getBarBorderRadius', () => {
    it('single → 6px all', () => expect(getBarBorderRadius('single')).toBe('6px'));
    it('start → left only', () => expect(getBarBorderRadius('start')).toBe('6px 0 0 6px'));
    it('end → right only', () => expect(getBarBorderRadius('end')).toBe('0 6px 6px 0'));
    it('middle → 0', () => expect(getBarBorderRadius('middle')).toBe('0'));
});

describe('getBarSpanCount', () => {
    const cols = computeWeeklyColumns('2025-05-01');

    it('returns 1 for single-column bar', () => {
        const item = {
            startDate: cols[4].start.format('YYYY-MM-DD'),
            endDate: cols[4].end.format('YYYY-MM-DD'),
        };
        expect(getBarSpanCount(item, cols)).toBe(1);
    });

    it('returns 3 for three-column bar', () => {
        const item = {
            startDate: cols[2].start.format('YYYY-MM-DD'),
            endDate: cols[4].end.format('YYYY-MM-DD'),
        };
        expect(getBarSpanCount(item, cols)).toBe(3);
    });

    it('returns 0 when item is outside all columns', () => {
        const item = { startDate: '2020-01-01', endDate: '2020-01-07' };
        expect(getBarSpanCount(item, cols)).toBe(0);
    });
});

describe('calculateResizePreview', () => {
    const cols = computeWeeklyColumns('2025-05-01');
    const item = {
        startDate: cols[3].start.format('YYYY-MM-DD'),
        endDate: cols[5].end.format('YYYY-MM-DD'),
    };

    it('dragging end extends bar', () => {
        const preview = calculateResizePreview(item, cols, 'end', 7, '#F00');
        expect(preview).not.toBeNull();
        expect(preview!.startIdx).toBe(3);
        expect(preview!.endIdx).toBe(7);
        expect(preview!.color).toBe('#F00');
    });

    it('dragging start retracts bar', () => {
        const preview = calculateResizePreview(item, cols, 'start', 4, '#0F0');
        expect(preview).not.toBeNull();
        expect(preview!.startIdx).toBe(4);
        expect(preview!.endIdx).toBe(5);
    });

    it('returns null for item outside columns', () => {
        const farItem = { startDate: '2020-01-01', endDate: '2020-01-07' };
        expect(calculateResizePreview(farItem, cols, 'end', 3, '#000')).toBeNull();
    });
});

describe('calculateDragPreview', () => {
    const cols = computeWeeklyColumns('2025-05-01');
    // Barre de 3 colonnes (indices 3 → 5).
    const item = {
        startDate: cols[3].start.format('YYYY-MM-DD'),
        endDate: cols[5].end.format('YYYY-MM-DD'),
    };

    it('décale toute la barre vers la droite en conservant sa longueur', () => {
        const preview = calculateDragPreview(item, cols, 2, '#F00');
        expect(preview).not.toBeNull();
        expect(preview!.startIdx).toBe(5);
        expect(preview!.endIdx).toBe(7);
        expect(preview!.color).toBe('#F00');
    });

    it('décale toute la barre vers la gauche', () => {
        const preview = calculateDragPreview(item, cols, -3, '#0F0');
        expect(preview!.startIdx).toBe(0);
        expect(preview!.endIdx).toBe(2);
    });

    it('borne le décalage aux extrémités de la grille', () => {
        const preview = calculateDragPreview(item, cols, -10, '#00F');
        expect(preview!.startIdx).toBe(0);
        // endIdx borné à 0 (la barre déborde entièrement à gauche)
        expect(preview!.endIdx).toBe(0);
    });

    it('renvoie null pour un item hors colonnes', () => {
        const farItem = { startDate: '2020-01-01', endDate: '2020-01-07' };
        expect(calculateDragPreview(farItem, cols, 1, '#000')).toBeNull();
    });
});

// ====================== grid-utils ======================

describe('resolveWeekState', () => {
    const cols = computeWeeklyColumns('2025-03-01');
    const col = cols[0];

    it('returns state when weekNum is in map', () => {
        const map = new Map<number, 'vacances' | 'fermeture'>([[col.weekNum, 'vacances']]);
        expect(resolveWeekState(col, map)).toBe('vacances');
    });

    it('returns undefined when weekNum is not in map', () => {
        const map = new Map<number, 'vacances' | 'fermeture'>();
        expect(resolveWeekState(col, map)).toBeUndefined();
    });

    it('returns fermeture when mapped', () => {
        const map = new Map<number, 'vacances' | 'fermeture'>([[col.weekNum, 'fermeture']]);
        expect(resolveWeekState(col, map)).toBe('fermeture');
    });
});
