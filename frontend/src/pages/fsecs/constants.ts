/**
 * FSECs List Page - Constants
 * @module pages/fsecs/constants
 */

import type { SortColumn } from './fsec-list-utils';

// La colonne « Nom » affiche le nom complet ({year}-{installation}_{campagne}_{nom}) :
// elle est plus large que les autres.
export const COLUMN_WIDTHS = {
    name: '30%',
    campaign: '18%',
    year: '10%',
    status: '17%',
    category: '17%',
    actions: '8%',
} as const;

export const COLUMNS: { key: SortColumn; label: string; width: string }[] = [
    { key: 'name', label: 'Nom', width: COLUMN_WIDTHS.name },
    { key: 'campaign', label: 'Campagne associ\u00e9e', width: COLUMN_WIDTHS.campaign },
    { key: 'year', label: 'Ann\u00e9e', width: COLUMN_WIDTHS.year },
    { key: 'status', label: 'Statut', width: COLUMN_WIDTHS.status },
    { key: 'category', label: 'Cat\u00e9gorie', width: COLUMN_WIDTHS.category },
];
