/**
 * PlanningCampaignRows — Lignes campagnes avec planification par FSEC.
 * Layout hiérarchique : Campagne -> Étape (header agrégé) -> FSEC (ligne individuelle).
 * Barres date-based, drag-to-move, resize, popover DatePicker par FSEC.
 * Uses row virtualization via @tanstack/react-virtual for large campaign lists.
 * Passes visible column range for column virtualization.
 *
 * Sub-components are split into ./campaign/ directory.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { useCampaigns } from '@entities/campaign/core/api/campaign.queries';
import type { CampaignWithRelations } from '@entities/campaign/core/model/referential.schema';
import { useFsecs } from '@entities/fsec/core/api/fsec.queries';
import { usePlanningSteps } from '@entities/planning/core/api/planning.queries';
import type { PlanningSalle } from '../lib/planning.lab';
import { type Etape, type Membre } from '../lib/planning.constants';
import { assignLanes, laneRowHeight } from '../lib/planning.lane-utils';
import type { PlanningData } from '../lib/planning.hooks';
import type { LabEventsMap } from '../lib/planning.hooks';
import { usePlanningStore } from '../lib/planning.store';
import { paths } from '@shared/config';
import type { TimelineColumn } from '../lib/planning.utils';
import type { VisibleColumnRange } from '../lib/useColumnVirtualization';
import { CampaignGroup } from './campaign/CampaignGroup';

// Re-export FsecInfo for backward compatibility
export type { FsecInfo } from './campaign/types';

// ====================== Constants ======================

/** Estimated height of an étape header row, in pixels. */
const HEADER_ROW_HEIGHT = 30;

/** Height of the "Aucune FSEC" placeholder row, in pixels. */
const EMPTY_ROW_HEIGHT = 28;

/** Virtualize only when campaign count exceeds this threshold */
const VIRTUALIZATION_THRESHOLD = 10;

// ====================== Types ======================

interface PlanningCampaignRowsProps {
    columns: TimelineColumn[];
    planningData: PlanningData;
    membres: Membre[];
    salles: PlanningSalle[];
    labEvents: LabEventsMap;
    visibleRange: VisibleColumnRange;
}

// ====================== Main Component ======================

export const PlanningCampaignRows = memo(function PlanningCampaignRows({
    columns,
    planningData,
    membres,
    salles,
    labEvents,
    visibleRange,
}: PlanningCampaignRowsProps) {
    const navigate = useNavigate();
    const filters = usePlanningStore((s) => s.filters);
    const { data: campaigns = [] } = useCampaigns();
    const { data: allFsecs = [] } = useFsecs();
    const { data: planningSteps = [] } = usePlanningSteps();

    const filteredCampaigns = useMemo(
        () =>
            campaigns
                .filter(
                    (c) =>
                        filters.installations.includes(c.installation?.label ?? '') &&
                        (filters.year == null || c.year === filters.year) &&
                        (filters.campaignUuid == null || c.uuid === filters.campaignUuid),
                )
                .sort((a, b) => {
                    if (!a.startDate) return 1;
                    if (!b.startDate) return -1;
                    return a.startDate.getTime() - b.startDate.getTime();
                }),
        [campaigns, filters],
    );

    const filteredEtapes = useMemo(() => {
        // etapeLabels vide = aucun filtre, on affiche toutes les étapes du référentiel.
        if (filters.etapeLabels.length === 0) return planningSteps;
        const labels = new Set(filters.etapeLabels);
        return planningSteps.filter((e) => labels.has(e.label));
    }, [planningSteps, filters.etapeLabels]);

    if (filteredCampaigns.length === 0) {
        return (
            <tr role="row">
                <td
                    role="gridcell"
                    colSpan={2 + columns.length}
                    style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}
                >
                    Aucune campagne pour ce filtre
                </td>
            </tr>
        );
    }

    if (filteredCampaigns.length <= VIRTUALIZATION_THRESHOLD) {
        return (
            <>
                {filteredCampaigns.map((campagne) => (
                    <CampaignGroup
                        key={campagne.uuid}
                        campagne={campagne}
                        etapes={filteredEtapes}
                        columns={columns}
                        planningData={planningData}
                        allFsecs={allFsecs}
                        membres={membres}
                        salles={salles}
                        labEvents={labEvents}
                        visibleRange={visibleRange}
                        onNavigate={() => navigate(paths.campaign.tab(campagne.slug, 'overview'))}
                    />
                ))}
            </>
        );
    }

    return (
        <VirtualizedCampaignRows
            filteredCampaigns={filteredCampaigns}
            filteredEtapes={filteredEtapes}
            columns={columns}
            planningData={planningData}
            allFsecs={allFsecs}
            membres={membres}
            salles={salles}
            labEvents={labEvents}
            visibleRange={visibleRange}
        />
    );
});

