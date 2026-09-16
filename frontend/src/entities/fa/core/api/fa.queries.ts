/**
 * FA API Service - TanStack Query Hooks
 * @module entities/fa/api
 *
 * Provides React hooks for FA (Fiche d'Anomalie) CRUD operations
 * using TanStack Query for data fetching and cache management.
 *
 * ## Workflow States
 * - **Ouvert (0)**: Initial state, Phase 1 data entry
 * - **En cours (1)**: After IEC validation, Phase 2 data entry
 * - **Clos (2)**: Closed after final validation
 *
 * ## Endpoints
 * - GET /fas/ → list all
 * - GET /fas/{uuid}/ → detail
 * - GET /fas/fsec/{fsec_version_id}/ → get FA by FSEC
 * - POST /fas/ → create
 * - PUT /fas/{uuid}/ → update
 * - DELETE /fas/{uuid}/ → delete
 * - POST /fas/{uuid}/validate-open/ → validate open phase
 * - POST /fas/{uuid}/validate-progress/ → validate progress phase
 * - POST /fas/{uuid}/close/ → close FA
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG, seedDetailFromList, isUuid, formatDateToIso } from '@shared/lib';

import {
    type Fa,
    type FaCreate,
    type FaPhoto,
    type FaUpdate,
    FaListSchema,
    FaPhotoListSchema,
    FaPhotoSchema,
    FaSchema,
    faCreateToApi,
    faUpdateToApi,
} from '../model';
import { faKeys } from './fa.keys';

/**
 * Hook to fetch all FAs (Fiches d'Anomalie).
 *
 * @returns TanStack Query result with FA array
 *
 * @example
 * ```tsx
 * const { data: fas, isLoading, error } = useFas();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <FaList items={fas} />;
 * ```
 */
export function useFas() {
    return useQuery({
        queryKey: faKeys.lists(),
        queryFn: async ({ signal }): Promise<Fa[]> => {
            const data = await api.get('/fas/', undefined, signal);
            return FaListSchema.parse(data);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Hook to fetch a single FA by UUID.
 *
 * @param uuid - The unique identifier of the FA
 * @returns TanStack Query result with FA object
 *
 * @example
 * ```tsx
 * const { uuid } = useParams();
 * const { data: fa, isLoading } = useFa(uuid);
 *
 * if (!fa) return null;
 * return <FaDetails fa={fa} />;
 * ```
 */
export async function fetchFa(uuid: string, signal?: AbortSignal): Promise<Fa> {
    const data = await api.get(`/fas/${uuid}/`, undefined, signal);
    return FaSchema.parse(data);
}

export function useFa(uuid: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: faKeys.detail(uuid),
        queryFn: ({ signal }) => fetchFa(uuid, signal),
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
        // Seedé depuis le cache liste → header instantané au clic.
        ...seedDetailFromList<Fa>(queryClient, [faKeys.lists()], (f) => f.uuid === uuid),
    });
}

/**
 * Récupère une FA par son slug d'URL (slugify de l'identifier). Rétro-compatible :
 * bascule sur l'endpoint UUID si le paramètre est un UUID (anciens liens).
 */
export async function fetchFaBySlug(slugOrUuid: string, signal?: AbortSignal): Promise<Fa> {
    const path = isUuid(slugOrUuid) ? `/fas/${slugOrUuid}/` : `/fas/by-slug/${encodeURIComponent(slugOrUuid)}/`;
    const data = await api.get(path, undefined, signal);
    return FaSchema.parse(data);
}

/**
 * Fetch single FA by slug. Seedé depuis le cache liste (match slug ou uuid).
 */
export function useFaBySlug(slug: string) {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: faKeys.detailBySlug(slug),
        queryFn: ({ signal }) => fetchFaBySlug(slug, signal),
        enabled: Boolean(slug),
        ...QUERY_CACHE_CONFIG,
        ...seedDetailFromList<Fa>(queryClient, [faKeys.lists()], (f) => f.slug === slug || f.uuid === slug),
    });
}

