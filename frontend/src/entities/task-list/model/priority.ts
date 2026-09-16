/**
 * Métadonnées UI des priorités de tâches.
 * @module entities/task-list/model
 *
 * Source unique pour l'ordre de tri, les libellés FR et les couleurs des
 * priorités — consommée par TaskRow, TaskListBoard et TaskDetailsDialog.
 */

import type { TaskPriority } from './task-list.schema';

/** Poids de tri : plus la valeur est haute, plus la priorité est importante. */
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
    low: 0,
    normal: 1,
    high: 2,
    critical: 3,
};

/** Libellés français des priorités. */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
    critical: 'Critique',
    high: 'Haute',
    normal: 'Normale',
    low: 'Basse',
};

/** Couleur MUI (palette) associée à chaque priorité (chips, selects). */
export const PRIORITY_MUI_COLORS: Record<TaskPriority, 'error' | 'warning' | 'info' | 'default'> = {
    critical: 'error',
    high: 'warning',
    normal: 'info',
    low: 'default',
};

/**
 * Couleur `sx` (chemin palette) du drapeau/point de priorité.
 * `low` retombe sur text.disabled (gris) : pas de teinte "default" en palette.
 */
export const PRIORITY_SX_COLORS: Record<TaskPriority, string> = {
    critical: 'error.main',
    high: 'warning.main',
    normal: 'info.main',
    low: 'text.disabled',
};

/** Priorités triées de la plus importante à la moins importante. */
export const PRIORITIES_DESC: readonly TaskPriority[] = ['critical', 'high', 'normal', 'low'];

/**
 * Comparateur de priorités pour Array.sort — ordre DÉCROISSANT
 * (critical en premier, low en dernier).
 *
 * @example
 * tasks.sort((a, b) => comparePriority(a.priority, b.priority) || a.position - b.position);
 */
export function comparePriority(a: TaskPriority, b: TaskPriority): number {
    return PRIORITY_ORDER[b] - PRIORITY_ORDER[a];
}
