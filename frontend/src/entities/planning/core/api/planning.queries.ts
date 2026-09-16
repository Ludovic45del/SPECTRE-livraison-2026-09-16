/**
 * Planning API Service - TanStack Query Hooks
 * @module entities/planning/api
 *
 * Endpoints:
 * - GET/POST /planning/week-states/?year=YYYY
 * - DELETE   /planning/week-states/{uuid}/
 * - GET/POST /planning/member-periods/?year=YYYY
 * - DELETE   /planning/member-periods/{uuid}/
 * - GET      /planning/cell-annotations/?year=YYYY
 * - GET      /planning/fsec-cell-links/?year=YYYY
 * - GET/POST /planning/campaign-steps/?year=YYYY
 * - GET/POST /planning/lab-events/
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, REFERENTIAL_CACHE_CONFIG } from '@shared/lib';
import { useNotificationStore } from '@shared/lib/notification';
import {
    LabEvent,
    LabEventCreate,
    LabEventListSchema,
    LabEventSchema,
    PlanningCellAnnotation,
    PlanningCellAnnotationListSchema,
    PlanningFsecCellLink,
    PlanningFsecCellLinkListSchema,
    PlanningMemberPeriod,
    PlanningMemberPeriodCreate,
    PlanningMemberPeriodListSchema,
    PlanningMemberPeriodSchema,
    PlanningCampaignStep,
    PlanningCampaignStepCreate,
    PlanningCampaignStepListSchema,
    PlanningCampaignStepSchema,
    PlanningWeekState,
    PlanningWeekStateCreate,
    PlanningWeekStateListSchema,
    PlanningWeekStateSchema,
    PlanningStep,
    PlanningStepListSchema,
    labEventCreateToApi,
    planningCampaignStepCreateToApi,
    planningMemberPeriodCreateToApi,
    planningWeekStateCreateToApi,
} from '../model/planning.schema';
import { planningKeys } from './planning.keys';

function handleMutationError(error: unknown): void {
    let msg = 'Une erreur est survenue';
    if (error instanceof Error) {
        // Extraire les details du backend si disponibles (ApiError avec data.error)
        const apiErr = error as Error & { status?: number; data?: { error?: string } };
        if (apiErr.data?.error) {
            msg = apiErr.data.error;
        } else if (apiErr.status === 400) {
            msg = 'Données invalides. Vérifiez les champs du formulaire.';
        } else if (apiErr.status === 404) {
            msg = 'Ressource introuvable.';
        } else if (apiErr.status === 409) {
            msg = 'Conflit : cette donnée existe déjà.';
        } else {
            msg = error.message;
        }
    }
    useNotificationStore.getState().showError(msg);
}

// ====================== WEEK STATES ======================

export function useWeekStates(year: number) {
    return useQuery({
        queryKey: planningKeys.weekStatesByYear(year),
        queryFn: ({ signal }): Promise<PlanningWeekState[]> =>
            api.get(`/planning/week-states/?year=${year}`, PlanningWeekStateListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useUpsertWeekState() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PlanningWeekStateCreate): Promise<PlanningWeekState> => {
            const response = await api.post('/planning/week-states/', planningWeekStateCreateToApi(data));
            return PlanningWeekStateSchema.parse(response);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.weekStatesByYear(result.year) });
        },
        onError: handleMutationError,
    });
}

export function useDeleteWeekState() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid }: { uuid: string; year: number }): Promise<void> => {
            await api.delete(`/planning/week-states/${uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.weekStatesByYear(variables.year) });
        },
        onError: handleMutationError,
    });
}

// ====================== MEMBER PERIODS ======================

export function useMemberPeriods(year: number) {
    return useQuery({
        queryKey: planningKeys.memberPeriodsByYear(year),
        queryFn: ({ signal }): Promise<PlanningMemberPeriod[]> =>
            api.get(`/planning/member-periods/?year=${year}`, PlanningMemberPeriodListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useCreateMemberPeriod() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PlanningMemberPeriodCreate): Promise<PlanningMemberPeriod> => {
            const response = await api.post('/planning/member-periods/', planningMemberPeriodCreateToApi(data));
            return PlanningMemberPeriodSchema.parse(response);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.memberPeriodsByYear(result.year) });
        },
        onError: handleMutationError,
    });
}

export function useUpdateMemberPeriod() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uuid,
            data,
        }: {
            uuid: string;
            data: PlanningMemberPeriodCreate;
        }): Promise<PlanningMemberPeriod> => {
            const response = await api.patch(
                `/planning/member-periods/${uuid}/`,
                planningMemberPeriodCreateToApi(data),
            );
            return PlanningMemberPeriodSchema.parse(response);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.memberPeriodsByYear(result.year) });
        },
        onError: handleMutationError,
    });
}

export function useDeleteMemberPeriod() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid }: { uuid: string; year: number }): Promise<void> => {
            await api.delete(`/planning/member-periods/${uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.memberPeriodsByYear(variables.year) });
        },
        onError: handleMutationError,
    });
}

// ====================== CELL ANNOTATIONS (lecture seule) ======================

export function useCellAnnotations(year: number) {
    return useQuery({
        queryKey: planningKeys.cellAnnotationsByYear(year),
        queryFn: ({ signal }): Promise<PlanningCellAnnotation[]> =>
            api.get(`/planning/cell-annotations/?year=${year}`, PlanningCellAnnotationListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

// ====================== FSEC CELL LINKS (lecture seule) ======================

export function useFsecCellLinks(year: number) {
    return useQuery({
        queryKey: planningKeys.fsecCellLinksByYear(year),
        queryFn: ({ signal }): Promise<PlanningFsecCellLink[]> =>
            api.get(`/planning/fsec-cell-links/?year=${year}`, PlanningFsecCellLinkListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

// ====================== LAB EVENTS ======================

export function useLabEvents() {
    return useQuery({
        queryKey: planningKeys.labEvents(),
        queryFn: ({ signal }): Promise<LabEvent[]> => api.get('/planning/lab-events/', LabEventListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useCreateLabEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: LabEventCreate): Promise<LabEvent> => {
            const response = await api.post('/planning/lab-events/', labEventCreateToApi(data));
            return LabEventSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: planningKeys.labEvents() });
        },
        onError: handleMutationError,
    });
}

export function useUpdateLabEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: LabEventCreate }): Promise<LabEvent> => {
            const response = await api.patch(`/planning/lab-events/${uuid}/`, labEventCreateToApi(data));
            return LabEventSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: planningKeys.labEvents() });
        },
        onError: handleMutationError,
    });
}

export function useDeleteLabEvent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid }: { uuid: string }): Promise<void> => {
            await api.delete(`/planning/lab-events/${uuid}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: planningKeys.labEvents() });
        },
        onError: handleMutationError,
    });
}

// ====================== CAMPAIGN STEPS ======================

export function useCampaignSteps(year: number) {
    return useQuery({
        queryKey: planningKeys.campaignStepsByYear(year),
        queryFn: ({ signal }): Promise<PlanningCampaignStep[]> =>
            api.get(`/planning/campaign-steps/?year=${year}`, PlanningCampaignStepListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useCreateCampaignStep() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PlanningCampaignStepCreate): Promise<PlanningCampaignStep> => {
            const response = await api.post('/planning/campaign-steps/', planningCampaignStepCreateToApi(data));
            return PlanningCampaignStepSchema.parse(response);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.campaignStepsByYear(result.year) });
        },
        onError: handleMutationError,
    });
}

export function useUpdateCampaignStep() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uuid,
            data,
        }: {
            uuid: string;
            data: PlanningCampaignStepCreate;
        }): Promise<PlanningCampaignStep> => {
            const response = await api.patch(
                `/planning/campaign-steps/${uuid}/`,
                planningCampaignStepCreateToApi(data),
            );
            return PlanningCampaignStepSchema.parse(response);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.campaignStepsByYear(result.year) });
        },
        onError: handleMutationError,
    });
}

export function useDeleteCampaignStep() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid }: { uuid: string; year: number }): Promise<void> => {
            await api.delete(`/planning/campaign-steps/${uuid}/`);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: planningKeys.campaignStepsByYear(variables.year) });
        },
        onError: handleMutationError,
    });
}

// ====================== PLANNING STEPS (referentiel) ======================

/**
 * Référentiel des étapes de planning campagne.
 * Lecture seule — édition via l'admin Django. Remplace la constante ETAPES.
 */
export function usePlanningSteps() {
    return useQuery({
        queryKey: planningKeys.planningSteps(),
        queryFn: ({ signal }): Promise<PlanningStep[]> =>
            api.get('/planning/planning-steps/', PlanningStepListSchema, signal),
        // Référentiel lecture seule (aucune mutation front) → frais sur la session.
        ...REFERENTIAL_CACHE_CONFIG,
    });
}
