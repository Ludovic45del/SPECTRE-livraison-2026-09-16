/**
 * Widget registry — maps widget IDs to metadata.
 * @module features/dashboard/lib
 */

import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';

import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import ChecklistIcon from '@mui/icons-material/Checklist';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

export interface WidgetMeta {
    label: string;
    icon: ComponentType<SvgIconProps>;
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
    kpis: { label: 'KPIs', icon: BarChartIcon },
    planning: { label: 'Planning', icon: CalendarTodayIcon },
    activity: { label: 'Activité récente', icon: AccessTimeIcon },
    shortcuts: { label: 'Raccourcis', icon: LinkIcon },
    todos: { label: 'Liste de tâches', icon: ChecklistIcon },
    sharedTasks: { label: 'Listes partagées', icon: PlaylistAddCheckIcon },
};
