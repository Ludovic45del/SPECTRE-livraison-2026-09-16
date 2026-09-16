/**
 * StepLanesRow — Ligne unique d'une étape dépliée : les barres FSEC s'empilent
 * sur des couloirs (lane packing) au lieu d'occuper chacune une ligne entière.
 *
 * Remplace l'ancienne boucle de `FsecRow` (une ligne pleine par FSEC).
 * Drag-to-move et resize sur place ; le clic ouvre la modale de planification.
 */
import { memo, useCallback, useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { Check } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useUpdateCampaignStep } from '@entities/planning/core/api/planning.queries';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';
import type { Etape } from '../../lib/planning.constants';
import { DRAG_GHOST_SHADOW } from '../../lib/planning.constants';
import { usePlanningColors } from '../../lib/planning.hooks';
import { type TimelineColumn, isFsecStepDone } from '../../lib/planning.utils';
import { resolveWeekState } from '../../lib/planning.grid-utils';
import {
    itemOverlapsColumn,
    getBarPosition,
    getBarBorderRadius,
    calculateResizePreview,
    calculateDragPreview,
} from '../../lib/planning.bar-utils';
import { assignLanes, LANE_HEIGHT, LANE_ROW_VPAD, laneRowHeight } from '../../lib/planning.lane-utils';
import { useDragToMove } from '../../lib/useDragToMove';
import { useResizeBar } from '../../lib/useResizeBar';
import { HoverTd, StickyLabelCell } from '../PlanningCell';
import { useCampaignContext } from './CampaignContext';
import type { FsecInfo } from './types';

// ── Constants ──

/** Marge verticale d'une barre à l'intérieur de son couloir. */
const BAR_GAP = 3;

const resizeHandleBaseSx = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    cursor: 'col-resize',
    pointerEvents: 'auto',
    zIndex: 3,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
} as const;

const resizeHandleStartSx = { ...resizeHandleBaseSx, left: 0, borderRadius: '6px 0 0 6px' } as const;
const resizeHandleEndSx = { ...resizeHandleBaseSx, right: 0, borderRadius: '0 6px 6px 0' } as const;

// ====================== Types ======================

interface StepLanesRowProps {
    etape: Etape;
    /** FSEC de la campagne concernées par cette étape. */
    etapeFsecs: FsecInfo[];
    /** Steps programmés de cette étape (campagne + étape). */
    stepsForEtape: PlanningCampaignStep[];
}

// ====================== Component ======================

