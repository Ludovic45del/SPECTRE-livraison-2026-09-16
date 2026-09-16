/**
 * useResizeBar — generic resize hook for planning bar rows.
 *
 * Tracks edge-drag (start/end) on bars and fires `onResize` with final dates.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimelineColumn } from './planning.utils';

export interface ResizeState {
    /** UUID (or any unique id) of the item being resized. */
    itemId: string;
    edge: 'start' | 'end';
    currentColIdx: number;
}

export interface ResizeBarOptions {
    /** Full column list. */
    columns: TimelineColumn[];
    /** Array of items (need uuid + startDate + endDate). */
    items: { uuid: string; startDate: string | null; endDate: string | null }[];
    /**
     * Called when the resize is committed.
     * Receives the item's uuid plus the new start/end date strings.
     */
    onResize: (uuid: string, newStartDate: string, newEndDate: string) => void;
}

export interface ResizeBarResult {
    /** Current resize state (null when idle). Used to drive resize preview. */
    resizing: ResizeState | null;
    /** Attach to `onMouseDown` on bar edge handles. */
    handleResizeStart: (
        e: React.MouseEvent,
        item: { uuid: string; startDate: string | null; endDate: string | null },
        edge: 'start' | 'end',
        colIdx: number,
    ) => void;
    /** Ref that is `true` for one click cycle after a resize so the click handler can bail out. */
    skipNextClick: React.MutableRefObject<boolean>;
}

export function useResizeBar({ columns, items, onResize }: ResizeBarOptions): ResizeBarResult {
    const [resizing, setResizing] = useState<ResizeState | null>(null);
    const resizingRef = useRef(resizing);
    resizingRef.current = resizing;

    const columnsRef = useRef(columns);
    columnsRef.current = columns;
    const itemsRef = useRef(items);
    itemsRef.current = items;

    const skipNextClick = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        return () => {
            cleanupRef.current?.();
        };
    }, []);

    const handleResizeStart = useCallback(
        (
            e: React.MouseEvent,
            item: { uuid: string; startDate: string | null; endDate: string | null },
            edge: 'start' | 'end',
            colIdx: number,
        ) => {
            e.preventDefault();
            e.stopPropagation();

            setResizing({ itemId: item.uuid, edge, currentColIdx: colIdx });

            let rafId = 0;
            const handleDocMove = (me: MouseEvent) => {
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    const td = (me.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
                    if (!td) return;
                    const ci = parseInt(td.dataset.colIndex ?? '', 10);
                    if (!isNaN(ci)) {
                        setResizing((prev) =>
                            prev && prev.currentColIdx !== ci ? { ...prev, currentColIdx: ci } : prev,
                        );
                    }
                });
            };

            const handleDocUp = () => {
                cleanup();
                skipNextClick.current = true;

                const state = resizingRef.current;
                if (!state) return;

                const cols = columnsRef.current;
                const targetCol = cols[state.currentColIdx];
                if (!targetCol) {
                    setResizing(null);
                    return;
                }

                const p = itemsRef.current.find((pp) => pp.uuid === state.itemId);
                if (!p) {
                    setResizing(null);
                    return;
                }

                if (!p.startDate || !p.endDate) {
                    setResizing(null);
                    return;
                }
                let newStart = p.startDate;
                let newEnd = p.endDate;

                if (state.edge === 'start') {
                    newStart = targetCol.start.format('YYYY-MM-DD');
                    if (newStart > newEnd) newEnd = newStart;
                } else {
                    newEnd = targetCol.end.format('YYYY-MM-DD');
                    if (newEnd < newStart) newStart = newEnd;
                }

                if (newStart !== p.startDate || newEnd !== p.endDate) {
                    onResize(p.uuid, newStart, newEnd);
                }

                setResizing(null);
            };

            const cleanup = () => {
                cancelAnimationFrame(rafId);
                document.removeEventListener('mousemove', handleDocMove);
                document.removeEventListener('mouseup', handleDocUp);
                document.body.style.cursor = '';
                cleanupRef.current = null;
            };

            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleDocMove);
            document.addEventListener('mouseup', handleDocUp);
            cleanupRef.current = cleanup;
        },
        [onResize],
    );

    return { resizing, handleResizeStart, skipNextClick };
}
