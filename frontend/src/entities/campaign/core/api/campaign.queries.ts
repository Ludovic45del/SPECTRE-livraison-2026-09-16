/**
 * Campaign API Service - TanStack Query Hooks
 * @module entities/campaign/api
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, seedDetailFromList, isUuid } from '@shared/lib';
import {
    Campaign,
    CampaignSchema,
    CampaignListSchema,
    CampaignCreate,
    campaignCreateToApi,
    CampaignWithRelations,
    CampaignPatchPayload,
    CampaignPatchSchema,
} from '../model';
import { campaignKeys } from './campaign.keys';
import { getCampaignType, getCampaignStatus, getCampaignInstallation } from '../lib';

/**
 * Hydrate campaign with referential data
 */
function hydrateCampaign(campaign: Campaign): CampaignWithRelations {
    return {
        ...campaign,
        type: getCampaignType(campaign.typeId),
        status: getCampaignStatus(campaign.statusId),
        installation: getCampaignInstallation(campaign.installationId),
    };
}

/**
 * Fetch all campaigns (with hydrated relations)
 */
export function useCampaigns() {
    return useQuery({
        queryKey: campaignKeys.lists(),
        queryFn: async ({ signal }): Promise<CampaignWithRelations[]> => {
            const rawCampaigns = await api.get('/campaigns/', CampaignListSchema, signal);
            return rawCampaigns.map(hydrateCampaign);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Récupère une campagne par UUID (hydratée). Fonction nommée réutilisable
 * hors React (prefetch) — pas seulement dans le hook.
 */
export async function fetchCampaign(uuid: string, signal?: AbortSignal): Promise<CampaignWithRelations> {
    const rawCampaign = await api.get(`/campaigns/${uuid}/`, CampaignSchema, signal);
    return hydrateCampaign(rawCampaign);
}

/**
 * Fetch single campaign by UUID (hydrated).
 * Seedé depuis le cache liste → le header s'affiche instantanément au clic.
 */
export function useCampaign(uuid: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: campaignKeys.detail(uuid),
        queryFn: ({ signal }) => fetchCampaign(uuid, signal),
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<CampaignWithRelations>(queryClient, [campaignKeys.lists()], (c) => c.uuid === uuid),
    });
}

/**
 * Récupère une campagne par son slug d'URL (hydratée). Rétro-compatible : si le
 * paramètre est un UUID (anciens liens/bookmarks), bascule sur l'endpoint UUID.
 */
export async function fetchCampaignBySlug(slugOrUuid: string, signal?: AbortSignal): Promise<CampaignWithRelations> {
    const path = isUuid(slugOrUuid)
        ? `/campaigns/${slugOrUuid}/`
        : `/campaigns/by-slug/${encodeURIComponent(slugOrUuid)}/`;
    const rawCampaign = await api.get(path, CampaignSchema, signal);
    return hydrateCampaign(rawCampaign);
}

/**
 * Fetch single campaign by slug (hydrated). Seedé depuis le cache liste pour un
 * affichage instantané au clic (match slug OU uuid pour la rétro-compat).
 */
export function useCampaignBySlug(slug: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: campaignKeys.detailBySlug(slug),
        queryFn: ({ signal }) => fetchCampaignBySlug(slug, signal),
        enabled: Boolean(slug),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<CampaignWithRelations>(
            queryClient,
            [campaignKeys.lists()],
            (c) => c.slug === slug || c.uuid === slug,
        ),
    });
}

/**
 * Précharge le détail d'une campagne (survol de ligne) : la donnée est chaude
 * avant le clic. No-op si déjà fraîche en cache.
 */
export function usePrefetchCampaign() {
    const queryClient = useQueryClient();
    return useCallback(
        (uuid: string) => {
            if (!uuid) return;
            void queryClient.prefetchQuery({
                queryKey: campaignKeys.detail(uuid),
                queryFn: ({ signal }) => fetchCampaign(uuid, signal),
                ...QUERY_CACHE_CONFIG,
            });
        },
        [queryClient],
    );
}

