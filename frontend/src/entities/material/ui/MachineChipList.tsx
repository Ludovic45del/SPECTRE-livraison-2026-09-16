/**
 * MachineChipList — affichage en lecture seule des machines liées (chips).
 * @module entities/material/ui
 *
 * Résout les noms des machines à partir de leurs UUIDs. Les machines hors
 * service sont rendues en chip outlined grisée.
 */

import { memo, useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useMachineRooms } from '../api/rooms.queries';
import { useMachines } from '../api/machines.queries';
import { MACHINE_STATUS } from '../model';

export interface MachineChipListProps {
    /** UUIDs des machines à afficher. */
    uuids: string[];
    /** Code de la salle dont proviennent les machines. */
    roomCode: 'B1' | 'B2';
    /** Texte affiché quand aucune machine n'est liée. */
    emptyText?: string;
}

export const MachineChipList = memo(function MachineChipList({
    uuids,
    roomCode,
    emptyText = 'Aucune machine',
}: MachineChipListProps) {
    const { data: rooms } = useMachineRooms();

    const roomId = useMemo(() => rooms?.find((room) => room.code === roomCode)?.id ?? null, [rooms, roomCode]);

    const { data: machines } = useMachines(roomId);

    const items = useMemo(
        () =>
            uuids
                .map((uuid) => machines?.find((machine) => machine.uuid === uuid))
                .filter((machine): machine is NonNullable<typeof machine> => Boolean(machine)),
        [uuids, machines],
    );

    if (uuids.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                {emptyText}
            </Typography>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {items.map((machine) => {
                const outOfService = machine.status !== MACHINE_STATUS.IN_SERVICE;
                return (
                    <Chip
                        key={machine.uuid}
                        label={machine.name}
                        size="small"
                        variant={outOfService ? 'outlined' : 'filled'}
                        color={outOfService ? 'default' : 'primary'}
                    />
                );
            })}
        </Box>
    );
});
