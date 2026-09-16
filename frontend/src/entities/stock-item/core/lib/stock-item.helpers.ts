/**
 * Stock Catalog Item — pure helpers (formatters, predicates).
 */

import {
    CATEGORY_LABELS,
    ELEMENT_STATUS_LABELS,
    EXPIRATION_WARNING_DAYS,
    INSTALLATION_LABELS,
    ITEM_KIND,
    ITEM_KIND_LABELS,
    type CategoryCode,
    type ElementStatus,
    type Installation,
    type ItemKind,
} from '../model/stock.constants';
import type { StockCatalogItem } from '../model/stock-item.schema';

// ─────────────────────────────────────────────────────────────────────────────
// Label getters
// ─────────────────────────────────────────────────────────────────────────────

export const getKindLabel = (kind: ItemKind | null | undefined): string => (kind ? ITEM_KIND_LABELS[kind] : '—');

export const getCategoryLabel = (code: CategoryCode | null | undefined): string => (code ? CATEGORY_LABELS[code] : '—');

export const getElementStatusLabel = (status: ElementStatus | null | undefined): string =>
    status ? ELEMENT_STATUS_LABELS[status] : '—';

export const getInstallationLabel = (i: Installation | null | undefined): string => (i ? INSTALLATION_LABELS[i] : '—');

// ─────────────────────────────────────────────────────────────────────────────
// Predicates
// ─────────────────────────────────────────────────────────────────────────────

export const isElement = (item: StockCatalogItem): boolean => item.kind === ITEM_KIND.ELEMENT;

export const isConsumable = (item: StockCatalogItem): boolean => item.kind === ITEM_KIND.CONSUMABLE;

/** Stock bas : kind=consumable AND seuil_alerte défini AND quantite ≤ seuil. */
export const isLowStock = (item: StockCatalogItem): boolean =>
    isConsumable(item) && item.seuilAlerte !== null && item.quantite !== null && item.quantite <= item.seuilAlerte;

/** Périmé : date_peremption ≤ today. */
export const isExpired = (item: StockCatalogItem, today: Date = new Date()): boolean => {
    if (!item.datePeremption) return false;
    return startOfDay(item.datePeremption).getTime() <= startOfDay(today).getTime();
};

/** Péremption proche : today < date_peremption ≤ today + days_ahead. */
export const isExpiringSoon = (
    item: StockCatalogItem,
    today: Date = new Date(),
    daysAhead: number = EXPIRATION_WARNING_DAYS,
): boolean => {
    if (!item.datePeremption) return false;
    const t0 = startOfDay(today).getTime();
    const tDeadline = startOfDay(today).getTime() + daysAhead * 24 * 60 * 60 * 1000;
    const tPerem = startOfDay(item.datePeremption).getTime();
    return tPerem > t0 && tPerem <= tDeadline;
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

export function formatLocation(item: StockCatalogItem): string {
    const parts = [item.boite, item.emplacement].filter((p): p is string => Boolean(p));
    return parts.length === 0 ? '—' : parts.join(' · ');
}

export function formatQuantity(item: StockCatalogItem): string {
    if (item.quantite === null || item.unite === null) return '—';
    return `${item.quantite} ${item.unite}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