/**
 * Create new campaign
 */
export function useCreateCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CampaignCreate): Promise<Campaign> => {
            const apiData = campaignCreateToApi(data);
            const response = await api.post('/campaigns/', apiData);
            return CampaignSchema.parse(response);
        },
        onSuccess: (newCampaign) => {
            const hydrated = hydrateCampaign(newCampaign);
            queryClient.setQueryData<CampaignWithRelations[]>(campaignKeys.lists(), (old) =>
                old ? [...old, hydrated] : [hydrated],
            );
        },
    });
}

/**
 * Update existing campaign
 */
export function useUpdateCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: CampaignCreate }): Promise<Campaign> => {
            const apiData = campaignCreateToApi(data);
            const response = await api.put(`/campaigns/${uuid}/`, apiData);
            return CampaignSchema.parse(response);
        },
        onSuccess: (updatedCampaign, variables) => {
            const hydrated = hydrateCampaign(updatedCampaign);
            queryClient.setQueryData<CampaignWithRelations>(campaignKeys.detail(variables.uuid), hydrated);
            // La page de détail est cachée par slug ; rafraîchir cette clé aussi
            // (le slug peut avoir changé si le nom/année/semestre a été édité).
            queryClient.setQueryData<CampaignWithRelations>(campaignKeys.detailBySlug(hydrated.slug), hydrated);
            queryClient.setQueryData<CampaignWithRelations[]>(campaignKeys.lists(), (old) =>
                old ? old.map((c) => (c.uuid === variables.uuid ? hydrated : c)) : [hydrated],
            );
        },
    });
}

/**
 * Partial update campaign (e.g. status)
 */
export function usePatchCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: CampaignPatchPayload }): Promise<Campaign> => {
            const validated = CampaignPatchSchema.parse(data);
            const response = await api.patch(`/campaigns/${uuid}/`, validated);
            return CampaignSchema.parse(response);
        },
        onSuccess: (updatedCampaign, variables) => {
            const hydrated = hydrateCampaign(updatedCampaign);
            queryClient.setQueryData<CampaignWithRelations>(campaignKeys.detail(variables.uuid), hydrated);
            // La page de détail est cachée par slug ; rafraîchir cette clé aussi
            // (le slug peut avoir changé si le nom/année/semestre a été édité).
            queryClient.setQueryData<CampaignWithRelations>(campaignKeys.detailBySlug(hydrated.slug), hydrated);
            queryClient.setQueryData<CampaignWithRelations[]>(campaignKeys.lists(), (old) =>
                old ? old.map((c) => (c.uuid === variables.uuid ? hydrated : c)) : [hydrated],
            );
        },
    });
}

/**
 * Une ligne de la fiche de livraison récapitulative (côté serveur).
 */
export interface DeliveryRecapRow {
    versionUuid: string;
    name: string;
    /** Nom complet d'affichage (« {year}-{installation}_{campagne}_{name} »). */
    displayName: string;
    deliveryDate: string | null;
    numInterfaceIo: string | null;
    hasSealingStep: boolean;
    deliveryValidation: string | null;
    deliveryRemarques: string | null;
    deliveryValidatedByUsername: string | null;
    deliveryValidatedAt: string | null;
    deliveryAcceptorUserUuid: string | null;
    deliveryAcceptorUsername: string | null;
    deliveryReceiverName: string | null;
    deliveryReceiverDate: string | null;
}