/**
 * Précharge le détail d'une FA (survol de ligne). No-op si déjà frais.
 */
export function usePrefetchFa() {
    const queryClient = useQueryClient();
    return useCallback(
        (uuid: string) => {
            if (!uuid) return;
            void queryClient.prefetchQuery({
                queryKey: faKeys.detail(uuid),
                queryFn: ({ signal }) => fetchFa(uuid, signal),
                ...QUERY_CACHE_CONFIG,
            });
        },
        [queryClient],
    );
}

/**
 * Hook to fetch all FAs associated with a specific FSEC.
 *
 * Returns an array (potentially empty). A FSEC can have multiple FAs.
 *
 * @param fsecVersionId - The FSEC version UUID
 * @returns TanStack Query result with an array of FAs (empty if none)
 *
 * @example
 * ```tsx
 * const { data: fas = [] } = useFasByFsec(fsec.versionUuid);
 *
 * if (fas.length > 0) {
 *   return fas.map((fa) => <Link key={fa.uuid} to={`/fa/${fa.uuid}`}>{fa.identifier}</Link>);
 * }
 * return <Button onClick={openCreateFaModal}>Créer FA</Button>;
 * ```
 */
export function useFasByFsec(fsecVersionId: string) {
    return useQuery({
        queryKey: faKeys.byFsec(fsecVersionId),
        queryFn: async ({ signal }): Promise<Fa[]> => {
            const data = await api.get(`/fas/fsec/${fsecVersionId}/`, undefined, signal);
            if (!Array.isArray(data)) {
                return [];
            }
            return data.map((item) => FaSchema.parse(item));
        },
        enabled: Boolean(fsecVersionId),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Hook to create a new FA.
 *
 * Automatically invalidates FA list and FSEC-specific queries on success.
 * The FA is created with status "Ouvert" (0).
 *
 * @returns TanStack Mutation with create function
 *
 * @example
 * ```tsx
 * const createMutation = useCreateFa();
 *
 * const handleCreate = async (data: FaCreate) => {
 *   try {
 *     const newFa = await createMutation.mutateAsync(data);
 *     navigate(`/fa/${newFa.uuid}`);
 *   } catch (error) {
 *     showNotification('Erreur création', 'error');
 *   }
 * };
 * ```
 */
export function useCreateFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: FaCreate): Promise<Fa> => {
            const apiData = faCreateToApi(data);
            const response = await api.post('/fas/', apiData);
            return FaSchema.parse(response);
        },
        onSuccess: (newFa) => {
            // Pre-populate detail cache so navigation shows data immediately
            queryClient.setQueryData(faKeys.detail(newFa.uuid), newFa);
            // La création navigue vers /fa-details/<slug> → pré-seed la clé slug.
            queryClient.setQueryData(faKeys.detailBySlug(newFa.slug), newFa);
            // Invalidate list
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // Invalidate FSEC-specific query
            if (newFa.fsecVersionId) {
                queryClient.invalidateQueries({
                    queryKey: faKeys.byFsec(newFa.fsecVersionId),
                });
            }
        },
    });
}

/**
 * Hook to update an existing FA.
 *
 * Supports partial updates for Phase 1 (Ouvert) and Phase 2 (En cours) fields.
 * Automatically invalidates all related queries on success.
 *
 * @returns TanStack Mutation with update function
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateFa();
 *
 * const handleSave = async () => {
 *   await updateMutation.mutateAsync({
 *     uuid: fa.uuid,
 *     discoverer: form.discoverer,
 *     observation: form.observation,
 *   });
 *   showNotification('Mise à jour réussie', 'success');
 * };
 * ```
 */
