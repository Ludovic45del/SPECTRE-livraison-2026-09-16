/**
 * MachineTableRow — ligne du tableau récap des machines.
 * @module pages/materiel/components
 *
 * Alignée sur FsecTableRow / EmbaseTableRow : hover bleuté primary alpha,
 * double-clic = navigation, bouton flèche d'action à droite.
 */

import { memo, useCallback } from 'react';
import { alpha, IconButton, TableCell, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import {
    MACHINE_STATUS_COLORS,
    MACHINE_STATUS_LABELS,
    MAINTENANCE_WARNING_DAYS,
    type Machine,
    type MachineRoom,
} from '@entities/material';
import { DataChip } from '@widgets/data-chip';
import { motion } from '@shared/ui/motion';

interface MachineTableRowProps {
    machine: Machine;
    room: MachineRoom | undefined;
    onNavigate: (uuid: string) => void;
}

function maintenanceTone(nextDate: string | null): {
    color: 'default' | 'warning' | 'error';
    label: string | null;
} {
    if (!nextDate) return { color: 'default', label: null };
    const formatted = dayjs(nextDate).format('DD/MM/YYYY');
    if (dayjs(nextDate).isBefore(dayjs(), 'day')) return { color: 'error', label: formatted };
    if (dayjs(nextDate).diff(dayjs(), 'day') <= MAINTENANCE_WARNING_DAYS) return { color: 'warning', label: formatted };
    return { color: 'default', label: formatted };
}

export const MachineTableRow = memo(function MachineTableRow({ machine, room, onNavigate }: MachineTableRowProps) {
    const theme = useTheme();

    const handleDoubleClick = useCallback(() => onNavigate(machine.uuid), [machine.uuid, onNavigate]);
    const handleButtonClick = useCallback(() => onNavigate(machine.uuid), [machine.uuid, onNavigate]);

    const maintenance = maintenanceTone(machine.nextMaintenanceDate);
    const manufacturerLine = [machine.manufacturer, machine.model].filter(Boolean).join(' / ');

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
            }}
            onDoubleClick={handleDoubleClick}
        >
            <TableCell>
                {room ? (
                    <DataChip label={room.code} color={room.color || theme.palette.primary.main} />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        —
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography fontWeight={500}>{machine.name}</Typography>
                {machine.description && (
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {machine.description.slice(0, 90)}
                        {machine.description.length > 90 ? '…' : ''}
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography variant="body2">{machine.reference || '—'}</Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2">{manufacturerLine || '—'}</Typography>
            </TableCell>
            <TableCell>
                <DataChip label={MACHINE_STATUS_LABELS[machine.status]} color={MACHINE_STATUS_COLORS[machine.status]} />
            </TableCell>
            <TableCell>
                {maintenance.label ? (
                    <DataChip
                        label={maintenance.label}
                        color={
                            maintenance.color === 'error'
                                ? theme.palette.error.main
                                : maintenance.color === 'warning'
                                  ? theme.palette.warning.main
                                  : theme.palette.grey[400]
                        }
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        —
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography variant="body2">{machine.links.length}</Typography>
            </TableCell>
            <TableCell align="right">
                <Tooltip title="Ouvrir la machine">
                    <IconButton size="small" onClick={handleButtonClick} aria-label="Ouvrir la machine">
                        <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});
