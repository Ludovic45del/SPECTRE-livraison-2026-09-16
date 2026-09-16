/**
 * FSEC API Service - TanStack Query Hooks
 * @module entities/fsec/api
 *
 * Endpoints verified from: cible/api/urls.py
 * - GET /fsecs/ → list all
 * - GET /fsecs/{version_uuid}/ → detail
 * - GET /fsecs/campaign/{uuid}/ → list by campaign (custom action)
 * - POST /fsecs/ → create
 * - PUT /fsecs/{version_uuid}/ → update
 * - DELETE /fsecs/{version_uuid}/ → delete
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, seedDetailFromList, isUuid } from '@shared/lib';
import { stockCatalogKeys } from '@entities/stock-item/core/api/stock-item.keys';
import { fsecAssemblyKeys } from '@entities/fsec-assembly-item/core/api/fsec-assembly-item.keys';
import { Fsec, FsecSchema, FsecListSchema, FsecCreate, fsecCreateToApi, PlanAnnotation } from '../model';
import { fsecKeys } from './fsec.keys';

/**
 * Met à jour le cache détail (par version_uuid ET par slug) avec le FSEC renvoyé
 * par l'API, puis invalide les listes — refresh instantané sans refetch.
 * Facteur commun aux mutations « photo / plan / vues demandées » qui renvoient
 * le FSEC complet.
 */
function writeFsecToCaches(queryClient: ReturnType<typeof useQueryClient>, updated: Fsec) {
    queryClient.setQueryData(fsecKeys.detail(updated.versionUuid), updated);
    queryClient.setQueryData(fsecKeys.detailBySlug(updated.slug), updated);
    queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
    if (updated.campaignId) {
        queryClient.invalidateQueries({ queryKey: fsecKeys.byCampaign(updated.campaignId) });
    }
}

/**
 * Fetch all FSECs
 */