export function useUpdateFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: FaUpdate): Promise<Fa> => {
            const apiData = faUpdateToApi(data);
            const response = await api.put(`/fas/${data.uuid}/`, apiData);
            return FaSchema.parse(response);
        },
        onSuccess: (updatedFa) => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug).
            queryClient.invalidateQueries({ queryKey: faKeys.details() });
            if (updatedFa.fsecVersionId) {
                queryClient.invalidateQueries({
                    queryKey: faKeys.byFsec(updatedFa.fsecVersionId),
                });
            }
        },
    });
}

/**
 * Hook to delete a FA.
 *
 * Removes the FA permanently. Automatically invalidates related queries.
 *
 * @returns TanStack Mutation with delete function
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteFa();
 *
 * const handleDelete = async () => {
 *   if (confirm('Supprimer cette FA ?')) {
 *     await deleteMutation.mutateAsync(fa.uuid);
 *     navigate('/fas');
 *   }
 * };
 * ```
 */
export function useDeleteFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uuid: string): Promise<string> => {
            await api.delete(`/fas/${uuid}/`);
            return uuid; // Return uuid for onSuccess
        },
        onSuccess: (deletedUuid) => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            queryClient.invalidateQueries({ queryKey: faKeys.detail(deletedUuid) });
            // Invalidate all byFsec queries since we don't have the fsecVersionId here
            queryClient.invalidateQueries({ queryKey: [...faKeys.all, 'fsec'] });
        },
    });
}

/**
 * Galerie de photos d'une FA (phase Ouvert).
 *
 * Endpoint : GET /fas/{uuid}/photos/ → liste ordonnée.
 */
export function useFaPhotos(faUuid: string) {
    return useQuery({
        queryKey: faKeys.photos(faUuid),
        queryFn: async ({ signal }): Promise<FaPhoto[]> => {
            const data = await api.get(`/fas/${faUuid}/photos/`, undefined, signal);
            if (!Array.isArray(data)) return [];
            return FaPhotoListSchema.parse(data);
        },
        enabled: Boolean(faUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Ajoute une photo à la galerie d'une FA (upload multipart).
 *
 * Le fichier doit déjà être compressé côté caller (cf. shared/lib/compressImage).
 * Endpoint : POST /fas/{uuid}/photos/ (champ `image`, `caption?`).
 */
export function useAddFaPhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            faUuid,
            image,
            caption,
        }: {
            faUuid: string;
            image: File;
            caption?: string | null;
        }): Promise<FaPhoto> => {
            const form = new FormData();
            form.append('image', image, image.name);
            if (caption) form.append('caption', caption);
            const response = await api.post(`/fas/${faUuid}/photos/`, form);
            return FaPhotoSchema.parse(response);
        },
        onSuccess: (_photo, variables) => {
            queryClient.invalidateQueries({ queryKey: faKeys.photos(variables.faUuid) });
        },
    });
}

/**
 * Supprime une photo de la galerie d'une FA.
 *
 * Endpoint : DELETE /fas/{uuid}/photos/{photoUuid}/.
 */
export function useDeleteFaPhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ faUuid, photoUuid }: { faUuid: string; photoUuid: string }): Promise<string> => {
            await api.delete(`/fas/${faUuid}/photos/${photoUuid}/`);
            return photoUuid;
        },
        onSuccess: (_deletedUuid, variables) => {
            queryClient.invalidateQueries({ queryKey: faKeys.photos(variables.faUuid) });
        },
    });
}

/**
 * Hook to validate Phase 1 (Ouvert) and transition to Phase 2 (En cours).
 *
 * Requires IEC validation. Updates FA status from 0 (Ouvert) to 1 (En cours).
 *
 * @returns TanStack Mutation with validate function
 *
 * @example
 * ```tsx
 * const validateMutation = useValidateOpenFa();
 *
 * const handleValidate = async () => {
 *   await validateMutation.mutateAsync({
 *     uuid: fa.uuid,
 *     validatorName: 'Jean Dupont (IEC)',
 *     validationDate: new Date(),
 *   });
 *   showNotification('Phase Ouvert validée', 'success');
 * };
 * ```
 */
