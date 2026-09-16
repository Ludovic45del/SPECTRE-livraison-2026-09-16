/**
 * Catalog page helpers — colonnes + tri (alignés sur le pattern Campaigns).
 */

import { ELEMENT_STATUS, formatLocation, isElement, isLowStock, type StockCatalogItem } from '@entities/stock-item';

export type CatalogSortColumn =
    | 'name'
    | 'reference'
    | 'category'
    | 'structurationType'
    | 'fournisseur'
    | 'emplacement'
    | 'assignedFsec'
    | 'state';
export type SortDirection = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// Colonnes (mêmes proportions que pages/campaigns)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Largeurs des colonnes (total 100 %). L'ordre des clés DOIT suivre celui de
 * `CATALOG_COLUMNS` (+ `actions` en dernier) : le `<colgroup>` de CatalogTab
 * itère sur `Object.values(COLUMN_WIDTHS)`.
 */
export const COLUMN_WIDTHS = {
    name: '16%',
    reference: '10%',
    category: '11%',
    structurationType: '8%',
    fournisseur: '10%',
    emplacement: '10%',
    assignedFsec: '15%',
    state: '12%',
    actions: '8%',
} as const;

export const CATALOG_COLUMNS: { key: CatalogSortColumn; label: string; width: string }[] = [
    { key: 'name', label: 'Nom', width: COLUMN_WIDTHS.name },
    { key: 'reference', label: 'Référence', width: COLUMN_WIDTHS.reference },
    { key: 'category', label: 'Rubrique', width: COLUMN_WIDTHS.category },
    { key: 'structurationType', label: 'Type', width: COLUMN_WIDTHS.structurationType },
    { key: 'fournisseur', label: 'Fournisseur', width: COLUMN_WIDTHS.fournisseur },
    { key: 'emplacement', label: 'Emplacement', width: COLUMN_WIDTHS.emplacement },
    { key: 'assignedFsec', label: 'Campagne / FSEC', width: COLUMN_WIDTHS.assignedFsec },
    { key: 'state', label: 'État / Stock', width: COLUMN_WIDTHS.state },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rattachement Campagne / FSEC (R01)
// ─────────────────────────────────────────────────────────────────────────────

/** Contenu de la colonne « Campagne / FSEC » d'un item. */
export interface CatalogFsecAssignment {
    /**
     * - `assigned`    : FSEC réellement réservée (lien FSEC_ASSEMBLY_ITEM), élément non disponible.
     * - `declared`    : destination déclarative saisie à la création (`fsec_name`), sans réservation.
     * - `none`        : aucun rattachement (ou consommable).
     */
    kind: 'assigned' | 'declared' | 'none';
    fsecName: string | null;
    campaignName: string | null;
    fsecSlug: string | null;
}

const NO_ASSIGNMENT: CatalogFsecAssignment = { kind: 'none', fsecName: null, campaignName: null, fsecSlug: null };

/**
 * Détermine ce qu'affiche la colonne « Campagne / FSEC » :
 *  1. élément NON disponible avec une FSEC réellement réservée → `assigned` ;
 *  2. sinon, destination déclarative `fsecName` → `declared` ;
 *  3. sinon `none`.
 */
export function getCatalogFsecAssignment(item: StockCatalogItem): CatalogFsecAssignment {
    if (!isElement(item)) return NO_ASSIGNMENT;
    if (item.status !== ELEMENT_STATUS.DISPO && item.assignedFsecName) {
        return {
            kind: 'assigned',
            fsecName: item.assignedFsecName,
            campaignName: item.assignedCampaignName ?? null,
            fsecSlug: item.assignedFsecSlug ?? null,
        };
    }
    if (item.fsecName) {
        return { kind: 'declared', fsecName: item.fsecName, campaignName: null, fsecSlug: null };
    }
    return NO_ASSIGNMENT;
}

/** Clé de tri textuelle de la colonne « Campagne / FSEC » ('' si aucun rattachement). */
function assignmentSortKey(item: StockCatalogItem): string {
    const a = getCatalogFsecAssignment(item);
    if (a.kind === 'none') return '';
    return [a.campaignName, a.fsecName].filter((p): p is string => Boolean(p)).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Tri
// ─────────────────────────────────────────────────────────────────────────────

const stateRank = (item: StockCatalogItem): number => {
    if (item.kind === 'element') {
        switch (item.status) {
            case 'dispo':
                return 0;
            case 'reservee':
                return 1;
            case 'affectee':
                return 2;
            case 'tiree':
                return 3;
            default:
                return 4;
        }
    }
    // Consumable : stock bas → en haut
    if (isLowStock(item)) return 0;
    return 1;
};

export function sortCatalogItems(
    items: StockCatalogItem[],
    column: CatalogSortColumn,
    direction: SortDirection,
): StockCatalogItem[] {
    const multiplier = direction === 'asc' ? 1 : -1;
    const sorted = [...items];
    sorted.sort((a, b) => {
        let cmp = 0;
        switch (column) {
            case 'name':
                cmp = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
                break;
            case 'reference':
                cmp = (a.reference ?? '').localeCompare(b.reference ?? '', 'fr');
                break;
            case 'category':
                cmp = a.category.localeCompare(b.category, 'fr');
                break;
            case 'structurationType': {
                // Items sans type (hors structuration) groupés en fin de tri ascendant.
                const ta = a.structurationType;
                const tb = b.structurationType;
                if (ta === tb) cmp = 0;
                else if (ta === null) cmp = 1;
                else if (tb === null) cmp = -1;
                else cmp = ta.localeCompare(tb, 'fr');
                break;
            }
            case 'fournisseur':
                cmp = (a.fournisseur ?? '').localeCompare(b.fournisseur ?? '', 'fr', { sensitivity: 'base' });
                break;
            case 'emplacement':
                cmp = formatLocation(a).localeCompare(formatLocation(b), 'fr', { sensitivity: 'base' });
                break;
            case 'assignedFsec': {
                // Items sans rattachement groupés en fin de tri ascendant.
                const ka = assignmentSortKey(a);
                const kb = assignmentSortKey(b);
                if (ka === kb) cmp = 0;
                else if (ka === '') cmp = 1;
                else if (kb === '') cmp = -1;
                else cmp = ka.localeCompare(kb, 'fr', { sensitivity: 'base' });
                break;
            }
            case 'state':
                cmp = stateRank(a) - stateRank(b);
                break;
        }
        return cmp * multiplier;
    });
    return sorted;
}
