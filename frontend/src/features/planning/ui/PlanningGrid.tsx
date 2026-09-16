/**
 * PlanningGrid — Table unifiée avec colgroup, scroll horizontal, event delegation.
 * Uses column virtualization to skip rendering off-screen timeline cells.
 */
import React, { memo, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { COL_WIDTH, GRID_LABEL_WIDTH, GRID_SUB_LABEL_WIDTH, type Membre, SECTION_IDS } from '../lib/planning.constants';
import { usePlanningStore } from '../lib/planning.store';
import { usePlanningColors, usePlanningData, usePlanningTimeline } from '../lib/planning.hooks';
import type { PlanningSalle } from '../lib/planning.lab';
import type { LabEventsMap } from '../lib/planning.hooks';
import { useColumnVirtualization } from '../lib/useColumnVirtualization';
import { PlanningTimeHeader } from './PlanningTimeHeader';
import { PlanningSection } from './PlanningSection';
import { PlanningMemberRows } from './PlanningMemberRows';
import { PlanningLabRows } from './PlanningLabRows';
import { PlanningCampaignRows } from './PlanningCampaignRows';

interface PlanningGridProps {
    membres: Membre[];
    salles: PlanningSalle[];
    labEvents: LabEventsMap;
}

export const PlanningGrid = memo(function PlanningGrid({ membres, salles, labEvents }: PlanningGridProps) {
    const colors = usePlanningColors();
    const anchorDate = usePlanningStore((s) => s.anchorDate);
    const selectedYear = usePlanningStore((s) => s.selectedYear);

    const timeline = usePlanningTimeline(anchorDate);
    const planningData = usePlanningData(selectedYear);

    const tableRef = useRef<HTMLTableElement>(null);

    const totalCols = 2 + timeline.columns.length;

    // ---- Column virtualization (A-perf) ----
    const [scrollContainerRef, visibleRange] = useColumnVirtualization(timeline.columns.length);

    // ---- Keyboard navigation for grid accessibility (A-2) ----
    const handleGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableElement>) => {
        const target = e.target as HTMLElement;
        const cell = target.closest('td, th') as HTMLElement | null;
        if (!cell || !tableRef.current) return;

        const row = cell.closest('tr');
        if (!row) return;

        let nextCell: HTMLElement | null = null;

        switch (e.key) {
            case 'ArrowRight': {
                e.preventDefault();
                nextCell = cell.nextElementSibling as HTMLElement | null;
                break;
            }
            case 'ArrowLeft': {
                e.preventDefault();
                nextCell = cell.previousElementSibling as HTMLElement | null;
                break;
            }
            case 'ArrowDown': {
                e.preventDefault();
                const cellIndex = Array.from(row.children).indexOf(cell);
                const allRows = Array.from(tableRef.current.querySelectorAll('tr'));
                const rowIndex = allRows.indexOf(row);
                for (let i = rowIndex + 1; i < allRows.length; i++) {
                    const candidate = allRows[i].children[cellIndex] as HTMLElement | undefined;
                    if (candidate) {
                        nextCell = candidate;
                        break;
                    }
                }
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                const cellIdx = Array.from(row.children).indexOf(cell);
                const rows = Array.from(tableRef.current.querySelectorAll('tr'));
                const rIdx = rows.indexOf(row);
                for (let i = rIdx - 1; i >= 0; i--) {
                    const candidate = rows[i].children[cellIdx] as HTMLElement | undefined;
                    if (candidate) {
                        nextCell = candidate;
                        break;
                    }
                }
                break;
            }
            case 'Enter': {
                e.preventDefault();
                cell.click();
                return;
            }
            default:
                return;
        }

        if (nextCell) {
            nextCell.tabIndex = 0;
            nextCell.focus();
            cell.tabIndex = -1;
        }
    }, []);

    return (
        <Box
            ref={scrollContainerRef}
            sx={{
                overflowX: 'auto',
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                bgcolor: colors.bg,
            }}
        >
            <table
                ref={tableRef}
                role="grid"
                aria-label="Planning"
                tabIndex={0}
                onKeyDown={handleGridKeyDown}
                style={{
                    tableLayout: 'fixed',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    width: '100%',
                    minWidth: GRID_LABEL_WIDTH + GRID_SUB_LABEL_WIDTH + timeline.columns.length * COL_WIDTH,
                }}
            >
                <colgroup>
                    <col style={{ width: GRID_LABEL_WIDTH }} />
                    <col style={{ width: GRID_SUB_LABEL_WIDTH }} />
                    {timeline.columns.map((col) => (
                        <col key={col.key} style={{ minWidth: COL_WIDTH }} />
                    ))}
                </colgroup>

                <PlanningTimeHeader columns={timeline.columns} groupHeaders={timeline.groupHeaders} />

                <PlanningSection sectionId={SECTION_IDS.equipe} label="Équipe" totalColumns={totalCols}>
                    <PlanningMemberRows
                        membres={membres}
                        columns={timeline.columns}
                        planningData={planningData}
                        visibleRange={visibleRange}
                    />
                </PlanningSection>

                <PlanningSection sectionId={SECTION_IDS.vieLabo} label="Vie Labo" totalColumns={totalCols}>
                    <PlanningLabRows
                        salles={salles}
                        columns={timeline.columns}
                        planningData={planningData}
                        labEvents={labEvents}
                        visibleRange={visibleRange}
                    />
                </PlanningSection>

                <PlanningSection sectionId={SECTION_IDS.campagnes} label="Campagnes" totalColumns={totalCols}>
                    <PlanningCampaignRows
                        columns={timeline.columns}
                        planningData={planningData}
                        membres={membres}
                        salles={salles}
                        labEvents={labEvents}
                        visibleRange={visibleRange}
                    />
                </PlanningSection>
            </table>
        </Box>
    );
});
