/**
 * PlanningLabRows — Lignes Vie Labo : salle (rowSpan) + machines.
 * Les salles et machines proviennent du module Matériel (lecture seule).
 * Clic sur une cellule pour créer/modifier un événement (catégorie + période).
 * Uses row virtualization via @tanstack/react-virtual for large salle lists.
 * Passes visible column range for column virtualization.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Typography } from '@mui/material';
import { type PlanningData, usePlanningColors } from '../lib/planning.hooks';
import type { TimelineColumn } from '../lib/planning.utils';
import type { VisibleColumnRange } from '../lib/useColumnVirtualization';
import { StickyLabelCell } from './PlanningCell';
import type { PlanningSalle } from '../lib/planning.lab';
import type { LabEventsMap } from '../lib/planning.hooks';
import LabMachineRow from './lab/LabMachineRow';

// ====================== Constants ======================

/** Estimated row height in pixels (matches LabMachineRow td height: 32) */
const ROW_HEIGHT = 32;

/** Virtualize only when total row count exceeds this threshold */
const VIRTUALIZATION_THRESHOLD = 10;

// ====================== Types ======================

interface PlanningLabRowsProps {
    salles: PlanningSalle[];
    columns: TimelineColumn[];
    planningData: PlanningData;
    labEvents: LabEventsMap;
    visibleRange: VisibleColumnRange;
}

// ====================== Main Component ======================

export const PlanningLabRows = memo(function PlanningLabRows({
    salles,
    columns,
    planningData,
    labEvents,
    visibleRange,
}: PlanningLabRowsProps) {
    // Count total rows: each salle contributes max(machines.length, 1) rows
    const totalRows = salles.reduce((sum, salle) => sum + Math.max(salle.machines.length, 1), 0);

    if (totalRows <= VIRTUALIZATION_THRESHOLD) {
        return (
            <>
                {salles.map((salle) =>
                    salle.machines.length === 0 ? (
                        <EmptySalleRow key={salle.uuid} salle={salle} columns={columns} visibleRange={visibleRange} />
                    ) : (
                        salle.machines.map((machine, machineIdx) => (
                            <LabMachineRow
                                key={machine.uuid}
                                salle={salle}
                                machine={machine}
                                isFirstMachine={machineIdx === 0}
                                totalMachines={salle.machines.length}
                                columns={columns}
                                planningData={planningData}
                                labEvents={labEvents}
                                visibleRange={visibleRange}
                            />
                        ))
                    ),
                )}
            </>
        );
    }

    return (
        <VirtualizedLabRows
            salles={salles}
            columns={columns}
            planningData={planningData}
            labEvents={labEvents}
            visibleRange={visibleRange}
        />
    );
});

// ====================== Virtualized Renderer ======================

function VirtualizedLabRows({ salles, columns, planningData, labEvents, visibleRange }: PlanningLabRowsProps) {
    const markerRef = useRef<HTMLTableRowElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);

    // Measure offset from window top to the start of lab rows
    useEffect(() => {
        if (markerRef.current) {
            const rect = markerRef.current.getBoundingClientRect();
            setScrollMargin(rect.top + window.scrollY);
        }
    }, []);

    // Build a flat index -> { salleIdx, machineIdx } mapping for virtualization
    type FlatRow = { salleIdx: number; machineIdx: number };
    const flatRows: FlatRow[] = [];
    for (let si = 0; si < salles.length; si++) {
        const salle = salles[si];
        if (salle.machines.length === 0) {
            flatRows.push({ salleIdx: si, machineIdx: -1 }); // empty salle
        } else {
            for (let mi = 0; mi < salle.machines.length; mi++) {
                flatRows.push({ salleIdx: si, machineIdx: mi });
            }
        }
    }

    const virtualizer = useWindowVirtualizer({
        count: flatRows.length,
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

            {/* Visible lab rows */}
            {items.map((virtualRow) => {
                const { salleIdx, machineIdx } = flatRows[virtualRow.index];
                const salle = salles[salleIdx];

                if (machineIdx === -1) {
                    return (
                        <EmptySalleRow key={salle.uuid} salle={salle} columns={columns} visibleRange={visibleRange} />
                    );
                }

                const machine = salle.machines[machineIdx];
                return (
                    <LabMachineRow
                        key={machine.uuid}
                        salle={salle}
                        machine={machine}
                        isFirstMachine={machineIdx === 0}
                        totalMachines={salle.machines.length}
                        columns={columns}
                        planningData={planningData}
                        labEvents={labEvents}
                        visibleRange={visibleRange}
                    />
                );
            })}

            {/* Bottom spacer for off-screen rows below */}
            {afterHeight > 0 && (
                <tr>
                    <td colSpan={totalCols} style={{ height: afterHeight, padding: 0, border: 'none' }} />
                </tr>
            )}
        </>
    );
}

// ====================== Empty salle row (no machines yet) ======================

function EmptySalleRow({
    salle,
    columns,
    visibleRange,
}: {
    salle: PlanningSalle;
    columns: TimelineColumn[];
    visibleRange: VisibleColumnRange;
}) {
    const colors = usePlanningColors();

    const { startCol, endCol } = visibleRange;

    return (
        <tr role="row">
            <StickyLabelCell bold>{salle.name}</StickyLabelCell>
            <StickyLabelCell isSubLabel>
                <Typography fontSize={11} color="text.secondary" fontStyle="italic">
                    Aucune machine
                </Typography>
            </StickyLabelCell>
            {/* Left spacer */}
            {startCol > 0 && <td colSpan={startCol} style={{ padding: 0, border: 'none', height: 32 }} />}
            {/* Visible columns */}
            {columns.slice(startCol, endCol + 1).map((col) => (
                <td
                    key={col.key}
                    role="gridcell"
                    style={{
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.cellBg,
                        height: 32,
                    }}
                />
            ))}
            {/* Right spacer */}
            {endCol < columns.length - 1 && (
                <td colSpan={columns.length - 1 - endCol} style={{ padding: 0, border: 'none', height: 32 }} />
            )}
        </tr>
    );
}
