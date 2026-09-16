/**
 * Dashboard Preferences Zod schemas.
 * @module entities/dashboard-preferences/model
 */

import { z } from 'zod';

export const LayoutItemSchema = z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    minW: z.number().optional(),
    minH: z.number().optional(),
});

export type LayoutItem = z.infer<typeof LayoutItemSchema>;

export const ShortcutSchema = z.object({
    id: z.string(),
    label: z.string(),
    url: z.string(),
    icon: z.string(),
    category: z.string(),
});

export type Shortcut = z.infer<typeof ShortcutSchema>;

export const WidgetConfigSchema = z.object({
    visible: z.boolean(),
});

export const TodoItemSchema = z.object({
    id: z.string(),
    text: z.string(),
    done: z.boolean(),
});

export type TodoItem = z.infer<typeof TodoItemSchema>;

export const DashboardPreferencesSchema = z.object({
    layout: z.array(LayoutItemSchema),
    widgets: z.record(z.string(), WidgetConfigSchema),
    shortcuts: z.array(ShortcutSchema),
    todos: z.array(TodoItemSchema).optional().default([]),
});

export type DashboardPreferences = z.infer<typeof DashboardPreferencesSchema>;
