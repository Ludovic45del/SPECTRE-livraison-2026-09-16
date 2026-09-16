/**
 * Shared bar-rendering utilities for all planning row types.
 * Extracted from PlanningLabRows and PlanningMemberRows to DRY up the code.
 */
import dayjs from 'dayjs';
import type { BarPosition } from './planning.constants';
import type { TimelineColumn } from './planning.utils';

// Re-export BarPosition for convenience
export type { BarPosition } from './planning.constants';

// ====================== Generic overlap ======================

/** A minimal shape: anything with startDate / endDate strings. */
export interface DateRangeItem {
    startDate: string | null;
    endDate: string | null;
}

/**
 * Does `item` (any object with startDate/endDate) overlap the given timeline column?
 * Works for LabEvent, PlanningMemberPeriod, or any shape matching DateRangeItem.
 */
export function itemOverlapsColumn(item: DateRangeItem, col: TimelineColumn): boolean {
    const s = dayjs(item.startDate);
    const e = dayjs(item.endDate);
    return !col.end.isBefore(s, 'day') && !col.start.isAfter(e, 'day');
}

// ====================== Bar position ======================

/**
 * Determine whether this column is the start / middle / end / single cell of a
 * contiguous bar for `item`.
 */
export function getBarPosition(item: DateRangeItem, columns: TimelineColumn[], colIdx: number): BarPosition {
    const isFirst = colIdx === 0 || !itemOverlapsColumn(item, columns[colIdx - 1]);
    const isLast = colIdx === columns.length - 1 || !itemOverlapsColumn(item, columns[colIdx + 1]);
    if (isFirst && isLast) return 'single';
    if (isFirst) return 'start';
    if (isLast) return 'end';
    return 'middle';
}

// ====================== Border radius ======================

export function getBarBorderRadius(pos: BarPosition): string {
    switch (pos) {
        case 'single':
            return '6px';
        case 'start':
            return '6px 0 0 6px';
        case 'end':
            return '0 6px 6px 0';
        case 'middle':
            return '0';
    }
}

// ====================== Label placement ======================

/**
 * Returns the number of columns this item's bar spans.
 * Used to render a centered label overlay on multi-cell bars.
 */
export function getBarSpanCount(item: DateRangeItem, columns: TimelineColumn[]): number {
    const firstIdx = columns.findIndex((c) => itemOverlapsColumn(item, c));
    if (firstIdx < 0) return 0;

    let lastIdx = firstIdx;
    for (let i = columns.length - 1; i >= 0; i--) {
        if (itemOverlapsColumn(item, columns[i])) {
            lastIdx = i;
            break;
        }
    }

    return lastIdx - firstIdx + 1;
}

// ====================== Resize preview ======================

export interface ResizePreview {
    startIdx: number;
    endIdx: number;
    color: string;
}

/**
 * Given a resizing state, compute the ghost-bar preview range.
 *
 * @param item       The item being resized (must have startDate/endDate).
 * @param columns    Full set of timeline columns.
 * @param edge       Which edge is being dragged ('start' | 'end').
 * @param currentColIdx  The column index the cursor is currently over.
 * @param color      The bar colour to use for the ghost.
 */
export function calculateResizePreview(
    item: DateRangeItem,
    columns: TimelineColumn[],
    edge: 'start' | 'end',
    currentColIdx: number,
    color: string,
): ResizePreview | null {
    const firstIdx = columns.findIndex((c) => itemOverlapsColumn(item, c));
    if (firstIdx < 0) return null;

    let lastIdx = firstIdx;
    for (let i = columns.length - 1; i >= 0; i--) {
        if (itemOverlapsColumn(item, columns[i])) {
            lastIdx = i;
            break;
        }
    }

    if (edge === 'start') {
        return {
            startIdx: Math.min(currentColIdx, lastIdx),
            endIdx: lastIdx,
            color,
        };
    }
    return {
        startIdx: firstIdx,
        endIdx: Math.max(currentColIdx, firstIdx),
        color,
    };
}

// ====================== Drag-to-move preview ======================

export interface DragPreview {
    startIdx: number;
    endIdx: number;
    color: string;
}

/**
 * Pendant un déplacement (drag-to-move), calcule la plage de colonnes où la
 * barre atterrirait. Toute la barre glisse de `colDelta` colonnes
 * (`currentColIdx - originColIdx`, soit la colonne saisie → colonne survolée).
 *
 * @param item     L'item déplacé (startDate/endDate).
 * @param columns  Ensemble des colonnes de la timeline.
 * @param colDelta Décalage en colonnes appliqué à toute la barre.
 * @param color    Couleur du fantôme.
 */
export function calculateDragPreview(
    item: DateRangeItem,
    columns: TimelineColumn[],
    colDelta: number,
    color: string,
): DragPreview | null {
    const firstIdx = columns.findIndex((c) => itemOverlapsColumn(item, c));
    if (firstIdx < 0) return null;

    let lastIdx = firstIdx;
    for (let i = columns.length - 1; i >= 0; i--) {
        if (itemOverlapsColumn(item, columns[i])) {
            lastIdx = i;
            break;
        }
    }

    const span = lastIdx - firstIdx;
    const max = columns.length - 1;
    const start = Math.max(0, Math.min(firstIdx + colDelta, max));
    const end = Math.max(0, Math.min(firstIdx + colDelta + span, max));
    return { startIdx: start, endIdx: end, color };
}