export function useValidateOpenFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            uuid,
            validatorName,
            validatorUserUuid,
            validationDate,
        }: {
            /** FA UUID */
            uuid: string;
            /** Name of the IEC validator (legacy texte). Optionnel si validatorUserUuid fourni. */
            validatorName?: string;
            /** UUID UserProfile du validateur (source de vérité). Rôle iec/chef_labo enforced backend. */
            validatorUserUuid?: string;
            /** Optional validation date (defaults to today) */
            validationDate?: Date;
        }): Promise<Fa> => {
            const response = await api.post(`/fas/${uuid}/validate-open/`, {
                validator_name: validatorName ?? null,
                validator_user_uuid: validatorUserUuid ?? null,
                // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
                validation_date: formatDateToIso(validationDate),
            });
            return FaSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug).
            queryClient.invalidateQueries({ queryKey: faKeys.details() });
        },
    });
}

/**
 * Hook to validate Phase 2 (En cours) and transition to Phase 3 (Clos).
 *
 * Requires IEC validation. Updates FA status from 1 (En cours) to 2 (Clos).
 *
 * @returns TanStack Mutation with validate function
 *
 * @example
 * ```tsx
 * const validateMutation = useValidateProgressFa();
 *
 * const handleValidate = async () => {
 *   await validateMutation.mutateAsync({
 *     uuid: fa.uuid,
 *     validatorName: 'Marie Martin (IEC)',
 *   });
 * };
 * ```
 */
export function useValidateProgressFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            uuid,
            validatorName,
            validatorUserUuid,
            validationDate,
        }: {
            /** FA UUID */
            uuid: string;
            /** Name of the IEC validator (legacy texte). Optionnel si validatorUserUuid fourni. */
            validatorName?: string;
            /** UUID UserProfile du validateur (source de vérité). */
            validatorUserUuid?: string;
            /** Optional validation date (defaults to today) */
            validationDate?: Date;
        }): Promise<Fa> => {
            const response = await api.post(`/fas/${uuid}/validate-progress/`, {
                validator_name: validatorName ?? null,
                validator_user_uuid: validatorUserUuid ?? null,
                // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
                validation_date: formatDateToIso(validationDate),
            });
            return FaSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug).
            queryClient.invalidateQueries({ queryKey: faKeys.details() });
        },
    });
}

/**
 * Hook to close a FA definitively.
 *
 * Requires Chef Labo + IEC validation. Sets final closure information.
 * Status is set to 2 (Clos).
 *
 * @returns TanStack Mutation with close function
 *
 * @example
 * ```tsx
 * const closeMutation = useCloseFa();
 *
 * const handleClose = async () => {
 *   await closeMutation.mutateAsync({
 *     uuid: fa.uuid,
 *     validatorName: 'Chef Labo + IEC',
 *     closureValidation: 'Anomalie corrigée, vérifications effectuées',
 *     closureDate: new Date(),
 *   });
 *   showNotification('FA clôturée', 'success');
 * };
 * ```
 */
export function useCloseFa() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            uuid,
            validatorName,
            validatorUserUuid,
            closureValidation,
            closureDate,
        }: {
            /** FA UUID */
            uuid: string;
            /** Name of the validators (legacy texte). */
            validatorName?: string;
            /** UUID UserProfile du validateur (source de vérité). Rôle iec/chef_labo enforced backend. */
            validatorUserUuid?: string;
            /** Closure validation text explaining resolution */
            closureValidation: string;
            /** Optional closure date (defaults to today) */
            closureDate?: Date;
        }): Promise<Fa> => {
            const response = await api.post(`/fas/${uuid}/close/`, {
                validator_name: validatorName ?? null,
                validator_user_uuid: validatorUserUuid ?? null,
                closure_validation: closureValidation,
                // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
                closure_date: formatDateToIso(closureDate),
            });
            return FaSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // `details()` (préfixe) couvre detail(uuid) ET detailBySlug(slug).
            queryClient.invalidateQueries({ queryKey: faKeys.details() });
        },
    });
}
