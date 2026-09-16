/**
 * Couleurs d'accent des listes partagées.
 * @module features/task-list/lib
 *
 * Teintes alignées sur la palette Apple du thème (shared/ui/theme.ts) :
 * primary #007AFF, success #34C759, warning #FF9500, error #FF3B30.
 */

import type { TaskListColor } from '@entities/task-list';

/** Valeur CSS (hex) de chaque couleur de liste — pastilles et swatches. */
export const LIST_COLOR_VALUES: Record<TaskListColor, string> = {
    default: '#8E8E93',
    blue: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
    purple: '#AF52DE',
    red: '#FF3B30',
};

/** Libellés français des couleurs (aria-labels des swatches). */
export const LIST_COLOR_LABELS: Record<TaskListColor, string> = {
    default: 'Par défaut',
    blue: 'Bleu',
    green: 'Vert',
    orange: 'Orange',
    purple: 'Violet',
    red: 'Rouge',
};

/** Hex d'une couleur de liste (fallback sur `default`). */
export function getListColorValue(color: TaskListColor): string {
    return LIST_COLOR_VALUES[color] ?? LIST_COLOR_VALUES.default;
}
