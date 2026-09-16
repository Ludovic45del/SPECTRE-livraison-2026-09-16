/**
 * PlanningTimeHeader — En-tête timeline (thead) avec mois, semaines, jours.
 */
import { useMemo, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { useUpsertWeekState, useDeleteWeekState } from '@entities/planning/core/api/planning.queries';
import { useWeekStates } from '@entities/planning/core/api/planning.queries';
import { GRID_LABEL_WIDTH, GRID_SUB_LABEL_WIDTH, type PlanningColors } from '../lib/planning.constants';
import { usePlanningColors } from '../lib/planning.hooks';
import { usePlanningStore } from '../lib/planning.store';
import { type TimelineColumn, type TimelineGroupHeader } from '../lib/planning.utils';
import { WeekRecapPopover } from './WeekRecapPopover';

interface PlanningTimeHeaderProps {
    columns: TimelineColumn[];
    groupHeaders: TimelineGroupHeader[];
}

const stickyHeaderZ = 4;
const stickyLabelZ = 5;

function getHeaderCellStyle(colors: PlanningColors): React.CSSProperties {
    return {
        position: 'sticky',
        top: 0,
        zIndex: stickyHeaderZ,
        backgroundColor: colors.headerBg,
        border: `1px solid ${colors.border}`,
        padding: '4px 2px',
        fontSize: 12,
        fontWeight: 700,
        color: colors.accentLight,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        userSelect: 'none',
    };
}

export function PlanningTimeHeader({ columns, groupHeaders }: PlanningTimeHeaderProps) {
    const colors = usePlanningColors();
    const selectedYear = usePlanningStore((s) => s.selectedYear);
    const { data: weekStates = [] } = useWeekStates(selectedYear);
    const upsertWeekState = useUpsertWeekState();
    const deleteWeekState = useDeleteWeekState();

    const headerCellStyle = useMemo(() => getHeaderCellStyle(colors), [colors]);

    const weekStatesMap = new Map<string, { uuid: string; state: 'vacances' | 'fermeture' }>();
    for (const ws of weekStates) {
        weekStatesMap.set(`${ws.year}:${ws.weekNum}`, { uuid: ws.uuid, state: ws.state });
    }

    const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement | null; weekNum: number | null; year: number }>({
        anchorEl: null,
        weekNum: null,
        year: selectedYear,
    });

    const [recapWeek, setRecapWeek] = useState<{ weekNum: number; year: number } | null>(null);

    const menuExisting =
        menuState.weekNum != null ? weekStatesMap.get(`${menuState.year}:${menuState.weekNum}`) : undefined;

    function handleContextMenu(e: React.MouseEvent<HTMLElement>, weekNum: number, year: number) {
        e.preventDefault();
        setMenuState({ anchorEl: e.currentTarget, weekNum, year });
    }

    function handleMenuSelect(type: 'vacances' | 'fermeture' | null) {
        if (menuState.weekNum != null) {
            if (type) {
                upsertWeekState.mutate({ year: menuState.year, weekNum: menuState.weekNum, state: type });
            } else if (menuExisting) {
                deleteWeekState.mutate({ uuid: menuExisting.uuid, year: menuState.year });
            }
        }
        setMenuState({ anchorEl: null, weekNum: null, year: selectedYear });
    }

    const labelRowSpan = 2;

    return (
        <thead>
            {/* Row 1: Group headers (months or year) */}
            <tr role="row">
                <th
                    scope="col"
                    role="columnheader"
                    rowSpan={labelRowSpan}
                    style={{
                        ...headerCellStyle,
                        position: 'sticky',
                        left: 0,
                        zIndex: stickyLabelZ,
                        width: GRID_LABEL_WIDTH,
                        minWidth: GRID_LABEL_WIDTH,
                        borderRight: `2px solid ${colors.borderStrong}`,
                    }}
                />
                <th
                    scope="col"
                    role="columnheader"
                    rowSpan={labelRowSpan}
                    style={{
                        ...headerCellStyle,
                        position: 'sticky',
                        left: GRID_LABEL_WIDTH,
                        zIndex: stickyLabelZ,
                        width: GRID_SUB_LABEL_WIDTH,
                        minWidth: GRID_SUB_LABEL_WIDTH,
                        borderRight: `2px solid ${colors.borderStrong}`,
                    }}
                />
                {groupHeaders.map((gh, i) => (
                    <th key={`g-${i}`} scope="col" role="columnheader" colSpan={gh.colSpan} style={headerCellStyle}>
                        {gh.label}
                    </th>
                ))}
            </tr>

            {/* Row 2: Individual column headers */}
            <tr role="row">
                {columns.map((col) => {
                    const colState = weekStatesMap.get(`${col.year}:${col.weekNum}`)?.state;
                    let bg: string = colors.headerBg;
                    if (col.isCurrent) bg = colors.currentDay;
                    else if (colState === 'fermeture') bg = colors.fermeture;
                    else if (colState === 'vacances') bg = colors.vacances;
                    else if (col.isWeekend) bg = colors.weekend;

                    return (
                        <th
                            key={col.key}
                            scope="col"
                            role="columnheader"
                            style={{ ...headerCellStyle, backgroundColor: bg, cursor: 'pointer' }}
                            onClick={() => setRecapWeek({ weekNum: col.weekNum, year: col.year })}
                            onContextMenu={(e) => handleContextMenu(e, col.weekNum, col.year)}
                            title="Clic : récap semaine · Clic droit : vacances / fermeture"
                        >
                            {col.label}
                        </th>
                    );
                })}
            </tr>

            {/* Context menu for week state */}
            <Menu
                open={Boolean(menuState.anchorEl)}
                anchorEl={menuState.anchorEl}
                onClose={() => setMenuState({ anchorEl: null, weekNum: null, year: selectedYear })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <MenuItem onClick={() => handleMenuSelect('vacances')} selected={menuExisting?.state === 'vacances'}>
                    Vacances scolaires
                </MenuItem>
                <MenuItem onClick={() => handleMenuSelect('fermeture')} selected={menuExisting?.state === 'fermeture'}>
                    Fermeture du centre
                </MenuItem>
                {menuExisting && <MenuItem onClick={() => handleMenuSelect(null)}>Normal (retirer)</MenuItem>}
            </Menu>

            {recapWeek && (
                <WeekRecapPopover
                    weekNum={recapWeek.weekNum}
                    year={recapWeek.year}
                    onClose={() => setRecapWeek(null)}
                />
            )}
        </thead>
    );
}