function toRecapRow(raw: any): DeliveryRecapRow {
    return {
        versionUuid: raw.version_uuid,
        name: raw.name,
        displayName: raw.display_name ?? raw.name,
        deliveryDate: raw.delivery_date ?? null,
        numInterfaceIo: raw.num_interface_io ?? null,
        hasSealingStep: Boolean(raw.has_sealing_step),
        deliveryValidation: raw.delivery_validation ?? null,
        deliveryRemarques: raw.delivery_remarques ?? null,
        deliveryValidatedByUsername: raw.delivery_validated_by_username ?? null,
        deliveryValidatedAt: raw.delivery_validated_at ?? null,
        deliveryAcceptorUserUuid: raw.delivery_acceptor_user_uuid ?? null,
        deliveryAcceptorUsername: raw.delivery_acceptor_username ?? null,
        deliveryReceiverName: raw.delivery_receiver_name ?? null,
        deliveryReceiverDate: raw.delivery_receiver_date ?? null,
    };
}

/**
 * Lit l'état actuel des fiches de livraison de toutes les cibles d'une campagne.
 * GET /campaigns/{uuid}/delivery-recap/
 */
export function useCampaignDeliveryRecap(uuid: string, enabled = true) {
    return useQuery({
        queryKey: [...campaignKeys.detail(uuid), 'delivery-recap'],
        queryFn: async ({ signal }): Promise<DeliveryRecapRow[]> => {
            const data = await api.get<any>(`/campaigns/${uuid}/delivery-recap/`, undefined, signal);
            return (data?.targets ?? []).map(toRecapRow);
        },
        enabled: Boolean(uuid) && enabled,
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Payload de sauvegarde batch (1 entrée par cible).
 */
export interface CampaignRecapTargetPayload {
    versionUuid: string;
    numInterfaceIo: string | null;
    deliveryDate: string | null;
    deliveryValidation?: string;
    deliveryRemarques?: string;
    /** uuid UserProfile sélectionné dans le dropdown accepteur (phase 1). */
    deliveryAcceptorUserUuid?: string | null;
    /** Texte libre — nom du réceptionnaire saisi à la main (phase 2). */
    deliveryReceiverName?: string | null;
    /** Date de réception saisie à la main (phase 2), YYYY-MM-DD. */
    deliveryReceiverDate?: string | null;
}

/**
 * Sauvegarde batch des saisies de la fiche récap.
 * PATCH /campaigns/{uuid}/delivery-recap/
 */
export function useSaveCampaignDeliveryRecap() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            campaignUuid,
            targets,
        }: {
            campaignUuid: string;
            targets: CampaignRecapTargetPayload[];
        }): Promise<DeliveryRecapRow[]> => {
            const response = await api.patch<any>(`/campaigns/${campaignUuid}/delivery-recap/`, {
                targets: targets.map((t) => ({
                    version_uuid: t.versionUuid,
                    num_interface_io: t.numInterfaceIo,
                    delivery_date: t.deliveryDate,
                    delivery_validation: t.deliveryValidation,
                    delivery_remarques: t.deliveryRemarques,
                    delivery_acceptor_user_uuid: t.deliveryAcceptorUserUuid ?? null,
                    delivery_receiver_name: t.deliveryReceiverName ?? null,
                    delivery_receiver_date: t.deliveryReceiverDate ?? null,
                })),
            });
            return (response?.targets ?? []).map(toRecapRow);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: [...campaignKeys.detail(variables.campaignUuid), 'delivery-recap'],
            });
        },
    });
}

/**
 * Génère et télécharge le PDF récapitulatif (lit depuis la base, plus de body).
 */
export function useGenerateCampaignDeliverySheet() {
    return useMutation({
        mutationFn: async (campaignUuid: string): Promise<Blob> => {
            return api.postBlob(`/campaigns/${campaignUuid}/delivery-sheet/`, {});
        },
    });
}

/**
 * Delete campaign
 */
export function useDeleteCampaign() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/campaigns/${uuid}/`);
        },
        onSuccess: (_data, uuid) => {
            queryClient.setQueryData<CampaignWithRelations[]>(campaignKeys.lists(), (old) =>
                old ? old.filter((c) => c.uuid !== uuid) : [],
            );
        },
    });
}
