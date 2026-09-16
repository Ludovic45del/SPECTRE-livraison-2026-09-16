/**
 * Dashboard grid — CSS grid with reorder support in edit mode.
 * @module features/dashboard/ui
 *
 * In edit mode, moves/removes modify a local draft only.
 * Changes are persisted when the user clicks "Sauvegarder" in WelcomeHeader.
 */

import { memo, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';

import { useDashboardPreferences, type LayoutItem } from '@entities/dashboard-preferences';
import { SharedTasksWidget } from '@features/task-list';
import { useDashboardStore } from '../model/dashboard.store';
import { DashboardWidget } from './DashboardWidget';

import KpisWidget from './widgets/KpisWidget';
import PlanningWidget from './widgets/PlanningWidget';
import ActivityWidget from './widgets/ActivityWidget';
import ShortcutsWidget from './widgets/ShortcutsWidget';
import TodosWidget from './widgets/TodosWidget';

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
    kpis: KpisWidget,
    planning: PlanningWidget,
    activity: ActivityWidget,
    shortcuts: ShortcutsWidget,
    todos: TodosWidget,
    sharedTasks: SharedTasksWidget,
};

const WidgetSlot = memo(function WidgetSlot({
    item,
    isEditMode,
    isFirst,
    isLast,
    onRemove,
    onMove,
}: {
    readonly item: LayoutItem;
    readonly isEditMode: boolean;
    readonly isFirst: boolean;
    readonly isLast: boolean;
    readonly onRemove?: (id: string) => void;
    readonly onMove?: (id: string, dir: 'up' | 'down') => void;
}) {
    const WidgetComp = WIDGET_COMPONENTS[item.i];
    if (!WidgetComp) return null;
    return (
        <Box sx={{ gridColumn: `span ${item.w}`, minHeight: item.h * 80 }}>
            <DashboardWidget
                widgetId={item.i}
                onRemove={isEditMode ? onRemove : undefined}
                onMoveUp={isEditMode && !isFirst ? onMove : undefined}
                onMoveDown={isEditMode && !isLast ? onMove : undefined}
            >
                <WidgetComp />
            </DashboardWidget>
        </Box>
    );
});

export default function DashboardGrid() {
    const { data: savedPrefs } = useDashboardPreferences();
    const { isEditMode, draftPrefs, updateDraft } = useDashboardStore();

    // In edit mode, use the local draft; otherwise use persisted prefs.
    const prefs = isEditMode ? draftPrefs : savedPrefs;

    const visibleWidgets = useMemo(() => {
        if (!prefs) return [];
        return prefs.layout.filter((l) => {
            const widgetConfig = prefs.widgets[l.i];
            return widgetConfig?.visible !== false && WIDGET_COMPONENTS[l.i];
        });
    }, [prefs]);

    const handleRemoveWidget = useCallback(
        (widgetId: string) => {
            updateDraft((draft) => ({
                ...draft,
                widgets: { ...draft.widgets, [widgetId]: { visible: false } },
            }));
        },
        [updateDraft],
    );

    const handleMoveWidget = useCallback(
        (widgetId: string, direction: 'up' | 'down') => {
            updateDraft((draft) => {
                const layout = [...draft.layout];
                const idx = layout.findIndex((l) => l.i === widgetId);
                if (idx < 0) return draft;

                const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
                if (swapIdx < 0 || swapIdx >= layout.length) return draft;

                [layout[idx], layout[swapIdx]] = [layout[swapIdx], layout[idx]];
                return { ...draft, layout };
            });
        },
        [updateDraft],
    );

    if (!prefs) return null;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, alignItems: 'stretch' }}>
            {visibleWidgets.map((item, index) => (
                <WidgetSlot
                    key={item.i}
                    item={item}
                    isEditMode={isEditMode}
                    isFirst={index === 0}
                    isLast={index === visibleWidgets.length - 1}
                    onRemove={handleRemoveWidget}
                    onMove={handleMoveWidget}
                />
            ))}
        </Box>
    );
}
