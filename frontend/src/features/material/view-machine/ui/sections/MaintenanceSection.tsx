/**
 * MaintenanceSection — historique des interventions de maintenance.
 * @module features/material/view-machine
 *
 * Lecture seule de la liste ; le clic sur une ligne ouvre la modale
 * d'édition de l'intervention (création/édition d'un sous-objet —
 * pattern identique aux étapes FSEC qui restent en modale).
 */

import { memo, useCallback, useState } from 'react';
import {
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { MAINTENANCE_TYPE_LABELS, type MachineMaintenance, useMaintenances } from '@entities/material';
import { MaintenanceModal } from '@features/material/log-maintenance';
import { DataChip } from '@widgets/data-chip';
import { motion } from '@shared/ui/motion';
import { PAPER_BASE_SX } from '../styles';

interface MaintenanceSectionProps {
    machineUuid: string;
}

export const MaintenanceSection = memo(function MaintenanceSection({ machineUuid }: MaintenanceSectionProps) {
    const theme = useTheme();
    const { data: maintenances = [] } = useMaintenances(machineUuid);

    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<MachineMaintenance | null>(null);

    const openCreate = useCallback(() => {
        setSelected(null);
        setModalOpen(true);
    }, []);

    const openEdit = useCallback((maintenance: MachineMaintenance) => {
        setSelected(maintenance);
        setModalOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setModalOpen(false);
        setSelected(null);
    }, []);

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="overline" color="text.secondary">
                    Historique de maintenance
                </Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Nouvelle intervention
                </Button>
            </Stack>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Intervenant</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Prochaine</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {maintenances.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                        Aucune intervention enregistrée.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {maintenances.map((m) => (
                            <TableRow
                                hover
                                key={m.uuid}
                                sx={{
                                    cursor: 'pointer',
                                    transition: `background-color ${motion.fast}`,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                }}
                                onClick={() => openEdit(m)}
                            >
                                <TableCell>{dayjs(m.date).format('DD/MM/YYYY')}</TableCell>
                                <TableCell>
                                    <DataChip
                                        label={MAINTENANCE_TYPE_LABELS[m.type]}
                                        color={
                                            m.type === 'preventive'
                                                ? theme.palette.primary.main
                                                : theme.palette.warning.main
                                        }
                                    />
                                </TableCell>
                                <TableCell>{m.performedByName || '—'}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 320 }}>
                                        {m.description || '—'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {m.nextMaintenanceDate ? dayjs(m.nextMaintenanceDate).format('DD/MM/YYYY') : '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {modalOpen && (
                <MaintenanceModal
                    open={modalOpen}
                    onClose={handleClose}
                    machineUuid={machineUuid}
                    maintenance={selected}
                />
            )}
        </Paper>
    );
});
