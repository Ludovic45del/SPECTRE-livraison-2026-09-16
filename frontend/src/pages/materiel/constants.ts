/**
 * Matériel — constantes du tableau récap (aligné sur le pattern FSEC/Embases).
 * @module pages/materiel/constants
 */

import type { MachineSortColumn } from './machines-list-utils';

export const MACHINE_COLUMN_WIDTHS = {
    room: '8%',
    name: '21%',
    reference: '12%',
    manufacturer: '17%',
    status: '13%',
    nextMaintenance: '15%',
    links: '8%',
    actions: '6%',
} as const;

export const MACHINE_COLUMNS: { key: MachineSortColumn; label: string; width: string }[] = [
    { key: 'room', label: 'Salle', width: MACHINE_COLUMN_WIDTHS.room },
    { key: 'name', label: 'Machine', width: MACHINE_COLUMN_WIDTHS.name },
    { key: 'reference', label: 'Référence', width: MACHINE_COLUMN_WIDTHS.reference },
    { key: 'manufacturer', label: 'Fabricant / Modèle', width: MACHINE_COLUMN_WIDTHS.manufacturer },
    { key: 'status', label: 'Statut', width: MACHINE_COLUMN_WIDTHS.status },
    {
        key: 'nextMaintenance',
        label: 'Prochaine maintenance',
        width: MACHINE_COLUMN_WIDTHS.nextMaintenance,
    },
    { key: 'links', label: 'Liens', width: MACHINE_COLUMN_WIDTHS.links },
];
