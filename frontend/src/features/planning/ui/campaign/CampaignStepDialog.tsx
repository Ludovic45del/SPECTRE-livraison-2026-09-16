/**
 * CampaignStepDialog — LA modale unifiée de planification d'une campagne.
 *
 * Sélecteur d'étape (onglets) → pour l'étape active : palette des FSEC non
 * planifiées à GLISSER dans un board JOURNALIER (drag, resize multi-jours,
 * suppression). Fonctionne pour LES 6 étapes (plus seulement Assemblage/Métro).
 * Remplace FsecStepPopover (et, au lot 3, AssemblageInfoPopover).
 */
import { useId, useMemo, useState } from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { softChipSx } from '@shared/lib';
import dayjs from 'dayjs';
import type { CampaignWithRelations } from '@entities/campaign/core/model/referential.schema';
import { type Etape, type Membre, getStepAvailabilityConfig } from '../../lib/planning.constants';
import type { PlanningData, LabEventsMap } from '../../lib/planning.hooks';
import { usePlanningColors } from '../../lib/planning.hooks';
import type { PlanningSalle } from '../../lib/planning.lab';
import { usePlanningStore } from '../../lib/planning.store';
import { useDayColumns } from '../../lib/planning.day-columns';
import { useCampaignStepMutations } from '../../lib/useCampaignStepMutations';
import { useFsecDrag } from '../../lib/useFsecDrag';
import { AvailabilityPanel } from './AvailabilityPanel';
import { FsecPalette } from './FsecPalette';
import { StepDayBoard, shiftStepDates } from './StepDayBoard';
import type { FsecInfo } from './types';

/** Nombre de jours affichés simultanément dans le board. */
const DAY_COUNT = 21;

interface CampaignStepDialogProps {
    campagne: CampaignWithRelations;
    /** Étapes visibles de la campagne (déjà filtrées gasOnly). */
    etapes: Etape[];
    campaignFsecs: FsecInfo[];
    gasFsecs: FsecInfo[];
    planningData: PlanningData;
    /** Ressources pour le bloc dispo (Assemblage / Métrologie). */
    membres: Membre[];
    salles: PlanningSalle[];
    labEvents: LabEventsMap;
    initialStepLabel: string;
    /** Jour cliqué (ancre la fenêtre du board). */
    defaultDate?: string;
    onClose: () => void;
}

