/**
 * Dashboard shared constants and types.
 * @module entities/dashboard/model/dashboard.constants
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
    embase: '#FF3B30',
    planning: '#5AC8FA',
    success: '#34C759',
} as const;

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'campaign' | 'fsec' | 'fa' | 'embase' | 'planning';

export interface KpiCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly subtitle: string;
    readonly color: string;
    readonly loading: boolean;
}

export interface DashboardActivityItem {
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
