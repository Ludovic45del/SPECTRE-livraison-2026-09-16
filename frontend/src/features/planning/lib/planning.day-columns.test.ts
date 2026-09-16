/**
 * Tests de la fabrique de colonnes journalières.
 */
import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { buildDayColumns } from './planning.day-columns';

describe('buildDayColumns', () => {
    it('builds N consecutive day columns', () => {
        const cols = buildDayColumns(dayjs('2026-05-04'), 7);
        expect(cols).toHaveLength(7);
        expect(cols[0].start.format('YYYY-MM-DD')).toBe('2026-05-04');
        expect(cols[6].start.format('YYYY-MM-DD')).toBe('2026-05-10');
    });

    it('start = début de jour et end = fin du MÊME jour (clé du resize multi-jours)', () => {
        const [c] = buildDayColumns(dayjs('2026-05-04'), 1);
        expect(c.start.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-05-04 00:00:00');
        expect(c.end.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-05-04 23:59:59');
        // useResizeBar fait col.start.format('YYYY-MM-DD') / col.end.format(...) :
        // les deux doivent retomber sur le même jour.
        expect(c.start.format('YYYY-MM-DD')).toBe(c.end.format('YYYY-MM-DD'));
    });

    it('flags weekends from the weekday', () => {
        const cols = buildDayColumns(dayjs('2026-05-01'), 14);
        for (const c of cols) {
            const dow = c.start.day();
            expect(c.isWeekend).toBe(dow === 0 || dow === 6);
        }
    });

    it('sets the isoWeek number and unique keys', () => {
        const cols = buildDayColumns(dayjs('2026-05-04'), 3);
        expect(cols[0].weekNum).toBe(dayjs('2026-05-04').isoWeek());
        expect(new Set(cols.map((c) => c.key)).size).toBe(3);
    });
});