export function CampaignStepDialog({
    campagne,
    etapes,
    campaignFsecs,
    gasFsecs,
    planningData,
    membres,
    salles,
    labEvents,
    initialStepLabel,
    defaultDate,
    onClose,
}: CampaignStepDialogProps) {
    const colors = usePlanningColors();
    const year = usePlanningStore((s) => s.selectedYear);
    const titleId = useId();

    const [activeLabel, setActiveLabel] = useState(initialStepLabel);
    const [windowStart, setWindowStart] = useState(() =>
        dayjs(defaultDate ?? dayjs().format('YYYY-MM-DD'))
            .startOf('isoWeek')
            .format('YYYY-MM-DD'),
    );

    const columns = useDayColumns(dayjs(windowStart), DAY_COUNT);
    const mutations = useCampaignStepMutations(campagne.uuid, year);

    const activeEtape = useMemo(() => etapes.find((e) => e.label === activeLabel) ?? etapes[0], [etapes, activeLabel]);
    const availConfig = activeEtape ? getStepAvailabilityConfig(activeEtape.label) : undefined;

    const fsecsFor = useMemo(
        () => (etape: Etape) => (etape.gasOnly ? gasFsecs : campaignFsecs),
        [gasFsecs, campaignFsecs],
    );

    const etapeFsecs = useMemo(() => (activeEtape ? fsecsFor(activeEtape) : []), [activeEtape, fsecsFor]);
    const stepsForEtape = useMemo(() => {
        if (!activeEtape) return [];
        const uuids = new Set(etapeFsecs.map((f) => f.versionUuid));
        return (planningData.campaignStepsMap.get(`${campagne.uuid}#${activeEtape.label}`) ?? []).filter((s) =>
            uuids.has(s.fsecUuid),
        );
    }, [activeEtape, etapeFsecs, planningData.campaignStepsMap, campagne.uuid]);

    const stepByFsec = useMemo(() => new Map(stepsForEtape.map((s) => [s.fsecUuid, s])), [stepsForEtape]);
    const unscheduled = useMemo(
        () => etapeFsecs.filter((f) => !stepByFsec.has(f.versionUuid)),
        [etapeFsecs, stepByFsec],
    );

    // --- Drop / fallback / move / resize / delete ---
    const scheduleAtCol = useMemo(
        () => (versionUuid: string, colIdx: number) => {
            const col = columns[colIdx];
            if (!col || !activeEtape) return;
            const d = col.start.format('YYYY-MM-DD');
            mutations.schedule(versionUuid, activeEtape.label, d, d);
        },
        [columns, activeEtape, mutations],
    );
    const { dragProps, dropProps } = useFsecDrag(scheduleAtCol);

    const onPlan = (versionUuid: string) => scheduleAtCol(versionUuid, 0);
    const onMove = (step: (typeof stepsForEtape)[number], dayOffset: number) => {
        const next = shiftStepDates(step, dayOffset);
        if (next) mutations.updateDates(step, next.startDate, next.endDate);
    };
    const onResize = (uuid: string, ns: string, ne: string) => {
        const step = stepsForEtape.find((s) => s.uuid === uuid);
        if (step) mutations.updateDates(step, ns, ne);
    };

    const shiftWindow = (deltaDays: number) =>
        setWindowStart((prev) => dayjs(prev).add(deltaDays, 'day').format('YYYY-MM-DD'));

    const rangeLabel =
        columns.length > 0
            ? `${columns[0].start.format('DD MMM')} – ${columns[columns.length - 1].start.format('DD MMM YYYY')}`
            : '';

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth={false}
            fullWidth
            aria-labelledby={titleId}
            slotProps={{ paper: { sx: { width: '95vw', maxWidth: 1500, minHeight: '72vh', m: 1 } } }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography id={titleId} variant="h6" fontWeight={700}>
                        Planifier — {campagne.name}
                    </Typography>
                    {campagne.installation?.label && (
                        <Chip
                            label={campagne.installation.label}
                            sx={softChipSx(campagne.installation.color ?? '#666')}
                        />
                    )}
                </Box>
                <IconButton onClick={onClose} size="small" aria-label="Fermer la modale">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Step tabs */}
            <Box sx={{ px: 2 }}>
                <ToggleButtonGroup
                    value={activeLabel}
                    exclusive
                    onChange={(_, v) => v && setActiveLabel(v)}
                    size="small"
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                >
                    {etapes.map((etape) => {
                        const fsecs = fsecsFor(etape);
                        const uuids = new Set(fsecs.map((f) => f.versionUuid));
                        const scheduled = (
                            planningData.campaignStepsMap.get(`${campagne.uuid}#${etape.label}`) ?? []
                        ).filter((s) => uuids.has(s.fsecUuid)).length;
                        return (
                            <ToggleButton
                                key={etape.label}
                                value={etape.label}
                                sx={{
                                    textTransform: 'none',
                                    gap: 0.6,
                                    px: 1,
                                    py: 0.4,
                                    border: `1px solid ${colors.border}`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: '50%',
                                        bgcolor: etape.color,
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography fontSize={12} fontWeight={600}>
                                    {etape.label}
                                </Typography>
                                {fsecs.length > 0 && (
                                    <Chip
                                        label={`${scheduled}/${fsecs.length}`}
                                        size="small"
                                        sx={softChipSx(scheduled === fsecs.length ? '#4caf50' : etape.color)}
                                    />
                                )}
                            </ToggleButton>
                        );
                    })}
                </ToggleButtonGroup>
            </Box>

            <DialogContent sx={{ pt: 1.5 }}>
                {/* Window navigation */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mb: 1 }}>
                    <Tooltip title="Semaine précédente">
                        <IconButton size="small" onClick={() => shiftWindow(-7)} aria-label="Semaine précédente">
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Typography fontSize={12} fontWeight={600} sx={{ minWidth: 150, textAlign: 'center' }}>
                        {rangeLabel}
                    </Typography>
                    <Tooltip title="Semaine suivante">
                        <IconButton size="small" onClick={() => shiftWindow(7)} aria-label="Semaine suivante">
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Palette + board */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <FsecPalette
                        fsecs={unscheduled}
                        accentColor={activeEtape?.color ?? colors.blue}
                        dragProps={dragProps}
                        onPlan={onPlan}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {activeEtape && (
                            <StepDayBoard
                                etape={activeEtape}
                                etapeFsecs={etapeFsecs}
                                stepsForEtape={stepsForEtape}
                                columns={columns}
                                weekStatesMap={planningData.weekStatesMap}
                                dropProps={dropProps}
                                onMove={onMove}
                                onResize={onResize}
                                onDeleteStep={mutations.remove}
                            />
                        )}
                        <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.75 }}>
                            Glissez une FSEC sur un jour pour la planifier ; étirez les bords d'une barre pour l'étendre
                            sur plusieurs jours.
                        </Typography>
                        {availConfig && (
                            <AvailabilityPanel
                                columns={columns}
                                config={availConfig}
                                membres={membres}
                                salles={salles}
                                memberPeriodsMap={planningData.memberPeriodsMap}
                                labEvents={labEvents}
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
