/**
 * Date utilities - Parsing and formatting
 * @module shared/lib
 */

import dayjs from 'dayjs';

/**
 * Parse ISO date string to Date object
 * Returns null for null/undefined input
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Formate une Date en chaîne ISO date-only ('YYYY-MM-DD') à partir de ses
 * composantes LOCALES (via dayjs), jamais via toISOString().
 *
 * Pourquoi : les DatePicker produisent une Date à minuit LOCAL ; toISOString()
 * bascule en UTC et, pour les fuseaux à l'est d'UTC (Europe/Paris : UTC+1/+2),
 * renvoie la VEILLE ('YYYY-MM-DD' décalé de J-1). C'est l'utilitaire standard
 * pour sérialiser tout champ DateField backend (form → API).
 *
 * Retourne null pour une entrée null/undefined ou une Date invalide.
 */
export function formatDateToIso(date: Date | null | undefined): string | null {
    if (!date) return null;
    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

/**
 * Parse une date API 'YYYY-MM-DD' en Date à minuit LOCAL.
 *
 * Contrairement à `new Date('YYYY-MM-DD')` (minuit UTC, qui affiche J-1 à
 * l'ouest d'UTC), les composantes sont interprétées dans le fuseau local :
 * la date affichée correspond toujours à la date persistée. Tolère une chaîne
 * datetime ISO (seule la partie date avant le 'T' est retenue).
 *
 * Retourne null pour une entrée null/undefined ou non parsable.
 */
export function parseApiDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const [datePart] = iso.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    // Le constructeur Date « déborde » silencieusement les composantes hors
    // plage ('2026-02-30' → 2 mars, '2026-13-01' → janvier 2027) : on exige que
    // la Date reconstruite restitue exactement les composantes lues, sinon null.
    const isExact = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return isExact ? date : null;
}

/** Garde de type : Date non nulle et valide. */
function isValidDate(date: Date | null): date is Date {
    return date !== null && !isNaN(date.getTime());
}

/**
 * Semestre d'une date au format 'YYYY-S1' / 'YYYY-S2'.
 *
 * Utilise les composantes UTC (getUTCFullYear/getUTCMonth) : les dates métier
 * parsées depuis 'YYYY-MM-DD' via `new Date(...)` sont à minuit UTC, et un
 * getMonth() local pourrait glisser au 30 juin/1er juillet sur un fuseau
 * négatif. Janvier-juin → S1, juillet-décembre → S2.
 */
export function semesterOfDate(date: Date): string {
    return `${date.getUTCFullYear()}-S${date.getUTCMonth() < 6 ? 1 : 2}`;
}

/**
 * Formate la période semestrielle d'activité d'une campagne (R18).
 *
 * - start et end renseignés, même semestre  → '2027-S1'
 * - start et end renseignés, à cheval        → '2026-S2/2027-S1'
 * - une seule borne renseignée (cas courant d'une campagne en cours : début
 *   connu, fin inconnue) → la borne manquante est présumée égale au semestre
 *   d'attribution '{year}-{semester}', période pour laquelle la campagne est
 *   planifiée. Ex. campagne 2027-S1 assemblée dès septembre 2026 → '2026-S2/2027-S1'.
 * - aucune date valide                       → attribution '{year}-{semester}'
 *
 * Les deux bornes sont toujours rendues dans l'ordre chronologique.
 */
export function formatSemesterPeriod(
    start: Date | null,
    end: Date | null,
    fallbackYear: number,
    fallbackSemester: string,
): string {
    const attribution = `${fallbackYear}-${fallbackSemester}`;
    const startSemester = isValidDate(start) ? semesterOfDate(start) : attribution;
    const endSemester = isValidDate(end) ? semesterOfDate(end) : attribution;
    if (startSemester === endSemester) return startSemester;
    // Format 'YYYY-SN' : l'ordre lexical est l'ordre chronologique.
    const [first, last] = [startSemester, endSemester].sort();
    return `${first}/${last}`;
}

/**
 * Format Date for display (French locale, long format)
 * Example: "22 janvier 2026"
 */
export function formatDateDisplay(date: Date | null | undefined): string {
    if (!date) return '-';
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format Date for display (French locale, short format)
 * Example: "22/01/2026"
 * Accepts Date, string (ISO format), null, or undefined
 */
export function formatDateShort(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('fr-FR');
}
