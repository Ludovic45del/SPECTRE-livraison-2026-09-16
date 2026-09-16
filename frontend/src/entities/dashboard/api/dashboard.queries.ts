/**
 * Dashboard API hooks
 * @module entities/dashboard/api
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/api';
import { DashboardSchema, type Dashboard } from '../model/dashboard.schema';
import { dashboardKeys } from './dashboard.keys';

/**
 * Fetch aggregated dashboard data (counts + recent activity).
 * staleTime=30s avoids unnecessary refetches while keeping data reasonably fresh.
 */
export function useDashboardSummary() {
    return useQuery({
        queryKey: dashboardKeys.summary(),
        queryFn: async ({ signal }): Promise<Dashboard> => {
            const data = await api.get('/dashboard/', DashboardSchema, signal);
            return data;
        },
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
    });
}
