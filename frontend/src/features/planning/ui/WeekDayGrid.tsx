/**
 * WeekDayGrid — Shared day-level grid for a single week (Lun→Ven).
 * Used by both WeekRecapPopover (any week, dialog) and WeeklyPlanningPreview (current week, home page).
 * Read-only, no mutations.
 */
import { useMemo } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { useCampaigns } from '@entities/campaign/core/api/campaign.queries';
import { CAMPAIGN_INSTALLATIONS } from '@entities/campaign';
import { softChipSx } from '@shared/lib';
import { paths } from '@shared/config';
import {
    useCampaignSteps,
    useLabEvents,
    useMemberPeriods,
    usePlanningSteps,
    useWeekStates,
} from '@entities/planning/core/api/planning.queries';
import type {
    PlanningCampaignStep,
    PlanningMemberPeriod,
    LabEvent,
} from '@entities/planning/core/model/planning.schema';
import { getEventCategoryMeta, getPeriodeMeta, type PlanningColors } from '../lib/planning.constants';
import { usePlanningColors } from '../lib/planning.hooks';
import { usePlanningLabSalles } from '../lib/planning.lab';

// ====================== Types ======================

interface WeekDayGridProps {
    weekNum: number;
    year: number;
    /** Called when user clicks a campaign label. Defaults to react-router navigate. */
    onCampaignClick?: (campaignUuid: string) => void;
}

// ====================== Day columns ======================

const DAYS = 5;
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const LABEL_W = 150;
const ROW_H = 28;

interface DayCol {
    key: string;
    shortLabel: string;
    dateLabel: string;
    date: dayjs.Dayjs;
    isToday: boolean;
}

function computeDayColumns(weekNum: number, year: number): DayCol[] {
    const now = dayjs();
    const monday = dayjs(`${year}-01-04`).isoWeek(weekNum).startOf('isoWeek');
    const cols: DayCol[] = [];

    for (let i = 0; i < DAYS; i++) {
        const d = monday.add(i, 'day');
        cols.push({
            key: `d-${d.format('YYYY-MM-DD')}`,
            shortLabel: DAY_LABELS[i],
            dateLabel: d.format('D MMM'),
            date: d,
            isToday: d.isSame(now, 'day'),
        });
    }
    return cols;
}

// ====================== Helpers ======================

function dayOverlaps(startDate: string | null, endDate: string | null, col: DayCol): boolean {
    if (!startDate || !endDate) return false;
    const s = dayjs(startDate);
    const e = dayjs(endDate);
    return !col.date.isAfter(e, 'day') && !col.date.isBefore(s, 'day');
}

type BarPos = 'start' | 'middle' | 'end' | 'single';

function barPosition(startDate: string | null, endDate: string | null, cols: DayCol[], idx: number): BarPos {
    const prevOverlap = idx > 0 && dayOverlaps(startDate, endDate, cols[idx - 1]);
    const nextOverlap = idx < cols.length - 1 && dayOverlaps(startDate, endDate, cols[idx + 1]);
    if (!prevOverlap && !nextOverlap) return 'single';
    if (!prevOverlap) return 'start';
    if (!nextOverlap) return 'end';
    return 'middle';
}

function barRadius(pos: BarPos): string {
    switch (pos) {
        case 'single':
            return '5px';
        case 'start':
            return '5px 0 0 5px';
        case 'end':
            return '0 5px 5px 0';
        case 'middle':
            return '0';
    }
}

// ====================== Main Component ======================

