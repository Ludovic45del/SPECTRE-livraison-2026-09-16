/**
 * Matériel — helpers de filtrage et tri des machines.
 * @module pages/materiel/machines-list-utils
 *
 * Fonctions pures, miroir du pattern `fsec-list-utils.ts`.
 */

import dayjs from 'dayjs';
import { MACHINE_STATUS_LABELS, type Machine, type MachineRoom, type MachineStatus } from '@entities/material';

export type MachineSortColumn = 'room' | 'name' | 'reference' | 'manufacturer' | 'status' | 'nextMaintenance' | 'links';

export interface MachinesFilters {
    /** Recherche libre (nom, référence, fabricant, modèle, description). */
    search: string;
    /** Statut filtré, null = tous. */
    status: MachineStatus | null;
    /** Salle filtrée (id), null = toutes. */
    roomId: number | null;
}

export function filterMachines(machines: Machine[], filters: MachinesFilters): Machine[] {
    const query = filters.search.trim().toLowerCase();
    return machines.filter((m) => {
        if (filters.status && m.status !== filters.status) return false;
        if (filters.roomId !== null && m.roomId !== filters.roomId) return false;
        if (!query) return true;
        const haystack = [m.name, m.reference, m.manufacturer, m.model, m.description].join(' ').toLowerCase();
        return haystack.includes(query);
    });
}

function compare(a: string | number | null, b: string | number | null): number {
    if (a === b) return 0;
    if (a === null || a === '') return 1;
    if (b === null || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'fr');
}

function machineSortValue(
    machine: Machine,
    column: MachineSortColumn,
    roomLabelById: Map<number, string>,
): string | number | null {
    switch (column) {
        case 'room':
            return roomLabelById.get(machine.roomId) ?? null;
        case 'name':
            return machine.name;
        case 'reference':
            return machine.reference || null;
        case 'manufacturer':
            return [machine.manufacturer, machine.model].filter(Boolean).join(' / ') || null;
        case 'status':
            return MACHINE_STATUS_LABELS[machine.status];
        case 'nextMaintenance':
            return machine.nextMaintenanceDate ? dayjs(machine.nextMaintenanceDate).valueOf() : null;
        case 'links':
            return machine.links.length;
    }
}

export function sortMachines(
    machines: Machine[],
    column: MachineSortColumn,
    direction: 'asc' | 'desc',
    rooms: MachineRoom[] = [],
): Machine[] {
    const roomLabelById = new Map(rooms.map((r) => [r.id, r.code]));
    const factor = direction === 'asc' ? 1 : -1;
    return [...machines].sort(
        (a, b) =>
            compare(machineSortValue(a, column, roomLabelById), machineSortValue(b, column, roomLabelById)) * factor,
    );
}
