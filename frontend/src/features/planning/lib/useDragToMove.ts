/**
 * useDragToMove — generic drag-to-move hook for planning bar rows.
 *
 * Two entry points:
 *  - `handleCellMouseDown` : mousedown on a `<td>` cell, the item is resolved
 *    via `findItemAtColumn` (one item per row).
 *  - `handleItemMouseDown` : mousedown on a bar element with an explicit item
 *    (used when a single row hosts several bars, e.g. lane-packed campaign rows).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimelineColumn } from './planning.utils';

export interface DragToMoveOptions<T> {
    /** Columns array (latest reference kept internally). */
    columns: TimelineColumn[];
    /** Return the item that occupies `col`, or undefined if empty. */
    findItemAtColumn: (col: TimelineColumn) => T | undefined;
    /** Called when the user drops an item on a different column. */
    onMove: (item: T, dayOffset: number) => void;
    /** When true the hook is completely disabled (e.g. edit mode). */
    disabled?: boolean;
}

/** État d'un déplacement en cours, qui pilote le fantôme + la surbrillance cible. */
export interface DragMoveState<T> {
    /** Item en cours de déplacement. */
    item: T;
    /** Index de la colonne saisie au mousedown. */
    originColIdx: number;
    /** Index de la colonne actuellement survolée. */
    currentColIdx: number;
}

export interface DragToMoveResult<T> {
    /** Attach to `onMouseDown` of each cell `<td>` (single-item rows). */
    handleCellMouseDown: (e: React.MouseEvent<HTMLElement>, col: TimelineColumn, colIdx: number) => void;
    /** Attach to `onMouseDown` of a bar element with an explicit item (multi-bar rows). */
    handleItemMouseDown: (e: React.MouseEvent<HTMLElement>, item: T, colIdx: number) => void;
    /** Ref that is `true` for one click cycle after a drag so the click handler can bail out. */
    skipNextClick: React.MutableRefObject<boolean>;
    /** Déplacement en cours (null au repos). Pilote l'aperçu fantôme + surbrillance. */
    dragging: DragMoveState<T> | null;
}

export function useDragToMove<T>({
    columns,
    findItemAtColumn,
    onMove,
    disabled = false,
}: DragToMoveOptions<T>): DragToMoveResult<T> {
    const columnsRef = useRef(columns);
    columnsRef.current = columns;

    const [dragging, setDragging] = useState<DragMoveState<T> | null>(null);

    const skipNextClick = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    // Cancel any active drag on unmount or when disabled becomes true
    useEffect(() => {
        if (disabled) {
            cleanupRef.current?.();
        }
        return () => {
            cleanupRef.current?.();
        };
    }, [disabled]);

    const startDrag = useCallback(
        (item: T, originColIdx: number) => {
            setDragging({ item, originColIdx, currentColIdx: originColIdx });

            let rafId = 0;
            const handleDocMove = (me: MouseEvent) => {
                document.body.style.cursor = 'grabbing';
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    const td = (me.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
                    if (!td) return;
                    const ci = parseInt(td.dataset.colIndex ?? '', 10);
                    if (isNaN(ci)) return;
                    setDragging((prev) => (prev && prev.currentColIdx !== ci ? { ...prev, currentColIdx: ci } : prev));
                });
            };

            let finalColIdx = originColIdx;
            const handleDocUp = (me: MouseEvent) => {
                cleanup();
                const td = (me.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
                if (td) {
                    const ci = parseInt(td.dataset.colIndex ?? '', 10);
                    if (!isNaN(ci)) finalColIdx = ci;
                }

                if (finalColIdx === originColIdx) return;

                skipNextClick.current = true;

                const cols = columnsRef.current;
                const originCol = cols[originColIdx];
                const targetCol = cols[finalColIdx];
                if (!originCol || !targetCol) return;

                const dayOffset = targetCol.start.diff(originCol.start, 'day');
                if (dayOffset === 0) return;

                onMove(item, dayOffset);
            };

            const cleanup = () => {
                cancelAnimationFrame(rafId);
                document.removeEventListener('mousemove', handleDocMove);
                document.removeEventListener('mouseup', handleDocUp);
                document.body.style.cursor = '';
                cleanupRef.current = null;
                setDragging(null);
            };

            document.body.style.cursor = 'grabbing';
            document.addEventListener('mousemove', handleDocMove);
            document.addEventListener('mouseup', handleDocUp);
            cleanupRef.current = cleanup;
        },
        [onMove],
    );

    const handleCellMouseDown = useCallback(
        (e: React.MouseEvent<HTMLElement>, col: TimelineColumn, colIdx: number) => {
            if (disabled || e.button !== 0) return;
            const match = findItemAtColumn(col);
            if (!match) return;
            e.preventDefault();
            startDrag(match, colIdx);
        },
        [disabled, findItemAtColumn, startDrag],
    );

    const handleItemMouseDown = useCallback(
        (e: React.MouseEvent<HTMLElement>, item: T, colIdx: number) => {
            if (disabled || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            startDrag(item, colIdx);
        },
        [disabled, startDrag],
    );

    return { handleCellMouseDown, handleItemMouseDown, skipNextClick, dragging };
}
