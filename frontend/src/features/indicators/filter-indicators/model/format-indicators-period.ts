/**
 * Libellé de la période filtrée des pages indicateurs, au format semestriel
 * compact aligné sur la colonne « Période » des campagnes.
 * @module features/indicators/filter-indicators/model
 *
 * - semestre filtré → '2027-S1'
 * - année entière   → '2027-S1/2027-S2'
 *
 * Helper unique partagé par les trois pages indicateurs (campagne, FA, FSEC)
 * pour remplacer les `periodLabel` dupliqués.
 */

import type { SemesterFilter } from './filter-indicators.store';

export function formatIndicatorsPeriod(year: number, semester: SemesterFilter): string {
    if (semester === null) {
        return `${year}-S1/${year}-S2`;
    }
    return `${year}-S${semester}`;
}
