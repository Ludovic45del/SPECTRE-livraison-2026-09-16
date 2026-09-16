/**
 * MachineDetailModal — détail d'une machine en modale, avec sections
 * éditables inline (pattern aligné sur les sections FA détails).
 * @module features/material/view-machine
 */

import { useMemo } from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MACHINE_STATUS_COLORS, MACHINE_STATUS_LABELS, useMachine, useMachineRooms } from '@entities/material';
import { DataChip } from '@widgets/data-chip';
import { IdentitySection } from './sections/IdentitySection';
import { LinksSection } from './sections/LinksSection';
import { MaintenanceSection } from './sections/MaintenanceSection';

interface MachineDetailModalProps {
    open: boolean;
    onClose: () => void;
    machineUuid: string;
}

export function MachineDetailModal({ open, onClose, machineUuid }: MachineDetailModalProps) {
    const { data: machine, isLoading, isError } = useMachine(machineUuid);
    const { data: rooms = [] } = useMachineRooms();

    const room = useMemo(() => rooms.find((r) => r.id === machine?.roomId), [rooms, machine?.roomId]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
            <DialogTitle sx={{ pr: 6 }}>
                {machine ? (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="h6" fontWeight={700} component="span">
                            {machine.name}
                        </Typography>
                        <DataChip
                            label={MACHINE_STATUS_LABELS[machine.status]}
                            color={MACHINE_STATUS_COLORS[machine.status]}
                        />
                        {room && (
                            <Typography variant="body2" color="text.secondary" component="span">
                                · Salle {room.code} — {room.label}
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    <Typography variant="h6" fontWeight={700}>
                        Machine
                    </Typography>
                )}
                <IconButton
                    aria-label="Fermer"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={28} />
                    </Box>
                )}
                {!isLoading && (isError || !machine) && <Alert severity="error">Machine introuvable.</Alert>}
                {!isLoading && machine && (
                    <Stack spacing={2.5}>
                        <IdentitySection machine={machine} room={room} />
                        <LinksSection machine={machine} />
                        <MaintenanceSection machineUuid={machineUuid} />
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}
