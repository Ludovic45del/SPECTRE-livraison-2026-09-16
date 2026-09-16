/**
 * PlanningMemberRows — Lignes des membres d'equipe dans le planning unifie.
 * Thin container that delegates rendering to MemberRow.
 * Uses row virtualization via @tanstack/react-virtual for large lists.
 * Passes visible column range for column virtualization.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Membre } from '../lib/planning.constants';
import type { PlanningData } from '../lib/planning.hooks';
import type { TimelineColumn } from '../lib/planning.utils';
import type { VisibleColumnRange } from '../lib/useColumnVirtualization';
import { MemberRow } from './member/MemberRow';

// ====================== Constants ======================

/** Estimated row height in pixels (matches MemberRow td height: 32) */
const ROW_HEIGHT = 32;

/** Virtualize only when member count exceeds this threshold */
const VIRTUALIZATION_THRESHOLD = 15;

// ====================== Types ======================

interface PlanningMemberRowsProps {
    membres: Membre[];
    columns: TimelineColumn[];
    planningData: PlanningData;
    visibleRange: VisibleColumnRange;
}

// ====================== Main Component ======================

export const PlanningMemberRows = memo(function PlanningMemberRows({
    membres,
    columns,
    planningData,
    visibleRange,
}: PlanningMemberRowsProps) {
    if (membres.length <= VIRTUALIZATION_THRESHOLD) {
        return (
            <>
                {membres.map((membre) => (
                    <MemberRow
                        key={membre.nom}
                        membre={membre}
                        columns={columns}
                        planningData={planningData}
                        visibleRange={visibleRange}
                    />
                ))}
            </>
        );
    }

    return (
        <VirtualizedMemberRows
            membres={membres}
            columns={columns}
            planningData={planningData}
            visibleRange={visibleRange}
        />
    );
});

// ====================== Virtualized Renderer ======================

function VirtualizedMemberRows({ membres, columns, planningData, visibleRange }: PlanningMemberRowsProps) {
    const markerRef = useRef<HTMLTableRowElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    // Measure offset from window top to the start of member rows
    useEffect(() => {
        if (markerRef.current) {
            const rect = markerRef.current.getBoundingClientRect();
            setScrollMargin(rect.top + window.scrollY);
        }
    }, []);

    const virtualizer = useWindowVirtualizer({
        count: membres.length,
        estimateSize: () => ROW_HEIGHT,
        overscan: 5,
        scrollMargin,
    });

    const items = virtualizer.getVirtualItems();
    const totalCols = 2 + columns.length;

    // Spacer heights for rows above/below the visible window
    const beforeHeight = items.length > 0 ? items[0].start - virtualizer.options.scrollMargin : 0;
    const afterHeight =
        items.length > 0
            ? virtualizer.getTotalSize() - (items[items.length - 1].end - virtualizer.options.scrollMargin)
            : 0;

    return (
        <>
            {/* Hidden marker row to measure scroll offset */}
            <tr ref={markerRef} style={{ height: 0, visibility: 'collapse' }} />

            {/* Top spacer for off-screen rows above */}
            {beforeHeight > 0 && (
                <tr>
                    <td colSpan={totalCols} style={{ height: beforeHeight, padding: 0, border: 'none' }} />
                </tr>
            )}

            {/* Visible member rows */}
            {items.map((virtualRow) => (
                <MemberRow
                    key={membres[virtualRow.index].nom}
                    membre={membres[virtualRow.index]}
                    columns={columns}
                    planningData={planningData}
                    visibleRange={visibleRange}
                />
            ))}

            {/* Bottom spacer for off-screen rows below */}
            {afterHeight > 0 && (
                <tr>
                    <td colSpan={totalCols} style={{ height: afterHeight, padding: 0, border: 'none' }} />
                </tr>
            )}
        </>
    );
}
