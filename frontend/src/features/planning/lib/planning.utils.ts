/**
 * Planning Utilities — fonctions pures pour le calcul de dates, colonnes, barres
 * @module features/planning/lib
 */

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/fr';
import { hasFsecReachedStatus, isPausedFsecStatus } from '@entities/fsec';
import { WEEKLY_COLS } from './planning.constants';

dayjs.extend(isoWeek);
dayjs.locale('fr');

// ====================== Timeline Column ======================

export interface TimelineColumn {
    key: string;
    label: string;
    year: number;
    weekNum: number;
    dayOfWeek: number | null;
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
    isCurrent: boolean;
    isWeekend: boolean;
}

export interface TimelineGroupHeader {
    label: string;
    colSpan: number;
}

export interface TimelineData {
    columns: TimelineColumn[];
    groupHeaders: TimelineGroupHeader[];
}

// ====================== Column Computation ======================

export function computeWeeklyColumns(anchorDate: string): TimelineColumn[] {
    const anchor = dayjs(anchorDate);
    const startOfMonth = anchor.startOf('month');
    const firstMonday = startOfMonth.startOf('isoWeek');
    const now = dayjs();
    const columns: TimelineColumn[] = [];

    for (let i = 0; i < WEEKLY_COLS; i++) {
        const weekStart = firstMonday.add(i, 'week');
        const wn = weekStart.isoWeek();
        const wy = weekStart.isoWeekYear();
        columns.push({
            key: `w-${wy}-${wn}`,
            label: `S${wn}`,
            year: wy,
            weekNum: wn,
            dayOfWeek: null,
            start: weekStart,
            end: weekStart.add(6, 'day').endOf('day'),
            isCurrent: now.isoWeek() === wn && now.isoWeekYear() === wy,
            isWeekend: false,
        });
    }
    return columns;
}

// ====================== Group Headers ======================

function capitalizeFirst(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function computeGroupHeaders(columns: TimelineColumn[]): TimelineGroupHeader[] {
    if (columns.length === 0) return [];

    // Group by month name
    const headers: TimelineGroupHeader[] = [];
    let currentMonth = columns[0].start.format('MMMM');
    let count = 1;

    for (let i = 1; i < columns.length; i++) {
        const month = columns[i].start.format('MMMM');
        if (month === currentMonth) {
            count++;
        } else {
            headers.push({ label: capitalizeFirst(currentMonth), colSpan: count });
            currentMonth = month;
            count = 1;
        }
    }
    headers.push({ label: capitalizeFirst(currentMonth), colSpan: count });
    return headers;
}

// ====================== Timeline Data ======================

export function computeTimeline(anchorDate: string): TimelineData {
    const columns = computeWeeklyColumns(anchorDate);
    return {
        columns,
        groupHeaders: computeGroupHeaders(columns),
    };
}

// ====================== Column → weekNums mapping ======================

export function columnToWeekNums(col: TimelineColumn): number[] {
    return [col.weekNum];
}

// ====================== Cell Coord from Event ======================

export interface CellCoord {
    rowId: string;
    colIndex: number;
}

export function getCellCoordFromEvent(e: React.MouseEvent): CellCoord | null {
    const td = (e.target as HTMLElement).closest('td[data-row-id]') as HTMLElement | null;
    if (!td) return null;
    const rowId = td.dataset.rowId;
    const colIndex = parseInt(td.dataset.colIndex ?? '', 10);
    if (!rowId || isNaN(colIndex)) return null;
    return { rowId, colIndex };
}

// ====================== Date range overlap ======================

/** Generic overlap check: does a { startDate, endDate } range overlap a timeline column? */
export function dateRangeOverlapsColumn(
    range: { startDate: string | null; endDate: string | null },
    col: TimelineColumn,
): boolean {
    if (!range.startDate || !range.endDate) return false;
    const s = dayjs(range.startDate);
    const e = dayjs(range.endDate);
    return !col.end.isBefore(s, 'day') && !col.start.isAfter(e, 'day');
}

// ====================== FSEC step done ======================

export function isFsecStepDone(
    fsec: { statusId: number | null; shootingDate: Date | null },
    etape: { minStatusForDone?: number | null; useShootingDate?: boolean },
): boolean {
    // Un statut de pause (HS, Décision MOE) fige l'avancement : tant que la FSEC
    // est en pause, aucune étape n'est considérée comme terminée. Sans ce garde,
    // statusId=15 (>= tous les seuils) marquerait toutes les étapes « faites ».
    if (isPausedFsecStatus(fsec.statusId)) return false;
    if (etape.useShootingDate) return fsec.shootingDate != null;
    // Comparaison par RANG dans le workflow et non par id brut : les ids ne sont
    // pas monotones (16 Vérification scellement entre 3 et 4, étapes gaz 9..14
    // entre 4 et 5) ; une comparaison numérique marquerait « Gaz/Livraison/Tir »
    // terminés pour une FSEC encore en vérification de scellement ou en remplissage.
    if (etape.minStatusForDone != null) return hasFsecReachedStatus(fsec.statusId, etape.minStatusForDone);
    return false;
}
