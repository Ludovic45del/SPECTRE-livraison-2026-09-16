/**
 * Transformation d'une série mensuelle API en points de chart.
 * @module pages/indicateurs/lib
 *
 * Fonctions pures, isolées du composant MonthlyLineChart pour rester
 * testables sans recharts et compatibles avec le Fast Refresh (un fichier
 * composant ne doit exporter que des composants).
 */

export const MONTH_LABELS_FR = [
    'Janv.',
    'Févr.',
    'Mars',
    'Avr.',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
] as const;

export interface MonthlyChartPoint {
    /** Libellé du point sur l'axe X (mois, suffixé de l'année si multi-années). */
    month: string;
    count: number;
}

/**
 * Transforme une série mensuelle {clé 'YYYY-MM' → count} en points de chart.
 *
 * - Tri lexical des clés = tri chronologique (clés zéro-paddées), quel que
 *   soit l'ordre d'insertion renvoyé par l'API.
 * - Les événements hors période restent affichés (sémantique métier assumée :
 *   une campagne S1 peut démarrer avant la période, cf. repository backend).
 * - Dès que la série couvre plusieurs années, le libellé est suffixé de
 *   l'année ('Août 2026' avant 'Janv. 2027') : sans cela un simple 'Août'
 *   placé avant 'Janvier' est illisible et deux clés '2026-08'/'2027-08'
 *   seraient ambiguës.
 * - Une clé au mois non reconnu est affichée telle quelle (pas de crash).
 */
export function toMonthlyChartData(series: Record<string, number>): MonthlyChartPoint[] {
    const sortedKeys = Object.keys(series).sort();
    const multiYear = new Set(sortedKeys.map((key) => key.split('-')[0])).size > 1;
    return sortedKeys.map((key) => {
        const [year, month] = key.split('-');
        const label = MONTH_LABELS_FR[Number(month) - 1];
        return {
            month: label ? (multiYear ? `${label} ${year}` : label) : key,
            count: series[key] ?? 0,
        };
    });
}
