/**
 * Dashboard query keys
 * @module entities/dashboard/api
 */
export const dashboardKeys = {
    all: ['dashboard'] as const,
    summary: () => [...dashboardKeys.all, 'summary'] as const,
};
