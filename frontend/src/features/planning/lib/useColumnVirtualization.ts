/**
 * useColumnVirtualization — Computes visible column range from horizontal scroll position.
 * Used to skip rendering off-screen <td> elements in each row, replacing them with
 * colSpan spacer cells to maintain table layout.
 *
 * @module features/planning/lib
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { COL_WIDTH, GRID_LABEL_WIDTH, GRID_SUB_LABEL_WIDTH } from './planning.constants';

// ====================== Types ======================

export interface VisibleColumnRange {
    /** First visible column index (inclusive) */
    startCol: number;
    /** Last visible column index (inclusive) */
    endCol: number;
    /** Total number of timeline columns */
    totalColumns: number;
}

// ====================== Hook ======================

/** Number of columns to render beyond the visible area on each side */
const OVERSCAN = 3;

/**
 * Hook that observes horizontal scroll on a container element and computes
 * which timeline columns are currently visible (with overscan).
 *
 * @param totalColumns Total number of timeline columns
 * @returns [scrollContainerRef, visibleRange]
 */
export function useColumnVirtualization(
    totalColumns: number,
): [React.RefObject<HTMLDivElement | null>, VisibleColumnRange] {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [range, setRange] = useState<VisibleColumnRange>({
        startCol: 0,
        endCol: totalColumns - 1,
        totalColumns,
    });

    const computeRange = useCallback(() => {
        const el = scrollRef.current;
        if (!el || totalColumns === 0) {
            setRange({ startCol: 0, endCol: totalColumns - 1, totalColumns });
            return;
        }

        const scrollLeft = el.scrollLeft;
        const viewportWidth = el.clientWidth;

        // The first two columns (label + sublabel) are sticky and always visible.
        // Timeline columns start after the fixed label area.
        const fixedWidth = GRID_LABEL_WIDTH + GRID_SUB_LABEL_WIDTH;

        // Scroll position relative to the start of timeline columns
        const timelineScrollLeft = Math.max(0, scrollLeft);

        // First visible timeline column index
        const rawStart = Math.floor(timelineScrollLeft / COL_WIDTH);
        // Last visible timeline column index (account for fixed labels taking viewport space)
        const visibleTimelineWidth = Math.max(viewportWidth - fixedWidth, 0) + Math.min(scrollLeft, fixedWidth);
        const rawEnd = Math.ceil((timelineScrollLeft + visibleTimelineWidth) / COL_WIDTH);

        const startCol = Math.max(0, rawStart - OVERSCAN);
        const endCol = Math.min(totalColumns - 1, rawEnd + OVERSCAN);

        setRange((prev) => {
            if (prev.startCol === startCol && prev.endCol === endCol && prev.totalColumns === totalColumns) {
                return prev;
            }
            return { startCol, endCol, totalColumns };
        });
    }, [totalColumns]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        // Initial computation
        computeRange();

        // Listen to scroll events (passive for performance)
        el.addEventListener('scroll', computeRange, { passive: true });

        // Recompute on resize
        const ro = new ResizeObserver(computeRange);
        ro.observe(el);

        return () => {
            el.removeEventListener('scroll', computeRange);
            ro.disconnect();
        };
    }, [computeRange]);

    return [scrollRef, range];
}
