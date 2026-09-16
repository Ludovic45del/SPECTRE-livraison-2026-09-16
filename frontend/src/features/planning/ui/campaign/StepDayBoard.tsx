/**
 * StepDayBoard — mini-grille JOURNALIÈRE de planification d'une étape.
 *
 * Réutilise la mécanique de StepLanesRow (assignLanes + getBarPosition +
 * useDragToMove + useResizeBar + ghost preview) mais sur des colonnes-jour
 * (useDayColumns), ce qui donne le déplacement et le resize multi-jours.
 *
 * Le rendu sépare deux couches :
 *  - segments par cellule (dans les `<td>`), porteurs du fond, des poignées de
 *    resize, du bouton × et de l'interaction (drag/drop/resize via data-col-index) ;
 *  - une couche label superposée (pointer-events: none) positionnée en %, qui
 *    centre le nom de la FSEC sur TOUTE la largeur de la barre (fusion multi-jours).
 */
import { memo, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Check } from '@mui/icons-material';
import dayjs from 'dayjs';
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
import type { FsecDropProps } from '../../lib/useFsecDrag';
import { HoverTd } from '../PlanningCell';
import type { FsecInfo } from './types';

/** Largeur minimale d'une colonne-jour (au-delà, les colonnes s'étirent pour remplir). */
const MIN_COL_W = 46;
/** Hauteur de l'en-tête de jours (sert à décaler la couche label). */
const THEAD_H = 32;
const BAR_GAP = 3;

const resizeHandleBaseSx = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 7,
    cursor: 'col-resize',
    pointerEvents: 'auto',
    zIndex: 3,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
} as const;
const resizeHandleStartSx = { ...resizeHandleBaseSx, left: 0, borderRadius: '6px 0 0 6px' } as const;
const resizeHandleEndSx = { ...resizeHandleBaseSx, right: 0, borderRadius: '0 6px 6px 0' } as const;

interface StepDayBoardProps {
    etape: Etape;
    etapeFsecs: FsecInfo[];
    stepsForEtape: PlanningCampaignStep[];
    columns: TimelineColumn[];
    weekStatesMap: Map<number, 'vacances' | 'fermeture'>;
    dropProps: FsecDropProps;
    onMove: (step: PlanningCampaignStep, dayOffset: number) => void;
    onResize: (uuid: string, newStartDate: string, newEndDate: string) => void;
    onDeleteStep: (uuid: string) => void;
}

