/**
 * FA Sort utility
 * @module entities/fa/core/lib
 *
 * Generic sort function for FA lists, shared across FasPage and CampaignFasPage.
 */

import type { Fa } from '../model';

export type FaSortColumn = 'identifier' | 'fsec' | 'status' | 'criticality' | 'type5m' | 'eventDate';

interface FaSortable extends Fa {
    // `fsecName` est désormais déclaré sur `Fa` (string | null). `fsecIndex` reste
    // un fallback historique (tri par index dans la liste des FSECs côté front).
    fsecIndex?: number;
}

/**
 * Sort an array of FA items by the given column and direction.
 *
 * - `fsec` column: uses `fsecName` (localeCompare) when available, falls back to `fsecIndex`.
 * - Other columns behave identically to the previous per-page implementations.
 */
export function sortFas<T extends FaSortable>(items: T[], column: FaSortColumn, direction: 'asc' | 'desc'): T[] {
    const sorted = [...items];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 'identifier':
                comparison = a.identifier.localeCompare(b.identifier);
                break;
            case 'fsec':
                if (a.fsecName != null && b.fsecName != null) {
                    comparison = a.fsecName.localeCompare(b.fsecName);
                } else {
                    comparison = (a.fsecIndex ?? Number.MAX_SAFE_INTEGER) - (b.fsecIndex ?? Number.MAX_SAFE_INTEGER);
                }
                break;
            case 'status':
                comparison = (a.statusId ?? 0) - (b.statusId ?? 0);
                break;
            case 'criticality':
                comparison = (a.criticalityId ?? -1) - (b.criticalityId ?? -1);
                break;
            case 'type5m':
                comparison = (a.typeId ?? -1) - (b.typeId ?? -1);
                break;
            case 'eventDate': {
                const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
                const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
                comparison = dateA - dateB;
                break;
            }
        }
        return comparison * multiplier;
    });

    return sorted;
}
