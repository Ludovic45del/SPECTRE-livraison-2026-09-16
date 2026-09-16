/**
 * Helpers d'affichage du tableau récap (onglet Assemblage).
 */

/** Séparateur affiché pour une valeur absente. */
export const EMPTY_VALUE = '—';

/**
 * Formate une masse en milligrammes pour l'affichage.
 *
 * Float côté backend → on borne à 3 décimales et on repasse par `Number` pour
 * éliminer le bruit binaire (`0.30000000000000004` → `0,3`) avant un formatage
 * locale fr (séparateur décimal virgule, milliers espacés).
 */
export function formatMasseMg(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_VALUE;
    const rounded = Number(value.toFixed(3));
    return rounded.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}
