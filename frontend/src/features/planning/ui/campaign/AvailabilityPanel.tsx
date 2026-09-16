/**
 * AvailabilityPanel — récap de disponibilité (rôle + machines de salle) aligné
 * sur la fenêtre JOURNALIÈRE du board, pour les étapes ayant une config dispo
 * (Assemblage / Métrologie). Extrait d'AssemblageInfoPopover, sans DatePicker :
 * la planification se fait via le board, ce panneau n'est qu'informatif.
 *
 * Amélioration vs l'ancienne modale (1 semaine) : une bande par ressource avec
 * une cellule par jour de la fenêtre (vert = dispo, ambre = occupé + tooltip).
 */
import { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { StepAvailabilityConfig, Membre } from '../../lib/planning.constants';
import type { LabEventsMap, MemberPeriodsMap } from '../../lib/planning.hooks';
import type { PlanningSalle } from '../../lib/planning.lab';
import type { TimelineColumn } from '../../lib/planning.utils';
import { computeDayAvailability } from '../../lib/planning.availability';

const CELL_W = 16;

interface AvailabilityPanelProps {
    columns: TimelineColumn[];
    config: StepAvailabilityConfig;
    membres: Membre[];
    salles: PlanningSalle[];
    memberPeriodsMap: MemberPeriodsMap;
    labEvents: LabEventsMap;
}

interface DayCell {
    available: boolean;
    reason?: string;
}

export function AvailabilityPanel({
    columns,
    config,
    membres,
    salles,
    memberPeriodsMap,
    labEvents,
}: AvailabilityPanelProps) {
    const theme = useTheme();

    const roleMembers = useMemo(
        () => membres.filter((m) => m.fonction === config.fonctionFilter),
        [membres, config.fonctionFilter],
    );
    const salle = useMemo(() => salles.find((s) => s.name === config.salleName), [salles, config.salleName]);
    const salleMachines = useMemo(() => salle?.machines.map((m) => ({ uuid: m.uuid, name: m.name })) ?? [], [salle]);

    // Disponibilité par jour (réutilise computeDayAvailability), transposée par ressource.
    const { memberStrips, machineStrips } = useMemo(() => {
        const perDay = columns.map((col) =>
            computeDayAvailability(col.start, roleMembers, memberPeriodsMap, salleMachines, labEvents),
        );
        const memberStrips = roleMembers.map((m, j) => ({
            name: m.nom,
            cells: perDay.map<DayCell>((d) => ({
                available: d.assemblers[j].available,
                reason: d.assemblers[j].reason,
            })),
        }));
        const machineStrips = salleMachines.map((mc, k) => ({
            name: mc.name,
            cells: perDay.map<DayCell>((d) => ({ available: d.machines[k].available, reason: d.machines[k].reason })),
        }));
        return { memberStrips, machineStrips };
    }, [columns, roleMembers, salleMachines, memberPeriodsMap, labEvents]);

    const renderStrip = (cells: DayCell[]) => (
        <Box sx={{ display: 'flex', gap: '1px' }}>
            {cells.map((cell, i) => (
                <Tooltip
                    key={i}
                    title={`${columns[i].start.format('DD/MM')} — ${cell.available ? 'disponible' : (cell.reason ?? 'occupé')}`}
                    arrow
                    placement="top"
                >
                    <Box
                        sx={{
                            width: CELL_W,
                            height: 14,
                            borderRadius: 0.5,
                            flexShrink: 0,
                            bgcolor: cell.available
                                ? alpha(theme.palette.success.main, 0.35)
                                : alpha(theme.palette.warning.main, 0.55),
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    );

    const renderSection = (title: string, strips: { name: string; cells: DayCell[] }[], emptyLabel: string) => (
        <Box sx={{ mb: 1.5 }}>
            <Typography fontSize={12} fontWeight={700} sx={{ mb: 0.5 }}>
                {title}
            </Typography>
            {strips.length === 0 ? (
                <Typography fontSize={11} color="text.secondary" fontStyle="italic">
                    {emptyLabel}
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {strips.map((row) => (
                        <Box key={row.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography noWrap fontSize={11} sx={{ width: 110, flexShrink: 0 }}>
                                {row.name}
                            </Typography>
                            {renderStrip(row.cells)}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );

    return (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography fontSize={11} color="text.secondary" sx={{ mb: 1 }}>
                Disponibilité sur la période affichée (vert = disponible, ambre = occupé)
            </Typography>
            {renderSection(config.fonctionLabel, memberStrips, `Aucun ${config.fonctionLabel.toLowerCase()}`)}
            {renderSection(
                `Machines — Salle ${config.salleName}`,
                machineStrips,
                salle ? 'Aucune machine' : `Salle ${config.salleName} non trouvée`,
            )}
        </Box>
    );
}
