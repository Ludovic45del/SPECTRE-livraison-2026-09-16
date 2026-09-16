/**
 * Dashboard shared constants and types.
 * @module pages/home/constants
 */

import { motion } from '@shared/ui/motion';

// ============================================================================
// Design Tokens
// ============================================================================

// Transition par défaut pour les composants dashboard (cards, kpis, feed).
// Aligné sur le token `medium` (300ms / M3 emphasized).
export const TRANSITION = motion.medium;
export const ACTIVITY_FEED_LIMIT = 10;

export const BRAND_COLORS = {
    campaign: '#007AFF',
    fsec: '#5856D6',
    fa: '#FF9500',
    success: '#34C759',
} as const;

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'campaign' | 'fsec' | 'fa';

export interface KpiCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly subtitle: string;
    readonly color: string;
    readonly loading: boolean;
}

export interface DonutSegment {
    readonly label: string;
    readonly value: number;
    readonly color: string;
}

export interface ActivityItem {
    readonly id: string;
    readonly type: EntityType;
    readonly name: string;
    readonly detail: string;
    readonly date: Date | null;
    readonly statusLabel: string;
    readonly statusColor: string;
    readonly link: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Safely coerce a nullable color to a string */
export function safeColor(color: string | null | undefined, fallback = '#666'): string {
    return color ?? fallback;
}

/** Format a date as a human-readable French relative string */
export function formatDateRelative(date: Date | null): string {
    if (!date) return '—';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Generic counting helper — counts items by a numeric key, then maps
 * a referential Record<id, {label, color}> into DonutSegment[].
 * Filters out zero-value segments to keep charts clean.
 */
export function buildSegments<T>(
    items: readonly T[] | undefined,
    getKey: (item: T) => number | null | undefined,
    referential: Record<number, { label: string; color: string | null }>,
): DonutSegment[] {
    if (!items) return [];
    const counts: Record<number, number> = {};
    for (const item of items) {
        const key = getKey(item);
        if (key !== null && key !== undefined) {
            counts[key] = (counts[key] || 0) + 1;
        }
    }
    return Object.entries(referential)
        .map(([idStr, info]) => ({
            label: info.label,
            value: counts[Number(idStr)] || 0,
            color: safeColor(info.color),
        }))
        .filter((s) => s.value > 0);
}