// ====================== Virtualized Renderer ======================

interface VirtualizedCampaignRowsProps {
    filteredCampaigns: CampaignWithRelations[];
    filteredEtapes: Etape[];
    columns: TimelineColumn[];
    planningData: PlanningData;
    allFsecs: Array<{
        versionUuid: string;
        fsecUuid: string;
        campaignId: string | null;
        name: string;
        displayName: string;
        categoryId: number | null;
        statusId: number | null;
        shootingDate: Date | null;
    }>;
    membres: Membre[];
    salles: PlanningSalle[];
    labEvents: LabEventsMap;
    visibleRange: VisibleColumnRange;
}

function VirtualizedCampaignRows({
    filteredCampaigns,
    filteredEtapes,
    columns,
    planningData,
    allFsecs,
    membres,
    salles,
    labEvents,
    visibleRange,
}: VirtualizedCampaignRowsProps) {
    const navigate = useNavigate();
    const markerRef = useRef<HTMLTableRowElement>(null);
    const [scrollMargin, setScrollMargin] = useState(0);
    const collapsedStepGroups = usePlanningStore((s) => s.collapsedStepGroups);

    // Measure offset from window top to the start of campaign rows
    useEffect(() => {
        if (markerRef.current) {
            const rect = markerRef.current.getBoundingClientRect();
            setScrollMargin(rect.top + window.scrollY);
        }
    }, []);

    // Estimate each campaign group height (header rows + lane rows), in pixels.
    const campaignGroupHeights = useMemo(() => {
        return filteredCampaigns.map((campagne) => {
            const campaignFsecs = allFsecs.filter((f) => f.campaignId === campagne.uuid);
            const gasFsecs = campaignFsecs.filter((f) => (f.categoryId ?? 0) >= 1);
            const visibleEtapes = filteredEtapes.filter((e) => !e.gasOnly || gasFsecs.length > 0);

            let height = 0;
            for (const etape of visibleEtapes) {
                height += HEADER_ROW_HEIGHT;
                const key = `${campagne.uuid}#${etape.label}`;
                const isCollapsed = collapsedStepGroups[key] !== false;
                if (isCollapsed) continue;

                const etapeFsecs = etape.gasOnly ? gasFsecs : campaignFsecs;
                if (etapeFsecs.length === 0) {
                    height += EMPTY_ROW_HEIGHT;
                    continue;
                }
                const fsecUuids = new Set(etapeFsecs.map((f) => f.versionUuid));
                const steps = (planningData.campaignStepsMap.get(key) ?? []).filter((s) => fsecUuids.has(s.fsecUuid));
                height += laneRowHeight(assignLanes(steps).laneCount);
            }
            return Math.max(height, HEADER_ROW_HEIGHT);
        });
    }, [filteredCampaigns, allFsecs, filteredEtapes, collapsedStepGroups, planningData.campaignStepsMap]);

    const virtualizer = useWindowVirtualizer({
        count: filteredCampaigns.length,
        estimateSize: (index) => campaignGroupHeights[index],
        overscan: 3,
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

            {/* Visible campaign groups */}
            {items.map((virtualRow) => {
                const campagne = filteredCampaigns[virtualRow.index];
                return (
                    <CampaignGroup
                        key={campagne.uuid}
                        campagne={campagne}
                        etapes={filteredEtapes}
                        columns={columns}
                        planningData={planningData}
                        allFsecs={allFsecs}
                        membres={membres}
                        salles={salles}
                        labEvents={labEvents}
                        visibleRange={visibleRange}
                        onNavigate={() => navigate(paths.campaign.tab(campagne.slug, 'overview'))}
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