export function useFsecs() {
    return useQuery({
        queryKey: fsecKeys.lists(),
        queryFn: async ({ signal }): Promise<Fsec[]> => {
            const data = await api.get('/fsecs/', undefined, signal);
            return FsecListSchema.parse(data);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Versions actives uniquement (GET /fsecs/active/) : une entrée par FSEC, sans
 * l'historique des versions. À préférer à `useFsecs()` pour les sélecteurs
 * (références de la messagerie…) — la liste complète grossit sur 10 ans.
 */
export function useActiveFsecs() {
    return useQuery({
        queryKey: fsecKeys.active(),
        queryFn: async ({ signal }): Promise<Fsec[]> => {
            const data = await api.get('/fsecs/active/', undefined, signal);
            return FsecListSchema.parse(data);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Récupère un FSEC par version UUID. Fonction nommée réutilisable hors React
 * (prefetch).
 */
export async function fetchFsec(versionUuid: string, signal?: AbortSignal): Promise<Fsec> {
    const data = await api.get(`/fsecs/${versionUuid}/`, undefined, signal);
    return FsecSchema.parse(data);
}

/**
 * Fetch single FSEC by version UUID.
 * Seedé depuis le cache liste (lists() ou byCampaign) → header instantané.
 */
export function useFsec(versionUuid: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: fsecKeys.detail(versionUuid),
        queryFn: ({ signal }) => fetchFsec(versionUuid, signal),
        enabled: Boolean(versionUuid),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<Fsec>(queryClient, [fsecKeys.lists()], (f) => f.versionUuid === versionUuid),
    });
}

/**
 * Récupère un FSEC par son slug d'URL. Rétro-compatible : si le paramètre est un
 * UUID (anciens liens), bascule sur l'endpoint version_uuid.
 */
export async function fetchFsecBySlug(slugOrUuid: string, signal?: AbortSignal): Promise<Fsec> {
    const path = isUuid(slugOrUuid) ? `/fsecs/${slugOrUuid}/` : `/fsecs/by-slug/${encodeURIComponent(slugOrUuid)}/`;
    const data = await api.get(path, undefined, signal);
    return FsecSchema.parse(data);
}

/**
 * Fetch single FSEC by slug. Seedé depuis le cache liste (match slug ou
 * version_uuid pour la rétro-compat).
 */
export function useFsecBySlug(slug: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: fsecKeys.detailBySlug(slug),
        queryFn: ({ signal }) => fetchFsecBySlug(slug, signal),
        enabled: Boolean(slug),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<Fsec>(queryClient, [fsecKeys.lists()], (f) => f.slug === slug || f.versionUuid === slug),
    });
}

/**
 * Précharge le détail d'un FSEC (survol de ligne). No-op si déjà frais.
 */
export function usePrefetchFsec() {
    const queryClient = useQueryClient();
    return useCallback(
        (versionUuid: string) => {
            if (!versionUuid) return;
            void queryClient.prefetchQuery({
                queryKey: fsecKeys.detail(versionUuid),
                queryFn: ({ signal }) => fetchFsec(versionUuid, signal),
                ...QUERY_CACHE_CONFIG,
            });
        },
        [queryClient],
    );
}

/**
 * Fetch FSECs by campaign UUID
 * Endpoint: GET /fsecs/campaign/{campaign_uuid}/
 */
export function useFsecsByCampaign(campaignUuid: string) {
    return useQuery({
        queryKey: fsecKeys.byCampaign(campaignUuid),
        queryFn: async ({ signal }): Promise<Fsec[]> => {
            const data = await api.get(`/fsecs/campaign/${campaignUuid}/`, undefined, signal);
            return FsecListSchema.parse(data);
        },
        enabled: Boolean(campaignUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Create new FSEC
 */
export function useCreateFsec() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: FsecCreate): Promise<Fsec> => {
            const apiData = fsecCreateToApi(data);
            const response = await api.post('/fsecs/', apiData);
            return FsecSchema.parse(response);
        },
        onSuccess: (newFsec) => {
            // Invalidate list to refetch
            queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
            // Also invalidate campaign-specific list if we know the campaign
            if (newFsec.campaignId) {
                queryClient.invalidateQueries({
                    queryKey: fsecKeys.byCampaign(newFsec.campaignId),
                });
            }
        },
    });
}

/**
 * Update existing FSEC
 */
export function useUpdateFsec() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ versionUuid, data }: { versionUuid: string; data: FsecCreate }): Promise<Fsec> => {
            const apiData = fsecCreateToApi(data);
            const response = await api.put(`/fsecs/${versionUuid}/`, apiData);
            return FsecSchema.parse(response);
        },
        onSuccess: (updatedFsec) => {
            // Renommer un FSEC ou le réaffecter à une autre campagne change son
            // `slug` calculé. On écrit la réponse (source de vérité, slug recalculé
            // côté serveur) directement dans le cache par version_uuid ET par
            // nouveau slug, au lieu d'invalider `details()`. Invalider relancerait
            // la query de détail encore keyée sur l'ANCIEN slug d'URL → 404, car ce
            // slug n'existe plus. La page de détail navigue ensuite vers le slug
            // canonique (cf. GeneralInfoSection), qui trouve ainsi son cache déjà
            // peuplé — pas de fetch, pas de 404.
            queryClient.setQueryData(fsecKeys.detail(updatedFsec.versionUuid), updatedFsec);
            queryClient.setQueryData(fsecKeys.detailBySlug(updatedFsec.slug), updatedFsec);
            queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
            if (updatedFsec.campaignId) {
                queryClient.invalidateQueries({
                    queryKey: fsecKeys.byCampaign(updatedFsec.campaignId),
                });
            }
            // R09 : un changement de statut FSEC (stepper, PUT) synchronise côté
            // serveur les statuts Réservée/Affectée/Tirée des éléments du tableau
            // récap (CDC §4.2). On invalide donc le catalogue Stock (racine, qui
            // couvre aussi `available-for-fsec`) et le tableau récap pour que les
            // badges d'état reflètent immédiatement le nouveau statut.
            queryClient.invalidateQueries({ queryKey: stockCatalogKeys.all });
            queryClient.invalidateQueries({ queryKey: fsecAssemblyKeys.all });
        },
    });
}

/**
 * Vues / photos demandées (onglet Vue/Photo, R08).
 * PATCH /fsecs/{version_uuid}/requested-views/
 *
 * Action dédiée : le champ ne transite jamais par le PUT global (qui le
 * préserve côté serveur), pour qu'un PUT partiel ne puisse pas l'effacer.
 * `requestedViews: null | ''` ⇒ effacement. L'API renvoie le FSEC complet.
 */
