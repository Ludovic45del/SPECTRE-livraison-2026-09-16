/**
 * LabMachineRow — A single machine row within a salle, with event bars,
 * drag-to-move, resize, and inline editing support.
 * Supports column virtualization: only visible columns are rendered as <td>,
 * off-screen columns are replaced by colSpan spacer cells.
 */
import { memo, useCallback, useMemo, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { NotesOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';
import { getEventCategoryMeta, labRowId, DRAG_GHOST_SHADOW } from '../../lib/planning.constants';
import { type PlanningData, usePlanningColors } from '../../lib/planning.hooks';
import type { TimelineColumn } from '../../lib/planning.utils';
import type { VisibleColumnRange } from '../../lib/useColumnVirtualization';
import { resolveWeekState } from '../../lib/planning.grid-utils';
import { HoverTd, StickyLabelCell } from '../PlanningCell';
import type { LabEvent } from '@entities/planning/core/model/planning.schema';
import type { PlanningMachine, PlanningSalle } from '../../lib/planning.lab';
import type { LabEventsMap } from '../../lib/planning.hooks';
import { useUpdateLabEvent } from '@entities/planning/core/api/planning.queries';
import {
    itemOverlapsColumn,
    getBarPosition,
    getBarBorderRadius,
    calculateResizePreview,
    calculateDragPreview,
    getBarSpanCount,
} from '../../lib/planning.bar-utils';
import { useDragToMove } from '../../lib/useDragToMove';
import { useResizeBar } from '../../lib/useResizeBar';
import { EventPopover } from './EventPopover';
import { motion } from '@shared/ui/motion';

// ── Stable sx constants (extracted outside component to avoid re-creation) ──

const resizeHandleBaseSx = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    cursor: 'col-resize',
    pointerEvents: 'auto',
    zIndex: 1,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
} as const;

const resizeHandleStartSx = { ...resizeHandleBaseSx, left: 0, borderRadius: '6px 0 0 6px' } as const;
const resizeHandleEndSx = { ...resizeHandleBaseSx, right: 0, borderRadius: '0 6px 6px 0' } as const;

const notesIconSx = { fontSize: 11, color: '#fff', flexShrink: 0, pointerEvents: 'auto' } as const;

const LabMachineRow = memo(function LabMachineRow({
    salle,
    machine,
    isFirstMachine,
    totalMachines,
    columns,
    planningData,
    labEvents,
    visibleRange,
}: {
    salle: PlanningSalle;
    machine: PlanningMachine;
    isFirstMachine: boolean;
    totalMachines: number;
    columns: TimelineColumn[];
    planningData: PlanningData;
    labEvents: LabEventsMap;
    visibleRange: VisibleColumnRange;
}) {
    const colors = usePlanningColors();

    const updateEvent = useUpdateLabEvent();

    const rowId = labRowId(machine.uuid);
    const machineEvents = labEvents.get(machine.uuid) ?? [];
    const [popover, setPopover] = useState<{
        anchorEl: HTMLElement;
        defaultDate: string;
        existingEvent?: LabEvent;
    } | null>(null);

    // ---- Drag-to-move via shared hook ----
    const findItemAtColumn = useCallback(
        (col: TimelineColumn) => machineEvents.find((e) => itemOverlapsColumn(e, col)),
        [machineEvents],
    );

    const {
        handleCellMouseDown,
        skipNextClick: skipNextClickDrag,
        dragging,
    } = useDragToMove<LabEvent>({
        columns,
        findItemAtColumn,
        onMove: (event, dayOffset) => {
            const newStartDate = dayjs(event.startDate).add(dayOffset, 'day').format('YYYY-MM-DD');
            const newEndDate = dayjs(event.endDate).add(dayOffset, 'day').format('YYYY-MM-DD');

            updateEvent.mutate({
                uuid: event.uuid,
                data: {
                    machineUuid: machine.uuid,
                    category: event.category,
                    description: event.description,
                    startDate: newStartDate,
                    endDate: newEndDate,
                },
            });
        },
    });

    // ---- Resize via shared hook ----
    const {
        resizing,
        handleResizeStart,
        skipNextClick: skipNextClickResize,
    } = useResizeBar({
        items: machineEvents,
        columns,
        onResize: (uuid, newStartDate, newEndDate) => {
            const ev = machineEvents.find((e) => e.uuid === uuid);
            if (!ev) return;
            updateEvent.mutate({
                uuid,
                data: {
                    machineUuid: machine.uuid,
                    category: ev.category,
                    description: ev.description,
                    startDate: newStartDate,
                    endDate: newEndDate,
                },
            });
        },
    });

    // Click handler: create/edit popover (skipped after a drag or resize)
    const handleCellClick = useCallback(
        (e: React.MouseEvent<HTMLTableCellElement>, col: TimelineColumn) => {
            if (skipNextClickDrag.current || skipNextClickResize.current) {
                skipNextClickDrag.current = false;
                skipNextClickResize.current = false;
                return;
            }
            const evIdx = machineEvents.findIndex((ev) => itemOverlapsColumn(ev, col));
            if (evIdx >= 0) {
                setPopover({
                    anchorEl: e.currentTarget,
                    defaultDate: col.start.format('YYYY-MM-DD'),
                    existingEvent: machineEvents[evIdx],
                });
            } else {
                setPopover({
                    anchorEl: e.currentTarget,
                    defaultDate: col.start.format('YYYY-MM-DD'),
                });
            }
        },
        [machineEvents, skipNextClickDrag, skipNextClickResize],
    );

    // ── Precomputed timeline data with column virtualization ──
    const timelineCells = useMemo(() => {
        const { startCol, endCol } = visibleRange;

        // Precompute resize preview range using shared util
        let resizePreview: { startIdx: number; endIdx: number; color: string } | null = null;
        if (resizing) {
            const ev = machineEvents.find((e) => e.uuid === resizing.itemId);
            if (ev) {
                const meta = getEventCategoryMeta(ev.category);
                resizePreview = calculateResizePreview(
                    ev,
                    columns,
                    resizing.edge,
                    resizing.currentColIdx,
                    meta?.color ?? colors.blue,
                );
            }
        }

        // Precompute drag-to-move preview range (whole bar shifts by colDelta)
        let dragPreview: { startIdx: number; endIdx: number; color: string } | null = null;
        let draggedUuid: string | null = null;
        if (dragging) {
            const colDelta = dragging.currentColIdx - dragging.originColIdx;
            if (colDelta !== 0) {
                draggedUuid = dragging.item.uuid;
                const meta = getEventCategoryMeta(dragging.item.category);
                dragPreview = calculateDragPreview(dragging.item, columns, colDelta, meta?.color ?? colors.blue);
            }
        }

        // Precompute event-to-column mapping for O(1) lookups
        const eventByCol = new Map<number, LabEvent>();
        for (let ei = 0; ei < machineEvents.length; ei++) {
            for (let ci = 0; ci < columns.length; ci++) {
                if (!eventByCol.has(ci) && itemOverlapsColumn(machineEvents[ei], columns[ci])) {
                    eventByCol.set(ci, machineEvents[ei]);
                }
            }
        }

        const cells: React.ReactNode[] = [];

        // Left spacer for off-screen columns
        if (startCol > 0) {
            cells.push(<td key="spacer-left" colSpan={startCol} style={{ padding: 0, border: 'none', height: 32 }} />);
        }

        // Visible columns
        for (let idx = startCol; idx <= endCol && idx < columns.length; idx++) {
            const col = columns[idx];
            const weekState = resolveWeekState(col, planningData.weekStatesMap);

            // O(1) lookup from precomputed map
            const matchingEvent = eventByCol.get(idx);
            const catMeta = matchingEvent ? getEventCategoryMeta(matchingEvent.category) : undefined;
            const barPos = matchingEvent ? getBarPosition(matchingEvent, columns, idx) : undefined;

            // Resize visual feedback
            const isResizedEvent = resizing && matchingEvent?.uuid === resizing.itemId;
            const isInResizePreview = resizePreview && idx >= resizePreview.startIdx && idx <= resizePreview.endIdx;
            const isResizePreviewStart = isInResizePreview && idx === resizePreview!.startIdx;
            const isResizePreviewEnd = isInResizePreview && idx === resizePreview!.endIdx;

            // Drag-to-move visual feedback
            const isDraggedEvent = draggedUuid != null && matchingEvent?.uuid === draggedUuid;
            const isInDragPreview = dragPreview != null && idx >= dragPreview.startIdx && idx <= dragPreview.endIdx;
            const isDragPreviewStart = isInDragPreview && idx === dragPreview!.startIdx;
            const dragSpan = dragPreview ? dragPreview.endIdx - dragPreview.startIdx + 1 : 0;

            cells.push(
                <HoverTd
                    key={col.key}
                    role="gridcell"
                    data-row-id={rowId}
                    data-col-index={idx}
                    onMouseDown={(e) => handleCellMouseDown(e, col, idx)}
                    onClick={(e) => handleCellClick(e, col)}
                    style={{
                        position: 'relative',
                        padding: 0,
                        borderTop: `1px solid ${colors.border}`,
                        borderBottom: `1px solid ${colors.border}`,
                        borderLeft:
                            barPos && (barPos === 'middle' || barPos === 'end') ? 'none' : `1px solid ${colors.border}`,
                        borderRight:
                            barPos && (barPos === 'start' || barPos === 'middle')
                                ? 'none'
                                : `1px solid ${colors.border}`,
                        // Surbrillance des colonnes cibles pendant un déplacement
                        boxShadow: isInDragPreview ? `inset 0 0 0 100px ${colors.dragHighlight}` : undefined,
                        backgroundColor: col.isCurrent
                            ? colors.currentDay
                            : weekState === 'fermeture'
                              ? colors.fermeture
                              : weekState === 'vacances'
                                ? colors.vacances
                                : col.isWeekend
                                  ? colors.weekend
                                  : colors.cellBg,
                        cursor: matchingEvent ? 'grab' : 'pointer',
                        height: 32,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: 10,
                        userSelect: 'none',
                    }}
                >
                    {matchingEvent && catMeta && barPos && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: barPos === 'start' || barPos === 'single' ? 2 : 0,
                                right: barPos === 'end' || barPos === 'single' ? 2 : 0,
                                bgcolor: catMeta.color,
                                borderRadius: getBarBorderRadius(barPos),
                                overflow: 'hidden',
                                opacity: isResizedEvent || isDraggedEvent ? 0.3 : 0.85,
                                pointerEvents: 'none',
                                transition: `opacity ${motion.fast}`,
                            }}
                        >
                            {/* Resize handles at bar edges */}
                            {!resizing && (barPos === 'start' || barPos === 'single') && (
                                <Box
                                    onMouseDown={(e) => handleResizeStart(e, matchingEvent, 'start', idx)}
                                    sx={resizeHandleStartSx}
                                />
                            )}
                            {!resizing && (barPos === 'end' || barPos === 'single') && (
                                <Box
                                    onMouseDown={(e) => handleResizeStart(e, matchingEvent, 'end', idx)}
                                    sx={resizeHandleEndSx}
                                />
                            )}
                        </Box>
                    )}

                    {/* Centered label — outside bar to avoid overflow:hidden clipping */}
                    {matchingEvent && catMeta && (barPos === 'start' || barPos === 'single') && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: 0,
                                width: `${getBarSpanCount(matchingEvent, columns) * 100}%`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                {matchingEvent.description && (
                                    <Tooltip title={matchingEvent.description} arrow>
                                        <NotesOutlined sx={notesIconSx} />
                                    </Tooltip>
                                )}
                                <Typography fontSize={9} fontWeight={600} color="#fff" noWrap>
                                    {matchingEvent.category}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Resize preview ghost bar */}
                    {isInResizePreview && resizePreview && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: isResizePreviewStart ? 2 : 0,
                                right: isResizePreviewEnd ? 2 : 0,
                                bgcolor: resizePreview.color,
                                borderRadius:
                                    isResizePreviewStart && isResizePreviewEnd
                                        ? '6px'
                                        : isResizePreviewStart
                                          ? '6px 0 0 6px'
                                          : isResizePreviewEnd
                                            ? '0 6px 6px 0'
                                            : '0',
                                opacity: 0.5,
                                border: `1px dashed rgba(255,255,255,0.6)`,
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    {/* Drag-to-move ghost: barre fantôme ombrée à l'emplacement de dépôt */}
                    {isDragPreviewStart && dragPreview && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: 2,
                                width: `calc(${dragSpan * 100}% - 4px)`,
                                bgcolor: dragPreview.color,
                                borderRadius: '6px',
                                opacity: 0.75,
                                border: '1px dashed rgba(255,255,255,0.85)',
                                boxShadow: DRAG_GHOST_SHADOW,
                                pointerEvents: 'none',
                                zIndex: 3,
                            }}
                        />
                    )}
                </HoverTd>,
            );
        }

        // Right spacer for off-screen columns
        const rightSpacerCols = columns.length - 1 - endCol;
        if (rightSpacerCols > 0) {
            cells.push(
                <td key="spacer-right" colSpan={rightSpacerCols} style={{ padding: 0, border: 'none', height: 32 }} />,
            );
        }

        return cells;
    }, [
        columns,
        machineEvents,
        planningData.weekStatesMap,
        resizing,
        dragging,
        rowId,
        colors,
        handleCellMouseDown,
        handleCellClick,
        handleResizeStart,
        visibleRange,
    ]);

    return (
        <tr role="row">
            {/* Salle cell — only on first machine row */}
            {isFirstMachine && (
                <StickyLabelCell bold rowSpan={totalMachines}>
                    {salle.name}
                </StickyLabelCell>
            )}

            {/* Machine cell */}
            <StickyLabelCell isSubLabel>{machine.name}</StickyLabelCell>

            {/* Timeline cells */}
            {timelineCells}

            {/* Event popover */}
            {popover && (
                <EventPopover
                    anchorEl={popover.anchorEl}
                    existingEvent={popover.existingEvent}
                    defaultDate={popover.defaultDate}
                    machineUuid={machine.uuid}
                    onClose={() => setPopover(null)}
                />
            )}
        </tr>
    );
});

export default LabMachineRow;
