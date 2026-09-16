export const dashboardPreferencesKeys = {
    all: ['dashboard-preferences'] as const,
    detail: () => [...dashboardPreferencesKeys.all, 'detail'] as const,
};