export function WeekDayGrid({ weekNum, year, onCampaignClick }: WeekDayGridProps) {
    const c = usePlanningColors();
    const navigate = useNavigate();
    const columns = useMemo(() => computeDayColumns(weekNum, year), [weekNum, year]);

    // Fetch data
    const { data: campaigns = [] } = useCampaigns();
    const { data: weekStates = [] } = useWeekStates(year);
    const { data: memberPeriods = [] } = useMemberPeriods(year);
    const { data: campaignSteps = [] } = useCampaignSteps(year);
    const { data: planningSteps = [] } = usePlanningSteps();
    const salles = usePlanningLabSalles();
    const { data: labEventsList = [] } = useLabEvents();

    // Week state
    const weekState = useMemo(() => {
        return weekStates.find((ws) => ws.weekNum === weekNum)?.state;
    }, [weekStates, weekNum]);

    // Members with periods overlapping this week
    const visibleMembers = useMemo(() => {
        const memberMap = new Map<string, PlanningMemberPeriod[]>();
        for (const p of memberPeriods) {
            const hasOverlap = columns.some((col) => dayOverlaps(p.startDate, p.endDate, col));
            if (!hasOverlap) continue;
            const list = memberMap.get(p.memberName) ?? [];
            list.push(p);
            memberMap.set(p.memberName, list);
        }
        return Array.from(memberMap.entries()).map(([name, periods]) => ({ name, periods }));
    }, [memberPeriods, columns]);

    // Lab events overlapping this week
    const visibleLabRows = useMemo(() => {
        const machineEventsMap = new Map<string, LabEvent[]>();
        for (const ev of labEventsList) {
            const hasOverlap = columns.some((col) => dayOverlaps(ev.startDate, ev.endDate, col));
            if (!hasOverlap) continue;
            const list = machineEventsMap.get(ev.machineUuid) ?? [];
            list.push(ev);
            machineEventsMap.set(ev.machineUuid, list);
        }

        const result: Array<{
            machineUuid: string;
            salleName: string;
            machineName: string;
            events: LabEvent[];
        }> = [];

        for (const salle of salles) {
            for (const machine of salle.machines) {
                const events = machineEventsMap.get(machine.uuid);
                if (events && events.length > 0) {
                    result.push({
                        machineUuid: machine.uuid,
                        salleName: salle.name,
                        machineName: machine.name,
                        events,
                    });
                }
            }
        }
        return result;
    }, [labEventsList, salles, columns]);

    // Campaign steps overlapping this week
    const visibleCampaignData = useMemo(() => {
        const stepsByCampaign = new Map<string, PlanningCampaignStep[]>();
        for (const step of campaignSteps) {
            const hasOverlap = columns.some((col) => dayOverlaps(step.startDate, step.endDate, col));
            if (!hasOverlap) continue;
            const list = stepsByCampaign.get(step.campaignUuid) ?? [];
            list.push(step);
            stepsByCampaign.set(step.campaignUuid, list);
        }

        const result: Array<{
            campaignUuid: string;
            campaignName: string;
            installation: string | null;
            etapes: Array<{ label: string; color: string; steps: PlanningCampaignStep[] }>;
        }> = [];

        for (const [uuid, steps] of stepsByCampaign) {
            const camp = campaigns.find((cc) => cc.uuid === uuid);
            if (!camp) continue;

            const etapeMap = new Map<string, PlanningCampaignStep[]>();
            for (const s of steps) {
                const arr = etapeMap.get(s.stepLabel) ?? [];
                arr.push(s);
                etapeMap.set(s.stepLabel, arr);
            }

            const etapes = planningSteps
                .filter((e) => etapeMap.has(e.label))
                .map((e) => ({
                    label: e.label,
                    color: e.color,
                    steps: etapeMap.get(e.label)!,
                }));

            if (etapes.length > 0) {
                result.push({
                    campaignUuid: uuid,
                    campaignName: camp.name,
                    installation: camp.installation?.label ?? null,
                    etapes,
                });
            }
        }
        return result;
    }, [campaignSteps, campaigns, columns, planningSteps]);

    const hasContent = visibleCampaignData.length > 0 || visibleMembers.length > 0 || visibleLabRows.length > 0;

    const cellBg = (col: DayCol) => {
        if (col.isToday) return c.currentDay;
        if (weekState === 'fermeture') return c.fermeture;
        if (weekState === 'vacances') return c.vacances;
        return c.cellBg;
    };

    const handleCampaignClick = onCampaignClick ?? ((uuid: string) => navigate(paths.campaign.tab(uuid, 'overview')));

    if (!hasContent) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.disabled">
                    Aucune activité planifiée cette semaine
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ border: `1px solid ${c.border}`, borderRadius: '8px', bgcolor: c.bg, overflow: 'hidden' }}>
            <table
                style={{
                    tableLayout: 'fixed',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    width: '100%',
                    minWidth: LABEL_W + DAYS * 80,
                }}
            >
                <colgroup>
                    <col style={{ width: LABEL_W }} />
                    {columns.map((col) => (
                        <col key={col.key} style={{ minWidth: 70 }} />
                    ))}
                </colgroup>

                <thead>
                    <tr>
                        <th
                            style={{
                                ...thStyle(c),
                                position: 'sticky',
                                left: 0,
                                zIndex: 4,
                                borderRight: `2px solid ${c.borderStrong}`,
                            }}
                        />
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                style={{
                                    ...thStyle(c),
                                    backgroundColor: col.isToday ? c.currentDay : c.headerBg,
                                    fontWeight: col.isToday ? 700 : 500,
                                    color: col.isToday ? c.accent : c.textSecondary,
                                }}
                            >
                                <Box>
                                    {col.shortLabel}
                                    <Box sx={{ fontSize: 9, fontWeight: 400, color: c.textSecondary, mt: 0.2 }}>
                                        {col.dateLabel}
                                    </Box>
                                </Box>
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {/* Equipe */}
                    {visibleMembers.length > 0 && (
                        <>
                            <SectionHeader label="Équipe" colSpan={1 + DAYS} colors={c} />
                            {visibleMembers.map(({ name, periods }) => (
                                <tr key={name}>
                                    <LabelCell colors={c}>{name}</LabelCell>
                                    {columns.map((col, idx) => {
                                        const match = periods.find((p) => dayOverlaps(p.startDate, p.endDate, col));
                                        const meta = match ? getPeriodeMeta(match.periodType) : undefined;
                                        const pos = match
                                            ? barPosition(match.startDate, match.endDate, columns, idx)
                                            : undefined;
                                        return (
                                            <td key={col.key} style={cellStyle(c, cellBg(col), pos)}>
                                                {match && meta && pos && (
                                                    <Tooltip
                                                        title={`${meta.label}${match.commentaire ? ` — ${match.commentaire}` : ''}`}
                                                        arrow
                                                    >
                                                        <Box sx={barSx(pos, meta.color)}>
                                                            {(pos === 'start' || pos === 'single') && (
                                                                <Typography
                                                                    fontSize={9}
                                                                    fontWeight={600}
                                                                    color="#fff"
                                                                    noWrap
                                                                >
                                                                    {meta.label}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </>
                    )}

                    {/* Vie Labo */}
                    {visibleLabRows.length > 0 && (
                        <>
                            <SectionHeader label="Vie Labo" colSpan={1 + DAYS} colors={c} />
                            {visibleLabRows.map(({ machineUuid, salleName, machineName, events }) => (
                                <tr key={machineUuid}>
                                    <LabelCell colors={c}>
                                        <Typography fontSize={11} fontWeight={600} noWrap>
                                            {salleName}
                                        </Typography>
                                        <Typography fontSize={10} color="text.secondary" noWrap>
                                            {machineName}
                                        </Typography>
                                    </LabelCell>
                                    {columns.map((col, idx) => {
                                        const match = events.find((ev) => dayOverlaps(ev.startDate, ev.endDate, col));
                                        const catMeta = match ? getEventCategoryMeta(match.category) : undefined;
                                        const pos = match
                                            ? barPosition(match.startDate, match.endDate, columns, idx)
                                            : undefined;
                                        return (
                                            <td key={col.key} style={cellStyle(c, cellBg(col), pos)}>
                                                {match && catMeta && pos && (
                                                    <Tooltip
                                                        title={`${catMeta.label}${match.description ? ` — ${match.description}` : ''}`}
                                                        arrow
                                                    >
                                                        <Box sx={barSx(pos, catMeta.color)}>
                                                            {(pos === 'start' || pos === 'single') && (
                                                                <Typography
                                                                    fontSize={9}
                                                                    fontWeight={600}
                                                                    color="#fff"
                                                                    noWrap
                                                                >
                                                                    {catMeta.label}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </>
                    )}

                    {/* Campagnes */}
                    {visibleCampaignData.length > 0 && (
                        <>
                            <SectionHeader label="Campagnes" colSpan={1 + DAYS} colors={c} />
                            {visibleCampaignData.map((camp) =>
                                camp.etapes.map((etape, etapeIdx) => {
                                    const withDates = etape.steps.filter((s) => s.startDate && s.endDate);
                                    let aggStart: string | null = null;
                                    let aggEnd: string | null = null;
                                    if (withDates.length > 0) {
                                        aggStart = withDates.reduce(
                                            (min, s) => (s.startDate! < min ? s.startDate! : min),
                                            withDates[0].startDate!,
                                        );
                                        aggEnd = withDates.reduce(
                                            (max, s) => (s.endDate! > max ? s.endDate! : max),
                                            withDates[0].endDate!,
                                        );
                                    }

                                    return (
                                        <tr key={`${camp.campaignUuid}-${etape.label}`}>
                                            <LabelCell
                                                colors={c}
                                                accentColor={etape.color}
                                                onClick={() => handleCampaignClick(camp.campaignUuid)}
                                            >
                                                {etapeIdx === 0 && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography fontSize={11} fontWeight={600} noWrap>
                                                            {camp.campaignName}
                                                        </Typography>
                                                        {camp.installation && (
                                                            <Chip
                                                                label={camp.installation}
                                                                sx={softChipSx(
                                                                    Object.values(CAMPAIGN_INSTALLATIONS).find(
                                                                        (i) => i.label === camp.installation,
                                                                    )?.color ?? '#666',
                                                                )}
                                                            />
                                                        )}
                                                    </Box>
                                                )}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Box
                                                        sx={{
                                                            width: 7,
                                                            height: 7,
                                                            borderRadius: '50%',
                                                            bgcolor: etape.color,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <Typography fontSize={10} color="text.secondary" noWrap>
                                                        {etape.label}
                                                    </Typography>
                                                </Box>
                                            </LabelCell>
                                            {columns.map((col, idx) => {
                                                const inRange = dayOverlaps(aggStart, aggEnd, col);
                                                const pos = inRange
                                                    ? barPosition(aggStart, aggEnd, columns, idx)
                                                    : undefined;
                                                return (
                                                    <td key={col.key} style={cellStyle(c, cellBg(col), pos)}>
                                                        {pos && (
                                                            <Box sx={{ ...barSx(pos, etape.color), opacity: 0.7 }} />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                }),
                            )}
                        </>
                    )}
                </tbody>
            </table>
        </Box>
    );
}

// ====================== Exported helpers for wrappers ======================

export function getWeekLabel(weekNum: number, year: number): string {
    const monday = dayjs(`${year}-01-04`).isoWeek(weekNum).startOf('isoWeek');
    const friday = monday.add(4, 'day');
    return `S${weekNum} — ${monday.format('D MMM')} au ${friday.format('D MMM YYYY')}`;
}

export function useWeekStateForWeek(weekNum: number, year: number) {
    const { data: weekStates = [] } = useWeekStates(year);
    return useMemo(() => weekStates.find((ws) => ws.weekNum === weekNum)?.state, [weekStates, weekNum]);
}

// ====================== Style helpers ======================

function thStyle(c: PlanningColors): React.CSSProperties {
    return {
        position: 'sticky',
        top: 0,
        zIndex: 3,
        backgroundColor: c.headerBg,
        borderBottom: `2px solid ${c.borderStrong}`,
        borderLeft: `1px solid ${c.border}`,
        padding: '5px 0',
        textAlign: 'center',
        fontSize: 11,
    };
}

function cellStyle(c: PlanningColors, bg: string, pos?: BarPos): React.CSSProperties {
    return {
        position: 'relative',
        padding: 0,
        height: ROW_H,
        borderBottom: `1px solid ${c.border}`,
        borderLeft: pos && (pos === 'middle' || pos === 'end') ? 'none' : `1px solid ${c.border}`,
        borderRight: pos && (pos === 'start' || pos === 'middle') ? 'none' : `1px solid ${c.border}`,
        backgroundColor: bg,
    };
}

function barSx(pos: BarPos, color: string) {
    return {
        position: 'absolute' as const,
        top: 3,
        bottom: 3,
        left: pos === 'start' || pos === 'single' ? 2 : 0,
        right: pos === 'end' || pos === 'single' ? 2 : 0,
        bgcolor: color,
        borderRadius: barRadius(pos),
        opacity: 0.85,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        px: 0.3,
    };
}

// ====================== Sub-components ======================

function SectionHeader({ label, colSpan, colors: c }: { label: string; colSpan: number; colors: PlanningColors }) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                style={{
                    backgroundColor: c.sectionBg,
                    borderTop: `2px solid ${c.borderStrong}`,
                    borderBottom: `1px solid ${c.border}`,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: c.accent,
                }}
            >
                {label}
            </td>
        </tr>
    );
}

function LabelCell({
    children,
    colors: c,
    accentColor,
    onClick,
}: {
    children: React.ReactNode;
    colors: PlanningColors;
    accentColor?: string;
    onClick?: () => void;
}) {
    return (
        <td
            onClick={onClick}
            style={{
                position: 'sticky',
                left: 0,
                zIndex: 2,
                backgroundColor: c.white,
                borderRight: `2px solid ${c.borderStrong}`,
                borderBottom: `1px solid ${c.border}`,
                borderLeft: accentColor ? `4px solid ${accentColor}` : undefined,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 500,
                color: c.accent,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: LABEL_W,
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            {children}
        </td>
    );
}
