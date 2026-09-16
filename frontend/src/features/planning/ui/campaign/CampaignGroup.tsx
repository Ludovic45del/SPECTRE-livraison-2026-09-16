/**
 * CampaignGroup — Groupe de lignes pour une campagne (étapes + FSECs).
 */
import { memo, useCallback, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import type { CampaignWithRelations } from '@entities/campaign/core/model/referential.schema';
import type { PlanningSalle } from '../../lib/planning.lab';
import type { Etape, Membre } from '../../lib/planning.constants';
import { type PlanningData, usePlanningColors } from '../../lib/planning.hooks';
import type { LabEventsMap } from '../../lib/planning.hooks';
import { usePlanningStore } from '../../lib/planning.store';
import type { TimelineColumn } from '../../lib/planning.utils';
import type { VisibleColumnRange } from '../../lib/useColumnVirtualization';
import { resolveWeekState } from '../../lib/planning.grid-utils';
import { HoverTd, StickyLabelCell } from '../PlanningCell';
import { CampaignContext } from './CampaignContext';
import { CampaignStepDialog } from './CampaignStepDialog';
import { StepHeaderRow } from './StepHeaderRow';
import { StepLanesRow } from './StepLanesRow';
import type { FsecInfo } from './types';

// ====================== Types ======================

interface CampaignGroupProps {
    campagne: CampaignWithRelations;
    etapes: Etape[];
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
    onNavigate: () => void;
}

// ====================== Component ======================

export const CampaignGroup = memo(function CampaignGroup({
    campagne,
    etapes,
    columns,
    planningData,
    allFsecs,
    membres,
    salles,
    labEvents,
    visibleRange,
    onNavigate,
}: CampaignGroupProps) {
    const colors = usePlanningColors();
    const collapsedStepGroups = usePlanningStore((s) => s.collapsedStepGroups);

    // Modale de planification campagne (1 instance par campagne, étape active + jour cliqué).
    const [dialogStep, setDialogStep] = useState<{ etape: Etape; defaultDate?: string } | null>(null);
    const onOpenStepDialog = useCallback(
        (etape: Etape, defaultDate?: string) => setDialogStep({ etape, defaultDate }),
        [],
    );

    const contextValue = useMemo(
        () => ({
            campagne,
            columns,
            planningData,
            membres,
            salles,
            labEvents,
            visibleRange,
            onNavigate,
            onOpenStepDialog,
        }),
        [campagne, columns, planningData, membres, salles, labEvents, visibleRange, onNavigate, onOpenStepDialog],
    );

    const campaignFsecs: FsecInfo[] = useMemo(
        () => allFsecs.filter((f) => f.campaignId === campagne.uuid),
        [allFsecs, campagne.uuid],
    );

    const gasFsecs: FsecInfo[] = useMemo(() => campaignFsecs.filter((f) => (f.categoryId ?? 0) >= 1), [campaignFsecs]);

    // Filter out gasOnly etapes when campaign has no gas FSECs
    const visibleEtapes = useMemo(
        () => etapes.filter((e) => !e.gasOnly || gasFsecs.length > 0),
        [etapes, gasFsecs.length],
    );

    // Compute total rows for rowSpan of campaign name.
    // Une étape dépliée = 1 ligne en-tête + 1 ligne couloirs (ou "Aucune FSEC").
    const totalRows = useMemo(() => {
        let count = 0;
        for (const etape of visibleEtapes) {
            count += 1; // header row
            const key = `${campagne.uuid}#${etape.label}`;
            const isCollapsed = collapsedStepGroups[key] !== false;
            if (!isCollapsed) count += 1; // ligne couloirs
        }
        return count;
    }, [visibleEtapes, campagne.uuid, collapsedStepGroups]);

    let isFirstRow = true;

    return (
        <CampaignContext.Provider value={contextValue}>
            {visibleEtapes.map((etape) => {
                const key = `${campagne.uuid}#${etape.label}`;
                const isCollapsed = collapsedStepGroups[key] !== false;
                const etapeFsecs = etape.gasOnly ? gasFsecs : campaignFsecs;
                // step.fsecUuid référence la version FSEC (FsecEntity.version_uuid).
                const etapeFsecUuids = new Set(etapeFsecs.map((f) => f.versionUuid));
                const stepsForEtape = (planningData.campaignStepsMap.get(key) ?? []).filter((s) =>
                    etapeFsecUuids.has(s.fsecUuid),
                );

                const rows: React.ReactNode[] = [];

                // Step header row
                const showCampaignName = isFirstRow;
                isFirstRow = false;

                rows.push(
                    <StepHeaderRow
                        key={`header-${key}`}
                        etape={etape}
                        showCampaignName={showCampaignName}
                        campaignRowSpan={totalRows}
                        isCollapsed={isCollapsed}
                        stepsForEtape={stepsForEtape}
                        campaignFsecs={etapeFsecs}
                    />,
                );

                // FSEC rows (when expanded)
                if (!isCollapsed) {
                    if (etapeFsecs.length === 0) {
                        const { startCol, endCol } = visibleRange;
                        rows.push(
                            <tr key={`empty-${key}`} role="row">
                                <StickyLabelCell isSubLabel accentColor={etape.color}>
                                    <Typography fontSize={11} color="text.disabled" sx={{ pl: 2, fontStyle: 'italic' }}>
                                        Aucune FSEC
                                    </Typography>
                                </StickyLabelCell>
                                {/* Left spacer */}
                                {startCol > 0 && (
                                    <td colSpan={startCol} style={{ padding: 0, border: 'none', height: 28 }} />
                                )}
                                {/* Visible columns */}
                                {columns.slice(startCol, endCol + 1).map((col) => {
                                    const weekState = resolveWeekState(col, planningData.weekStatesMap);
                                    return (
                                        <HoverTd
                                            key={col.key}
                                            role="gridcell"
                                            style={{
                                                height: 28,
                                                border: `1px solid ${colors.border}`,
                                                backgroundColor: col.isCurrent
                                                    ? colors.currentDay
                                                    : weekState === 'fermeture'
                                                      ? colors.fermeture
                                                      : weekState === 'vacances'
                                                        ? colors.vacances
                                                        : col.isWeekend
                                                          ? colors.weekend
                                                          : colors.cellBg,
                                            }}
                                        />
                                    );
                                })}
                                {/* Right spacer */}
                                {endCol < columns.length - 1 && (
                                    <td
                                        colSpan={columns.length - 1 - endCol}
                                        style={{ padding: 0, border: 'none', height: 28 }}
                                    />
                                )}
                            </tr>,
                        );
                    } else {
                        rows.push(
                            <StepLanesRow
                                key={`lanes-${key}`}
                                etape={etape}
                                etapeFsecs={etapeFsecs}
                                stepsForEtape={stepsForEtape}
                            />,
                        );
                    }
                }

                return rows;
            })}

            {dialogStep && (
                <CampaignStepDialog
                    campagne={campagne}
                    etapes={visibleEtapes}
                    campaignFsecs={campaignFsecs}
                    gasFsecs={gasFsecs}
                    planningData={planningData}
                    membres={membres}
                    salles={salles}
                    labEvents={labEvents}
                    initialStepLabel={dialogStep.etape.label}
                    defaultDate={dialogStep.defaultDate}
                    onClose={() => setDialogStep(null)}
                />
            )}
        </CampaignContext.Provider>
    );
});