export const StepDayBoard = memo(function StepDayBoard({
    etape,
    etapeFsecs,
    stepsForEtape,
    columns,
    weekStatesMap,
    dropProps,
    onMove,
    onResize,
    onDeleteStep,
}: StepDayBoardProps) {
    const colors = usePlanningColors();
    const colCount = columns.length;

    const { laneByStep, laneCount } = useMemo(() => assignLanes(stepsForEtape), [stepsForEtape]);
    const rowHeight = laneRowHeight(laneCount);
    const fsecByUuid = useMemo(() => new Map(etapeFsecs.map((f) => [f.versionUuid, f])), [etapeFsecs]);

    /** Indices de première/dernière colonne couvertes par chaque step (pour la fusion du label). */
    const stepBounds = useMemo(() => {
        const m = new Map<string, { first: number; last: number }>();
        for (const step of stepsForEtape) {
            let first = -1;
            let last = -1;
            for (let i = 0; i < columns.length; i++) {
                if (itemOverlapsColumn(step, columns[i])) {
                    if (first === -1) first = i;
                    last = i;
                }
            }
            if (first !== -1) m.set(step.uuid, { first, last });
        }
        return m;
    }, [stepsForEtape, columns]);

    const { handleItemMouseDown, dragging } = useDragToMove<PlanningCampaignStep>({
        columns,
        findItemAtColumn: useCallback(() => undefined, []),
        onMove,
    });
    const { resizing, handleResizeStart } = useResizeBar({ columns, items: stepsForEtape, onResize });

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
    const dragBarHeight = LANE_HEIGHT - 2 * BAR_GAP;

    return (
        <Box sx={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: 1 }} {...dropProps}>
            <Box sx={{ position: 'relative', minWidth: colCount * MIN_COL_W }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{
                                        height: THEAD_H,
                                        boxSizing: 'border-box',
                                        padding: '2px 0',
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: col.isCurrent
                                            ? colors.currentDay
                                            : col.isWeekend
                                              ? colors.weekend
                                              : colors.headerBg,
                                        fontSize: 9,
                                        fontWeight: 600,
                                        color: colors.textSecondary,
                                        lineHeight: 1.2,
                                    }}
                                >
                                    <div>{col.start.format('dd')}</div>
                                    <div style={{ fontSize: 11, color: colors.textPrimary }}>{col.label}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {columns.map((col, idx) => {
                                const weekState = resolveWeekState(col, weekStatesMap);
                                const isInDragPreview =
                                    dragPreview != null && idx >= dragPreview.startIdx && idx <= dragPreview.endIdx;
                                const bars: React.ReactNode[] = [];
                                // Fusion façon Vie Labo : on retire la bordure verticale là où une
                                // barre traverse, pour qu'elle paraisse continue d'une cellule à l'autre.
                                let dropLeftBorder = false;
                                let dropRightBorder = false;

                                for (const step of stepsForEtape) {
                                    if (!itemOverlapsColumn(step, col)) continue;
                                    const bounds = stepBounds.get(step.uuid);
                                    const lane = laneByStep.get(step.uuid) ?? 0;
                                    const barPos = getBarPosition(step, columns, idx);
                                    if (barPos === 'middle' || barPos === 'end') dropLeftBorder = true;
                                    if (barPos === 'start' || barPos === 'middle') dropRightBorder = true;
                                    const fsec = fsecByUuid.get(step.fsecUuid);
                                    const isDone = fsec ? isFsecStepDone(fsec, etape) : false;
                                    const isResizedStep = resizing?.itemId === step.uuid;
                                    const isDraggedStep = step.uuid === draggedUuid;
                                    const top = lane * LANE_HEIGHT + LANE_ROW_VPAD + BAR_GAP;
                                    const barHeight = LANE_HEIGHT - 2 * BAR_GAP;
                                    const isStart = idx === bounds?.first;
                                    const isEnd = idx === bounds?.last;

                                    bars.push(
                                        <Box
                                            key={step.uuid}
                                            onMouseDown={(e) => handleItemMouseDown(e, step, idx)}
                                            sx={{
                                                position: 'absolute',
                                                top,
                                                height: barHeight,
                                                left: isStart ? 2 : 0,
                                                right: isEnd ? 2 : 0,
                                                bgcolor: isDone ? '#4caf50' : etape.color,
                                                borderRadius: getBarBorderRadius(barPos),
                                                cursor: 'grab',
                                                opacity: isResizedStep || isDraggedStep ? 0.3 : 0.85,
                                                zIndex: 2,
                                            }}
                                        >
                                            {isEnd && (
                                                <IconButton
                                                    size="small"
                                                    aria-label={`Supprimer ${fsec?.displayName ?? 'le step'}`}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteStep(step.uuid);
                                                    }}
                                                    sx={{
                                                        position: 'absolute',
                                                        right: 2,
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        p: 0,
                                                        color: '#fff',
                                                        zIndex: 5,
                                                        '&:hover': { opacity: 0.7 },
                                                    }}
                                                >
                                                    <CloseIcon sx={{ fontSize: 12 }} />
                                                </IconButton>
                                            )}
                                            {!resizing && isStart && (
                                                <Box
                                                    onMouseDown={(e) => handleResizeStart(e, step, 'start', idx)}
                                                    sx={resizeHandleStartSx}
                                                />
                                            )}
                                            {!resizing && isEnd && (
                                                <Box
                                                    onMouseDown={(e) => handleResizeStart(e, step, 'end', idx)}
                                                    sx={resizeHandleEndSx}
                                                />
                                            )}
                                        </Box>,
                                    );

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
                                                            gStart && gEnd
                                                                ? '6px'
                                                                : gStart
                                                                  ? '6px 0 0 6px'
                                                                  : gEnd
                                                                    ? '0 6px 6px 0'
                                                                    : '0',
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

                                return (
                                    <HoverTd
                                        key={col.key}
                                        role="gridcell"
                                        data-col-index={idx}
                                        style={{
                                            position: 'relative',
                                            height: rowHeight,
                                            padding: 0,
                                            borderTop: `1px solid ${colors.border}`,
                                            borderBottom: `1px solid ${colors.border}`,
                                            borderLeft: dropLeftBorder ? 'none' : `1px solid ${colors.border}`,
                                            borderRight: dropRightBorder ? 'none' : `1px solid ${colors.border}`,
                                            boxShadow: isInDragPreview
                                                ? `inset 0 0 0 100px ${colors.dragHighlight}`
                                                : undefined,
                                            backgroundColor: col.isCurrent
                                                ? colors.currentDay
                                                : weekState === 'fermeture'
                                                  ? colors.fermeture
                                                  : weekState === 'vacances'
                                                    ? colors.vacances
                                                    : col.isWeekend
                                                      ? colors.weekend
                                                      : colors.cellBg,
                                            userSelect: 'none',
                                        }}
                                    >
                                        {bars}
                                    </HoverTd>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>

                {/* Couche label superposée : nom centré sur toute la largeur de la barre (fusion).
                    z-index > segments (2) / ghost (3) pour ne pas passer derrière les barres. */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: THEAD_H,
                        left: 0,
                        right: 0,
                        height: rowHeight,
                        pointerEvents: 'none',
                        zIndex: 4,
                    }}
                >
                    {stepsForEtape.map((step) => {
                        const bounds = stepBounds.get(step.uuid);
                        if (!bounds) return null;
                        const fsec = fsecByUuid.get(step.fsecUuid);
                        const isDone = fsec ? isFsecStepDone(fsec, etape) : false;
                        const lane = laneByStep.get(step.uuid) ?? 0;
                        const top = lane * LANE_HEIGHT + LANE_ROW_VPAD + BAR_GAP;
                        const barHeight = LANE_HEIGHT - 2 * BAR_GAP;
                        const left = (bounds.first / colCount) * 100;
                        const width = ((bounds.last - bounds.first + 1) / colCount) * 100;
                        return (
                            <Box
                                key={step.uuid}
                                sx={{
                                    position: 'absolute',
                                    top,
                                    height: barHeight,
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.3,
                                    px: 2,
                                    overflow: 'hidden',
                                    opacity: step.uuid === draggedUuid ? 0.3 : 1,
                                }}
                            >
                                {isDone && <Check sx={{ fontSize: 12, color: '#fff', flexShrink: 0 }} />}
                                <Typography noWrap sx={{ fontSize: 9, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
                                    {fsec?.displayName}
                                </Typography>
                            </Box>
                        );
                    })}

                    {/* Drag-to-move ghost: barre fantôme ombrée à l'emplacement de dépôt */}
                    {dragPreview && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: draggedTop,
                                height: dragBarHeight,
                                left: `${(dragPreview.startIdx / colCount) * 100}%`,
                                width: `${((dragPreview.endIdx - dragPreview.startIdx + 1) / colCount) * 100}%`,
                                bgcolor: dragPreview.color,
                                borderRadius: '6px',
                                opacity: 0.75,
                                border: '1px dashed rgba(255,255,255,0.85)',
                                boxShadow: DRAG_GHOST_SHADOW,
                            }}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
});

/** Décale les dates d'un step de `dayOffset` jours et renvoie le nouveau couple. */
export function shiftStepDates(
    step: PlanningCampaignStep,
    dayOffset: number,
): { startDate: string; endDate: string } | null {
    if (!step.startDate || !step.endDate) return null;
    return {
        startDate: dayjs(step.startDate).add(dayOffset, 'day').format('YYYY-MM-DD'),
        endDate: dayjs(step.endDate).add(dayOffset, 'day').format('YYYY-MM-DD'),
    };
}