export const StepLanesRow = memo(function StepLanesRow({ etape, etapeFsecs, stepsForEtape }: StepLanesRowProps) {
    const { columns, planningData, visibleRange, onOpenStepDialog } = useCampaignContext();
    const colors = usePlanningColors();
    const updateStep = useUpdateCampaignStep();

    // ── Lane packing ──
    const { laneByStep, laneCount } = useMemo(() => assignLanes(stepsForEtape), [stepsForEtape]);
    const rowHeight = laneRowHeight(laneCount);

    // ── Lookups ──
    const fsecByUuid = useMemo(() => new Map(etapeFsecs.map((f) => [f.versionUuid, f])), [etapeFsecs]);
    const stepByFsec = useMemo(() => new Map(stepsForEtape.map((s) => [s.fsecUuid, s])), [stepsForEtape]);

    // ── Drag-to-move ──
    const onMove = useCallback(
        (step: PlanningCampaignStep, dayOffset: number) => {
            if (!step.startDate || !step.endDate) return;
            updateStep.mutate({
                uuid: step.uuid,
                data: {
                    campaignUuid: step.campaignUuid,
                    fsecUuid: step.fsecUuid,
                    stepLabel: step.stepLabel,
                    year: step.year,
                    startDate: dayjs(step.startDate).add(dayOffset, 'day').format('YYYY-MM-DD'),
                    endDate: dayjs(step.endDate).add(dayOffset, 'day').format('YYYY-MM-DD'),
                },
            });
        },
        [updateStep],
    );
    const { handleItemMouseDown, skipNextClick, dragging } = useDragToMove<PlanningCampaignStep>({
        columns,
        findItemAtColumn: useCallback(() => undefined, []),
        onMove,
    });

    // ── Resize ──
    const onResize = useCallback(
        (uuid: string, newStart: string, newEnd: string) => {
            const step = stepsForEtape.find((s) => s.uuid === uuid);
            if (!step) return;
            updateStep.mutate({
                uuid,
                data: {
                    campaignUuid: step.campaignUuid,
                    fsecUuid: step.fsecUuid,
                    stepLabel: step.stepLabel,
                    year: step.year,
                    startDate: newStart,
                    endDate: newEnd,
                },
            });
        },
        [stepsForEtape, updateStep],
    );
    const {
        resizing,
        handleResizeStart,
        skipNextClick: skipNextClickResize,
    } = useResizeBar({
        columns,
        items: stepsForEtape,
        onResize,
    });

    const consumeSkip = useCallback(() => {
        if (skipNextClick.current || skipNextClickResize.current) {
            skipNextClick.current = false;
            skipNextClickResize.current = false;
            return true;
        }
        return false;
    }, [skipNextClick, skipNextClickResize]);

    // ── Click handlers ──
    const handleBarClick = useCallback(
        (e: React.MouseEvent<HTMLElement>, step: PlanningCampaignStep, col: TimelineColumn) => {
            e.stopPropagation();
            if (consumeSkip()) return;
            onOpenStepDialog(etape, step.startDate ?? col.start.format('YYYY-MM-DD'));
        },
        [consumeSkip, onOpenStepDialog, etape],
    );

    const handleEmptyClick = useCallback(
        (_e: React.MouseEvent<HTMLTableCellElement>, col: TimelineColumn) => {
            if (consumeSkip()) return;
            onOpenStepDialog(etape, col.start.format('YYYY-MM-DD'));
        },
        [consumeSkip, onOpenStepDialog, etape],
    );

    // ── Timeline cells ──
    const { startCol, endCol } = visibleRange;
    const timelineCells = useMemo(() => {
        const cells: React.ReactNode[] = [];

        // ── Drag-to-move preview (toute la barre glisse de colDelta colonnes) ──
        let dragPreview: { startIdx: number; endIdx: number; color: string } | null = null;
        let draggedUuid: string | null = null;
        let draggedTop = 0;
        if (dragging) {
            const colDelta = dragging.currentColIdx - dragging.originColIdx;
            if (colDelta !== 0) {
                draggedUuid = dragging.item.uuid;
                const lane = laneByStep.get(dragging.item.uuid) ?? 0;
                draggedTop = lane * LANE_HEIGHT + LANE_ROW_VPAD + BAR_GAP;
                const fsec = fsecByUuid.get(dragging.item.fsecUuid);
                const ghostColor = fsec && isFsecStepDone(fsec, etape) ? '#4caf50' : etape.color;
                dragPreview = calculateDragPreview(dragging.item, columns, colDelta, ghostColor);
            }
        }
        const dragSpan = dragPreview ? dragPreview.endIdx - dragPreview.startIdx + 1 : 0;
        const dragBarHeight = LANE_HEIGHT - 2 * BAR_GAP;

        if (startCol > 0) {
            cells.push(
                <td key="spacer-left" colSpan={startCol} style={{ padding: 0, border: 'none', height: rowHeight }} />,
            );
        }

        for (let idx = startCol; idx <= endCol && idx < columns.length; idx++) {
            const col = columns[idx];
            const weekState = resolveWeekState(col, planningData.weekStatesMap);

            const bars: React.ReactNode[] = [];
            for (const step of stepsForEtape) {
                if (!itemOverlapsColumn(step, col)) continue;
                const lane = laneByStep.get(step.uuid) ?? 0;
                const barPos = getBarPosition(step, columns, idx);
                const fsec = fsecByUuid.get(step.fsecUuid);
                const isDone = fsec ? isFsecStepDone(fsec, etape) : false;
                const isResizedStep = resizing?.itemId === step.uuid;
                const isDraggedStep = step.uuid === draggedUuid;
                const top = lane * LANE_HEIGHT + LANE_ROW_VPAD + BAR_GAP;
                const barHeight = LANE_HEIGHT - 2 * BAR_GAP;
                const isEdge = barPos === 'start' || barPos === 'single';
                const isEndEdge = barPos === 'end' || barPos === 'single';

                bars.push(
                    <Box
                        key={step.uuid}
                        onMouseDown={(e) => handleItemMouseDown(e, step, idx)}
                        onClick={(e) => handleBarClick(e, step, col)}
                        sx={{
                            position: 'absolute',
                            top,
                            height: barHeight,
                            left: isEdge ? 2 : 0,
                            right: isEndEdge ? 2 : 0,
                            bgcolor: isDone ? '#4caf50' : etape.color,
                            borderRadius: getBarBorderRadius(barPos),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                            px: 0.5,
                            overflow: 'hidden',
                            cursor: 'grab',
                            opacity: isResizedStep || isDraggedStep ? 0.3 : 1,
                            zIndex: 2,
                        }}
                    >
                        {isEdge && isDone && <Check sx={{ fontSize: 12, color: '#fff', flexShrink: 0 }} />}
                        {isEdge && fsec && (
                            <Typography
                                noWrap
                                sx={{ fontSize: 10, fontWeight: 600, color: colors.barText, lineHeight: 1 }}
                            >
                                {fsec.displayName}
                            </Typography>
                        )}
                        {!resizing && isEdge && (
                            <Box
                                onMouseDown={(e) => handleResizeStart(e, step, 'start', idx)}
                                sx={resizeHandleStartSx}
                            />
                        )}
                        {!resizing && isEndEdge && (
                            <Box onMouseDown={(e) => handleResizeStart(e, step, 'end', idx)} sx={resizeHandleEndSx} />
                        )}
                    </Box>,
                );

                // Resize preview ghost
                if (isResizedStep && resizing) {
                    const preview = calculateResizePreview(
                        step,
                        columns,
                        resizing.edge,
                        resizing.currentColIdx,
                        etape.color,
                    );
                    if (preview && idx >= preview.startIdx && idx <= preview.endIdx) {
                        const gStart = idx === preview.startIdx;
                        const gEnd = idx === preview.endIdx;
                        bars.push(
                            <Box
                                key={`${step.uuid}-ghost`}
                                sx={{
                                    position: 'absolute',
                                    top,
                                    height: barHeight,
                                    left: gStart ? 2 : 0,
                                    right: gEnd ? 2 : 0,
                                    bgcolor: preview.color,
                                    borderRadius:
                                        gStart && gEnd ? '6px' : gStart ? '6px 0 0 6px' : gEnd ? '0 6px 6px 0' : '0',
                                    opacity: 0.5,
                                    border: '1px dashed rgba(255,255,255,0.6)',
                                    pointerEvents: 'none',
                                    zIndex: 3,
                                }}
                            />,
                        );
                    }
                }
            }

            // Drag-to-move ghost: barre fantôme ombrée à l'emplacement de dépôt
            const isInDragPreview = dragPreview != null && idx >= dragPreview.startIdx && idx <= dragPreview.endIdx;
            if (dragPreview && idx === dragPreview.startIdx) {
                bars.push(
                    <Box
                        key="drag-ghost"
                        sx={{
                            position: 'absolute',
                            top: draggedTop,
                            height: dragBarHeight,
                            left: 2,
                            width: `calc(${dragSpan * 100}% - 4px)`,
                            bgcolor: dragPreview.color,
                            borderRadius: '6px',
                            opacity: 0.75,
                            border: '1px dashed rgba(255,255,255,0.85)',
                            boxShadow: DRAG_GHOST_SHADOW,
                            pointerEvents: 'none',
                            zIndex: 4,
                        }}
                    />,
                );
            }

            cells.push(
                <HoverTd
                    key={col.key}
                    role="gridcell"
                    data-col-index={idx}
                    onClick={(e) => handleEmptyClick(e, col)}
                    style={{
                        position: 'relative',
                        padding: 0,
                        height: rowHeight,
                        border: `1px solid ${colors.border}`,
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
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                >
                    {bars}
                </HoverTd>,
            );
        }

        const rightSpacerCols = columns.length - 1 - endCol;
        if (rightSpacerCols > 0) {
            cells.push(
                <td
                    key="spacer-right"
                    colSpan={rightSpacerCols}
                    style={{ padding: 0, border: 'none', height: rowHeight }}
                />,
            );
        }

        return cells;
    }, [
        startCol,
        endCol,
        columns,
        rowHeight,
        stepsForEtape,
        laneByStep,
        fsecByUuid,
        etape,
        resizing,
        dragging,
        colors,
        planningData.weekStatesMap,
        handleItemMouseDown,
        handleBarClick,
        handleEmptyClick,
        handleResizeStart,
    ]);

    const scheduledCount = stepByFsec.size;

    return (
        <tr role="row">
            <StickyLabelCell isSubLabel accentColor={etape.color}>
                <Tooltip title="Cliquer une zone vide pour planifier une FSEC" placement="right">
                    <Typography fontSize={10} color="text.disabled" sx={{ pl: 2, fontStyle: 'italic' }}>
                        {scheduledCount}/{etapeFsecs.length} FSEC
                    </Typography>
                </Tooltip>
            </StickyLabelCell>

            {timelineCells}
        </tr>
    );
});