export function useUpdateFsecRequestedViews() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            versionUuid,
            requestedViews,
        }: {
            versionUuid: string;
            requestedViews: string | null;
        }): Promise<Fsec> => {
            const response = await api.patch(`/fsecs/${versionUuid}/requested-views/`, {
                requested_views: requestedViews,
            });
            return FsecSchema.parse(response);
        },
        // Même pattern que useUpdateFsec : écriture directe du cache détail (par
        // version_uuid ET par slug) → refresh instantané sans refetch, ET
        // invalidation des listes (lists()/byCampaign). Sans cette invalidation,
        // une entrée liste périmée pourrait re-seeder le détail (cf.
        // seedDetailFromList dans useFsec/useFsecBySlug) avec l'ancienne valeur.
        onSuccess: (updated) => writeFsecToCaches(queryClient, updated),
    });
}

/**
 * Delete FSEC
 */
export function useDeleteFsec() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (versionUuid: string): Promise<void> => {
            await api.delete(`/fsecs/${versionUuid}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
            // Also invalidate all campaign-specific FSEC lists
            queryClient.invalidateQueries({ queryKey: [...fsecKeys.all, 'campaign'] });
        },
    });
}

/**
 * Snapshot du workflow fiche de livraison pour une cible (côté serveur).
 */
export interface DeliveryInfoSnapshot {
    versionUuid: string;
    deliveryDate: string | null;
    numInterfaceIo: string | null;
    hasSealingStep: boolean;
    deliveryValidation: string | null;
    deliveryRemarques: string | null;
    deliveryValidatedByUsername: string | null;
    deliveryValidatedAt: string | null;
    // Phase 1 : accepteur sélectionné via dropdown (uuid UserProfile + username).
    deliveryAcceptorUserUuid: string | null;
    deliveryAcceptorUsername: string | null;
    // Phase 2 : réceptionnaire saisi libre (texte + date).
    deliveryReceiverName: string | null;
    deliveryReceiverDate: string | null;
}

function toDeliveryInfoSnapshot(raw: any): DeliveryInfoSnapshot {
    return {
        versionUuid: raw.version_uuid,
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
 * Lit l'état actuel du workflow fiche de livraison d'une cible.
 * Endpoint : GET /fsecs/{version_uuid}/delivery-info/
 */
export function useFsecDeliveryInfo(versionUuid: string, enabled = true) {
    return useQuery({
        queryKey: [...fsecKeys.detail(versionUuid), 'delivery-info'],
        queryFn: async ({ signal }): Promise<DeliveryInfoSnapshot> => {
            const data = await api.get<any>(`/fsecs/${versionUuid}/delivery-info/`, undefined, signal);
            return toDeliveryInfoSnapshot(data);
        },
        enabled: Boolean(versionUuid) && enabled,
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Phase 1 : enregistre N° Interface I0 + date livraison.
 * PATCH /fsecs/{version_uuid}/delivery-info/
 */
export function useUpdateFsecDeliveryInfo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            versionUuid,
            payload,
        }: {
            versionUuid: string;
            payload: {
                numInterfaceIo: string | null;
                deliveryDate: string | null;
                /** uuid UserProfile sélectionné dans le UserSelect (phase 1 accepteur). */
                deliveryAcceptorUserUuid?: string | null;
            };
        }): Promise<DeliveryInfoSnapshot> => {
            const response = await api.patch<any>(`/fsecs/${versionUuid}/delivery-info/`, {
                num_interface_io: payload.numInterfaceIo,
                delivery_date: payload.deliveryDate,
                delivery_acceptor_user_uuid: payload.deliveryAcceptorUserUuid ?? null,
            });
            return toDeliveryInfoSnapshot(response);
        },
        onSuccess: () => {
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug) → la
            // page de détail (chargée par slug) se rafraîchit après l'édition.
            queryClient.invalidateQueries({ queryKey: fsecKeys.details() });
            queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
        },
    });
}

/**
 * Phase 2 : pose OK/KO + remarques (signataire = utilisateur courant).
 * PATCH /fsecs/{version_uuid}/delivery-validation/
 */
export function useUpdateFsecDeliveryValidation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            versionUuid,
            payload,
        }: {
            versionUuid: string;
            payload: {
                deliveryValidation: string;
                deliveryRemarques: string;
                /** Nom du réceptionnaire saisi à l'écrit (phase 2). */
                deliveryReceiverName?: string | null;
                /** Date de réception saisie à l'écrit (phase 2), YYYY-MM-DD. */
                deliveryReceiverDate?: string | null;
            };
        }): Promise<DeliveryInfoSnapshot> => {
            const response = await api.patch<any>(`/fsecs/${versionUuid}/delivery-validation/`, {
                delivery_validation: payload.deliveryValidation,
                delivery_remarques: payload.deliveryRemarques,
                delivery_receiver_name: payload.deliveryReceiverName ?? null,
                delivery_receiver_date: payload.deliveryReceiverDate ?? null,
            });
            return toDeliveryInfoSnapshot(response);
        },
        onSuccess: () => {
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug) → la
            // page de détail (chargée par slug) se rafraîchit après l'édition.
            queryClient.invalidateQueries({ queryKey: fsecKeys.details() });
            queryClient.invalidateQueries({ queryKey: fsecKeys.lists() });
        },
    });
}

/**
 * Génère et télécharge le PDF "Fiche de livraison" pour une cible FSEC.
 * Le serveur lit les valeurs depuis la base (plus aucun body).
 */
export function useGenerateFsecDeliverySheet() {
    return useMutation({
        mutationFn: async (versionUuid: string): Promise<Blob> => {
            return api.postBlob(`/fsecs/${versionUuid}/delivery-sheet/`, {});
        },
    });
}

/**
 * Upload (PATCH multipart) ou suppression (DELETE) de la photo de vue d'ensemble.
 * Endpoint backend : /fsecs/{version_uuid}/overview-image/
 *
 * `image: null` ⇒ suppression. `image: File` ⇒ remplacement.
 * Le fichier doit déjà être compressé côté caller (cf. shared/lib/compressImage).
 */
export function useUpdateFsecOverviewImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ versionUuid, image }: { versionUuid: string; image: File | null }): Promise<Fsec> => {
            const endpoint = `/fsecs/${versionUuid}/overview-image/`;
            if (image === null) {
                const response = await api.delete<unknown>(endpoint);
                return FsecSchema.parse(response);
            }
            const form = new FormData();
            form.append('image', image, image.name);
            const response = await api.patch(endpoint, form);
            return FsecSchema.parse(response);
        },
        onSuccess: (updated) => {
            // Met à jour le cache détail directement pour un refresh instantané
            // de l'UI sans attendre le refetch (l'API renvoie le FSEC complet).
            writeFsecToCaches(queryClient, updated);
        },
    });
}

/**
 * Upload (PATCH multipart) ou suppression (DELETE) de l'image du plan
 * d'assemblage. Endpoint backend : /fsecs/{version_uuid}/assembly-plan/
 *
 * `image: null` ⇒ suppression (vide aussi le calque d'annotations côté serveur).
 * `image: File` ⇒ remplacement. Le fichier doit déjà être compressé côté caller
 * (cf. shared/lib/compressImage), formats JPEG/PNG/WebP, max 5 Mo.
 */
export function useUpdateFsecAssemblyPlanImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ versionUuid, image }: { versionUuid: string; image: File | null }): Promise<Fsec> => {
            const endpoint = `/fsecs/${versionUuid}/assembly-plan/`;
            if (image === null) {
                const response = await api.delete<unknown>(endpoint);
                return FsecSchema.parse(response);
            }
            const form = new FormData();
            form.append('image', image, image.name);
            const response = await api.patch(endpoint, form);
            return FsecSchema.parse(response);
        },
        onSuccess: (updated) => writeFsecToCaches(queryClient, updated),
    });
}

/**
 * Remplace le calque d'annotations du plan d'assemblage (PUT, JSON).
 * Endpoint backend : /fsecs/{version_uuid}/assembly-plan-annotations/
 *
 * Remplacement total : le serveur écrase le calque par la liste fournie. Calque
 * partagé (pas d'attribution par auteur, cf. choix produit).
 */
export function useUpdateFsecAssemblyPlanAnnotations() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            versionUuid,
            annotations,
        }: {
            versionUuid: string;
            annotations: PlanAnnotation[];
        }): Promise<Fsec> => {
            const response = await api.put(`/fsecs/${versionUuid}/assembly-plan-annotations/`, { annotations });
            return FsecSchema.parse(response);
        },
        onSuccess: (updated) => writeFsecToCaches(queryClient, updated),
    });
}
