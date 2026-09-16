/**
 * MemberRow — A single member row in the planning grid, with period bars,
 * drag-to-move, resize, and popover editing support.
 * Supports column virtualization: only visible columns are rendered as <td>,
 * off-screen columns are replaced by colSpan spacer cells.
 */
import { memo, useCallback, useMemo, useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { NotesOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';
import { type Membre, memberRowId, getPeriodeMeta, DRAG_GHOST_SHADOW } from '../../lib/planning.constants';
import { type PlanningData, usePlanningColors } from '../../lib/planning.hooks';
import { usePlanningStore } from '../../lib/planning.store';
import type { TimelineColumn } from '../../lib/planning.utils';
import type { VisibleColumnRange } from '../../lib/useColumnVirtualization';
import {
    itemOverlapsColumn,
    getBarPosition,
    getBarBorderRadius,
    calculateResizePreview,
    calculateDragPreview,
    getBarSpanCount,
} from '../../lib/planning.bar-utils';
import { resolveWeekState } from '../../lib/planning.grid-utils';
import { useDragToMove } from '../../lib/useDragToMove';
import { useResizeBar } from '../../lib/useResizeBar';
import { HoverTd, StickyLabelCell } from '../PlanningCell';
import type { PlanningMemberPeriod } from '@entities/planning/core/model/planning.schema';
import { useUpdateMemberPeriod } from '@entities/planning/core/api/planning.queries';
import { MemberPeriodPopover } from './MemberPeriodPopover';
import { motion } from '@shared/ui/motion';

// ── Stable sx constants ──

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

// ====================== Component ======================

export const MemberRow = memo(function MemberRow({
    membre,
    columns,
    planningData,
    visibleRange,
}: {
    membre: Membre;
    columns: TimelineColumn[];
    planningData: PlanningData;
    visibleRange: VisibleColumnRange;
}) {
    const colors = usePlanningColors();
    const selectedYear = usePlanningStore((s) => s.selectedYear);

    const updatePeriod = useUpdateMemberPeriod();

    const rowId = memberRowId(membre.nom);
    const memberPeriods = planningData.memberPeriodsMap.get(membre.nom) ?? [];

    const [popover, setPopover] = useState<{
        anchorEl: HTMLElement;
        defaultDate: string;
        existingPeriod?: PlanningMemberPeriod;
    } | null>(null);

    // ---- Drag-to-move via shared hook ----
    const findItemAtColumn = useCallback(
        (col: TimelineColumn) => memberPeriods.find((p) => itemOverlapsColumn(p, col)),
        [memberPeriods],
    );

    const handleMove = useCallback(
        (match: PlanningMemberPeriod, dayOffset: number) => {
            const newStartDate = dayjs(match.startDate).add(dayOffset, 'day').format('YYYY-MM-DD');
            const newEndDate = dayjs(match.endDate).add(dayOffset, 'day').format('YYYY-MM-DD');

            updatePeriod.mutate({
                uuid: match.uuid,
                data: {
                    memberName: membre.nom,
                    memberRole: membre.fonction,
                    year: selectedYear,
                    periodType: match.periodType,
                    commentaire: match.commentaire,
                    startDate: newStartDate,
                    endDate: newEndDate,
                },
            });
        },
        [membre.nom, membre.fonction, selectedYear, updatePeriod],
    );

    const {
        handleCellMouseDown,
        skipNextClick: skipNextClickDrag,
        dragging,
    } = useDragToMove<PlanningMemberPeriod>({
        columns,
        findItemAtColumn,
        onMove: handleMove,
    });

    // ---- Resize via shared hook ----
    const handleResize = useCallback(
        (uuid: string, newStartDate: string, newEndDate: string) => {
            const p = memberPeriods.find((pp) => pp.uuid === uuid);
            if (!p) return;
            updatePeriod.mutate({
                uuid,
                data: {
                    memberName: membre.nom,
                    memberRole: membre.fonction,
                    year: selectedYear,
                    periodType: p.periodType,
                    commentaire: p.commentaire,
                    startDate: newStartDate,
                    endDate: newEndDate,
                },
            });
        },
        [memberPeriods, membre.nom, membre.fonction, selectedYear, updatePeriod],
    );

    const {
        resizing,
        handleResizeStart,
        skipNextClick: skipNextClickResize,
    } = useResizeBar({
        columns,
        items: memberPeriods,
        onResize: handleResize,
    });

    // Click handler: create/edit popover
    const handleCellClick = useCallback(
        (e: React.MouseEvent<HTMLTableCellElement>, col: TimelineColumn) => {
            if (skipNextClickDrag.current || skipNextClickResize.current) {
                skipNextClickDrag.current = false;
                skipNextClickResize.current = false;
                return;
            }
            const match = memberPeriods.find((p) => itemOverlapsColumn(p, col));
            setPopover({
                anchorEl: e.currentTarget,
                defaultDate: col.start.format('YYYY-MM-DD'),
                existingPeriod: match,
            });
        },
        [memberPeriods, skipNextClickDrag, skipNextClickResize],
    );

    // ── Precomputed timeline cells with column virtualization ──
    const timelineCells = useMemo(() => {
        const { startCol, endCol } = visibleRange;

        // Precompute resize preview range
        let resizePreview: { startIdx: number; endIdx: number; color: string } | null = null;
        if (resizing) {
            const p = memberPeriods.find((pp) => pp.uuid === resizing.itemId);
            if (p) {
                const meta = getPeriodeMeta(p.periodType);
                resizePreview = calculateResizePreview(
                    p,
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
                const meta = getPeriodeMeta(dragging.item.periodType);
                dragPreview = calculateDragPreview(dragging.item, columns, colDelta, meta?.color ?? colors.blue);
            }
        }

        // Precompute period-to-column mapping for O(1) lookups
        const periodByCol = new Map<number, PlanningMemberPeriod>();
        for (const p of memberPeriods) {
            for (let ci = 0; ci < columns.length; ci++) {
                if (!periodByCol.has(ci) && itemOverlapsColumn(p, columns[ci])) {
                    periodByCol.set(ci, p);
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
            const matchingPeriod = periodByCol.get(idx);
            const periodMeta = matchingPeriod ? getPeriodeMeta(matchingPeriod.periodType) : undefined;
            const barPos = matchingPeriod ? getBarPosition(matchingPeriod, columns, idx) : undefined;

            // Resize visual feedback
            const isResizedPeriod = resizing && matchingPeriod?.uuid === resizing.itemId;
            const isInResizePreview = resizePreview && idx >= resizePreview.startIdx && idx <= resizePreview.endIdx;
            const isResizePreviewStart = isInResizePreview && idx === resizePreview!.startIdx;
            const isResizePreviewEnd = isInResizePreview && idx === resizePreview!.endIdx;

            // Drag-to-move visual feedback
            const isDraggedPeriod = draggedUuid != null && matchingPeriod?.uuid === draggedUuid;
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
                        backgroundColor: col.isCurrent
                            ? colors.currentDay
                            : weekState === 'fermeture'
                              ? colors.fermeture
                              : weekState === 'vacances'
                                ? colors.vacances
                                : col.isWeekend
                                  ? colors.weekend
                                  : colors.cellBg,
                        // Surbrillance des colonnes cibles pendant un déplacement
                        boxShadow: isInDragPreview ? `inset 0 0 0 100px ${colors.dragHighlight}` : undefined,
                        cursor: matchingPeriod ? 'grab' : 'pointer',
                        height: 32,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: 10,
                        userSelect: 'none',
                    }}
                >
                    {matchingPeriod && periodMeta && barPos && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: barPos === 'start' || barPos === 'single' ? 2 : 0,
                                right: barPos === 'end' || barPos === 'single' ? 2 : 0,
                                bgcolor: periodMeta.color,
                                borderRadius: getBarBorderRadius(barPos),
                                overflow: 'hidden',
                                opacity: isResizedPeriod || isDraggedPeriod ? 0.3 : 0.85,
                                pointerEvents: 'none',
                                transition: `opacity ${motion.fast}`,
                            }}
                        >
                            {/* Resize handles */}
                            {!resizing && (barPos === 'start' || barPos === 'single') && (
                                <Box
                                    onMouseDown={(e) => handleResizeStart(e, matchingPeriod, 'start', idx)}
                                    sx={resizeHandleStartSx}
                                />
                            )}
                            {!resizing && (barPos === 'end' || barPos === 'single') && (
                                <Box
                                    onMouseDown={(e) => handleResizeStart(e, matchingPeriod, 'end', idx)}
                                    sx={resizeHandleEndSx}
                                />
                            )}
                        </Box>
                    )}

                    {/* Centered label — outside bar to avoid overflow:hidden clipping */}
                    {matchingPeriod && periodMeta && (barPos === 'start' || barPos === 'single') && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 3,
                                bottom: 3,
                                left: 0,
                                width: `${getBarSpanCount(matchingPeriod, columns) * 100}%`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                {matchingPeriod.commentaire && (
                                    <Tooltip title={matchingPeriod.commentaire} arrow>
                                        <NotesOutlined sx={notesIconSx} />
                                    </Tooltip>
                                )}
                                <Typography fontSize={9} fontWeight={600} color="#fff" noWrap>
                                    {periodMeta.label}
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
                                border: '1px dashed rgba(255,255,255,0.6)',
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
        memberPeriods,
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
            <StickyLabelCell bold role="rowheader">
                {membre.nom}
            </StickyLabelCell>
            <StickyLabelCell isSubLabel role="gridcell">
                <Typography fontSize={11} fontWeight={600} color={colors.textSecondary} noWrap>
                    {membre.fonction}
                </Typography>
            </StickyLabelCell>

            {/* Timeline cells */}
            {timelineCells}

            {/* Popover */}
            {popover && (
                <MemberPeriodPopover
                    anchorEl={popover.anchorEl}
                    existingPeriod={popover.existingPeriod}
                    defaultDate={popover.defaultDate}
                    memberName={membre.nom}
                    memberRole={membre.fonction}
                    year={selectedYear}
                    onClose={() => setPopover(null)}
                />
            )}
        </tr>
    );
});
