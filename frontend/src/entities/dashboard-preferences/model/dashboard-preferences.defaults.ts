/**
 * Default dashboard layout — matches the current hardcoded home page.
 * @module entities/dashboard-preferences/model
 */

import type { DashboardPreferences } from './dashboard-preferences.schema';

export const WIDGET_IDS = ['kpis', 'planning', 'activity', 'shortcuts', 'todos', 'sharedTasks'] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const DEFAULT_PREFERENCES: DashboardPreferences = {
    layout: [
        { i: 'kpis', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
        { i: 'planning', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'activity', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'shortcuts', x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2 },
        { i: 'todos', x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2 },
        { i: 'sharedTasks', x: 0, y: 9, w: 6, h: 4, minW: 4, minH: 3 },
    ],
    widgets: {
        kpis: { visible: true },
        planning: { visible: true },
        activity: { visible: true },
        shortcuts: { visible: true },
        todos: { visible: true },
        sharedTasks: { visible: true },
    },
    shortcuts: [],
    todos: [],
};
