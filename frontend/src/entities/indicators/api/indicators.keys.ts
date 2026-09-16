/**
 * Indicators Query Keys - TanStack Query Key Factory
 * @module entities/indicators/api
 */

export const indicatorsKeys = {
    all: ['indicators'] as const,
    byPeriod: (year: number, semester: number | null) => [...indicatorsKeys.all, year, semester ?? 'all'] as const,
};
