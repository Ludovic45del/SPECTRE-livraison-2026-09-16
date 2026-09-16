/**
 * Planning Query Keys - TanStack Query Key Factory
 * @module entities/planning/api
 */

export const planningKeys = {
    all: ['planning'] as const,

    weekStates: () => [...planningKeys.all, 'week-states'] as const,
    weekStatesByYear: (year: number) => [...planningKeys.weekStates(), year] as const,

    memberPeriods: () => [...planningKeys.all, 'member-periods'] as const,
    memberPeriodsByYear: (year: number) => [...planningKeys.memberPeriods(), year] as const,

    cellAnnotations: () => [...planningKeys.all, 'cell-annotations'] as const,
    cellAnnotationsByYear: (year: number) => [...planningKeys.cellAnnotations(), year] as const,

    fsecCellLinks: () => [...planningKeys.all, 'fsec-cell-links'] as const,
    fsecCellLinksByYear: (year: number) => [...planningKeys.fsecCellLinks(), year] as const,

    campaignSteps: () => [...planningKeys.all, 'campaign-steps'] as const,
    campaignStepsByYear: (year: number) => [...planningKeys.campaignSteps(), year] as const,

    planningSteps: () => [...planningKeys.all, 'planning-steps'] as const,

    labEvents: () => [...planningKeys.all, 'lab-events'] as const,
};
