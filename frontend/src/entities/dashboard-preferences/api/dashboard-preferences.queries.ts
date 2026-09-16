/**
 * Dashboard Preferences query hooks.
 * @module entities/dashboard-preferences/api
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { DashboardPreferencesSchema, type DashboardPreferences } from '../model';
import { DEFAULT_PREFERENCES } from '../model/dashboard-preferences.defaults';
import { dashboardPreferencesKeys } from './dashboard-preferences.keys';

export function useDashboardPreferences() {
    return useQuery({
        queryKey: dashboardPreferencesKeys.detail(),
        queryFn: async ({ signal }): Promise<DashboardPreferences> => {
            try {
                const data = await api.get<DashboardPreferences>(
                    '/auth/dashboard-preferences/',
                    DashboardPreferencesSchema,
                    signal,
                );
                if (data.layout.length > 0) {
                    // Merge with defaults: ensure all default widgets exist in layout
                    const savedIds = new Set(data.layout.map((l) => l.i));
                    const missingWidgets = DEFAULT_PREFERENCES.layout.filter((l) => !savedIds.has(l.i));
                    return {
                        ...data,
                        layout: [...data.layout, ...missingWidgets],
                        widgets: { ...DEFAULT_PREFERENCES.widgets, ...data.widgets },
                    };
                }
            } catch (err) {
                // React Query cancels in-flight queries on unmount / refetch.
                // Those cancellations must propagate so the query state stays
                // coherent — otherwise we'd overwrite a valid cache with
                // DEFAULT_PREFERENCES and hide real failures.
                if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                    throw err;
                }
                if (import.meta.env.DEV) {
                    console.error('[DashboardPreferences] Fallback to defaults:', err);
                }
            }
            return DEFAULT_PREFERENCES;
        },
        staleTime: Infinity,
    });
}

export function useUpdateDashboardPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (prefs: DashboardPreferences): Promise<DashboardPreferences> => {
            const data = await api.post<DashboardPreferences>(
                '/auth/dashboard-preferences/',
                prefs,
                DashboardPreferencesSchema,
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(dashboardPreferencesKeys.detail(), data);
        },
    });
}
