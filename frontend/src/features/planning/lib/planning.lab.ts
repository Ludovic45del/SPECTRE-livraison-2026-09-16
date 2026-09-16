/**
 * Planning « Vie Labo » — source de données.
 * @module features/planning/lib
 *
 * Les salles et machines de la Vie Labo proviennent directement du module
 * Matériel (salles B1/B2/A13 + parc machines). Seules les machines en service
 * sont affichées dans le planning.
 */

import { useMemo } from 'react';
import { useMachineRooms, useMachines, MACHINE_STATUS } from '@entities/material';

/** Machine affichée comme ligne dans la Vie Labo. */
export interface PlanningMachine {
    uuid: string;
    name: string;
}

/** Salle regroupant ses machines dans la Vie Labo. */
export interface PlanningSalle {
    uuid: string;
    name: string;
    machines: PlanningMachine[];
}

/**
 * Construit la hiérarchie salles → machines de la Vie Labo à partir du
 * module Matériel. Filtre les machines hors service.
 */
export function usePlanningLabSalles(): PlanningSalle[] {
    const { data: rooms = [] } = useMachineRooms();
    const { data: machines = [] } = useMachines();

    return useMemo(
        () =>
            [...rooms]
                .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
                .map((room) => ({
                    uuid: String(room.id),
                    name: room.code,
                    machines: machines
                        .filter((m) => m.roomId === room.id && m.status === MACHINE_STATUS.IN_SERVICE)
                        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                        .map((m) => ({ uuid: m.uuid, name: m.name })),
                })),
        [rooms, machines],
    );
}
