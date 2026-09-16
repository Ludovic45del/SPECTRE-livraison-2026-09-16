/**
 * StepHeaderRow — Ligne d'en-tête d'étape avec barre agrégée et progression.
 * Supports column virtualization via CampaignContext.visibleRange.
 */
import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { softChipSx } from '@shared/lib';
import { ChevronRight, ExpandMore } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';
import type { Etape } from '../../lib/planning.constants';
import { usePlanningColors } from '../../lib/planning.hooks';
import { usePlanningStore } from '../../lib/planning.store';
import { type TimelineColumn, isFsecStepDone } from '../../lib/planning.utils';
import { resolveWeekState } from '../../lib/planning.grid-utils';
import { getBarBorderRadius } from '../../lib/planning.bar-utils';
import { HoverTd, StickyLabelCell } from '../PlanningCell';
import { useCampaignContext } from './CampaignContext';
import type { FsecInfo } from './types';

// ====================== Helpers ======================

/** Compute aggregate min start / max end for a set of steps */
export function computeAggregateRange(steps: PlanningCampaignStep[]): { startDate: string; endDate: string } | null {
    const withDates = steps.filter((s) => s.startDate && s.endDate);
    if (withDates.length === 0) return null;
    let minStart = withDates[0].startDate!;
    let maxEnd = withDates[0].endDate!;
    for (const s of withDates) {
        if (s.startDate! < minStart) minStart = s.startDate!;
        if (s.endDate! > maxEnd) maxEnd = s.endDate!;
    }
    return { startDate: minStart, endDate: maxEnd };
}

export function aggregateOverlapsColumn(agg: { startDate: string; endDate: string }, col: TimelineColumn): boolean {
    const sStart = dayjs(agg.startDate);
    const sEnd = dayjs(agg.endDate);
    return !col.end.isBefore(sStart, 'day') && !col.start.isAfter(sEnd, 'day');
}

// ====================== Types ======================

interface StepHeaderRowProps {
    etape: Etape;
    showCampaignName: boolean;
    campaignRowSpan: number;
    isCollapsed: boolean;
    stepsForEtape: PlanningCampaignStep[];
    campaignFsecs: FsecInfo[];
}

// ====================== Component ======================

