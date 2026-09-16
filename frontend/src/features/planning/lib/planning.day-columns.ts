/**
 * planning.day-columns — fabrique des colonnes JOURNALIÈRES au format TimelineColumn.
 *
 * En produisant des `TimelineColumn` dont `start = début de jour` et
 * `end = fin de jour`, on réutilise tels quels useDragToMove / useResizeBar /
 * assignLanes / bar-utils (qui comparent en granularité 'day') : le board
 * campagne hérite du drag-to-move et du resize multi-jours sans nouveau hook.
 * @module features/planning/lib
 */
import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { TimelineColumn } from './planning.utils';

dayjs.extend(isoWeek);

/** Construit `count` colonnes-jour consécutives à partir de `startDay` (inclus). */
export function buildDayColumns(startDay: Dayjs, count: number): TimelineColumn[] {
    const now = dayjs();
    const base = startDay.startOf('day');
    const cols: TimelineColumn[] = [];
    for (let i = 0; i < count; i++) {
        const day = base.add(i, 'day');
        const dow = day.day(); // 0 = dimanche … 6 = samedi
        cols.push({
            key: `d-${day.format('YYYY-MM-DD')}`,
            label: day.format('DD'),
            year: day.year(),
            weekNum: day.isoWeek(),
            dayOfWeek: dow,
            start: day.startOf('day'),
            end: day.endOf('day'),
            isCurrent: day.isSame(now, 'day'),
            isWeekend: dow === 0 || dow === 6,
        });
    }
    return cols;
}

/** Variante mémoïsée (clé = jour ISO + count) pour usage en composant. */
export function useDayColumns(startDay: Dayjs, count: number): TimelineColumn[] {
    const startKey = startDay.format('YYYY-MM-DD');
    return useMemo(() => buildDayColumns(dayjs(startKey), count), [startKey, count]);
}