export function StepHeaderRow({
    etape,
    showCampaignName,
    campaignRowSpan,
    isCollapsed,
    stepsForEtape,
    campaignFsecs,
}: StepHeaderRowProps) {
    const { campagne, columns, planningData, visibleRange, onNavigate, onOpenStepDialog } = useCampaignContext();
    const colors = usePlanningColors();
    const toggleStepGroup = usePlanningStore((s) => s.toggleStepGroup);

    const { startCol, endCol } = visibleRange;

    // Aggregate range for header bar
    const aggregateRange = useMemo(() => computeAggregateRange(stepsForEtape), [stepsForEtape]);

    // Progression: count how many FSECs are "done" out of total
    const hasProgress = etape.minStatusForDone != null || etape.useShootingDate;
    const totalFsecs = campaignFsecs.length;
    const doneCount = useMemo(() => {
        if (!hasProgress) return 0;
        return campaignFsecs.filter((f) => isFsecStepDone(f, etape)).length;
    }, [campaignFsecs, etape, hasProgress]);
    // Count FSECs that have a matching step (step.fsecUuid référence la version FSEC).
    const scheduledFsecCount = useMemo(() => {
        const scheduled = new Set(stepsForEtape.map((s) => s.fsecUuid));
        return campaignFsecs.filter((f) => scheduled.has(f.versionUuid)).length;
    }, [stepsForEtape, campaignFsecs]);

    const allDone = hasProgress && totalFsecs > 0 && doneCount === totalFsecs;

    // Build timeline cells with column virtualization
    const timelineCells = useMemo(() => {
        const cells: React.ReactNode[] = [];

        // Left spacer
        if (startCol > 0) {
            cells.push(<td key="spacer-left" colSpan={startCol} style={{ padding: 0, border: 'none', height: 28 }} />);
        }

        // Visible columns
        for (let idx = startCol; idx <= endCol && idx < columns.length; idx++) {
            const col = columns[idx];
            const weekState = resolveWeekState(col, planningData.weekStatesMap);

            const inRange = aggregateRange ? aggregateOverlapsColumn(aggregateRange, col) : false;

            // Compute bar position for the aggregate
            let barPos: 'start' | 'middle' | 'end' | 'single' | undefined;
            if (inRange && aggregateRange) {
                const isFirst = idx === 0 || !aggregateOverlapsColumn(aggregateRange, columns[idx - 1]);
                const isLast = idx === columns.length - 1 || !aggregateOverlapsColumn(aggregateRange, columns[idx + 1]);
                if (isFirst && isLast) barPos = 'single';
                else if (isFirst) barPos = 'start';
                else if (isLast) barPos = 'end';
                else barPos = 'middle';
            }

            cells.push(
                <HoverTd
                    key={col.key}
                    role="gridcell"
                    onMouseDown={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                    onClick={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        e.stopPropagation();
                        onOpenStepDialog(etape, col.start.format('YYYY-MM-DD'));
                    }}
                    style={{
                        position: 'relative',
                        padding: 0,
                        height: 28,
                        borderTop: `2px solid ${colors.borderStrong}`,
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
                                  : colors.sectionBg,
                        userSelect: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {barPos && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 10,
                                bottom: 10,
                                left: barPos === 'start' || barPos === 'single' ? 2 : 0,
                                right: barPos === 'end' || barPos === 'single' ? 2 : 0,
                                bgcolor: allDone ? '#4caf50' : etape.color,
                                borderRadius: getBarBorderRadius(barPos),
                                opacity: 0.55,
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                </HoverTd>,
            );
        }

        // Right spacer
        const rightSpacerCols = columns.length - 1 - endCol;
        if (rightSpacerCols > 0) {
            cells.push(
                <td key="spacer-right" colSpan={rightSpacerCols} style={{ padding: 0, border: 'none', height: 28 }} />,
            );
        }

        return cells;
    }, [
        columns,
        startCol,
        endCol,
        aggregateRange,
        allDone,
        etape,
        colors,
        planningData.weekStatesMap,
        onOpenStepDialog,
    ]);

    return (
        <tr role="row">
            {showCampaignName && (
                <StickyLabelCell bold rowSpan={campaignRowSpan} onClick={onNavigate}>
                    <Typography fontSize={13} fontWeight={600} noWrap>
                        {campagne.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.3, mt: 0.5, flexWrap: 'wrap' }}>
                        {campagne.installation?.label && (
                            <Chip
                                label={campagne.installation.label}
                                sx={softChipSx(campagne.installation.color ?? '#666')}
                            />
                        )}
                    </Box>
                </StickyLabelCell>
            )}
            <StickyLabelCell
                isSubLabel
                isHeader
                accentColor={etape.color}
                onClick={() => toggleStepGroup(campagne.uuid, etape.label)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, cursor: 'pointer' }}>
                    {isCollapsed ? (
                        <ChevronRight sx={{ fontSize: 16, color: colors.textSecondary }} />
                    ) : (
                        <ExpandMore sx={{ fontSize: 16, color: colors.textSecondary }} />
                    )}
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: etape.color, flexShrink: 0 }} />
                    <Typography fontSize={11} fontWeight={600} noWrap sx={{ flex: 1 }}>
                        {etape.label}
                    </Typography>
                    {totalFsecs > 0 && (
                        <Chip
                            label={hasProgress ? `${doneCount}/${totalFsecs}` : `${scheduledFsecCount}/${totalFsecs}`}
                            sx={softChipSx(allDone ? '#4caf50' : etape.color)}
                        />
                    )}
                </Box>
            </StickyLabelCell>

            {/* Aggregate bar (thin, translucent) with column virtualization */}
            {timelineCells}
        </tr>
    );
}
