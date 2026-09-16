/**
 * Lab Contact Queries — TanStack Query hooks pour /lab-contacts/.
 * @module entities/lab-contact/api
 *
 * Annuaire des laboratoires (numéros utiles partagés). Pas de page de détail :
 * une seule query de liste, les mutations invalident lists() (+ detail(uuid)
 * par hygiène de cache, au cas où un consommateur en seederait un).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    LabContactListSchema,
    LabContactSchema,
    labContactInputToApi,
    type LabContact,
    type LabContactInput,
} from '../model';
import { labContactKeys } from './lab-contact.keys';

/** Liste complète de l'annuaire (triée par nom côté serveur). */
export function useLabContacts() {
    return useQuery({
        queryKey: labContactKeys.lists(),
        queryFn: ({ signal }): Promise<LabContact[]> => api.get('/lab-contacts/', LabContactListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

/** Crée un contact — invalide lists(). */
export function useCreateLabContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: LabContactInput): Promise<LabContact> =>
            api.post('/lab-contacts/', labContactInputToApi(data), LabContactSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: labContactKeys.lists() });
        },
    });
}

/** Remplace un contact (PUT complet) — invalide lists() + detail(uuid). */
export function useUpdateLabContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ uuid, data }: { uuid: string; data: LabContactInput }): Promise<LabContact> =>
            api.put(`/lab-contacts/${uuid}/`, labContactInputToApi(data), LabContactSchema),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: labContactKeys.lists() });
            queryClient.invalidateQueries({ queryKey: labContactKeys.detail(variables.uuid) });
        },
    });
}

/** Supprime un contact — retire detail(uuid) du cache et invalide lists(). */
export function useDeleteLabContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/lab-contacts/${uuid}/`);
        },
        onSuccess: (_data, uuid) => {
            queryClient.removeQueries({ queryKey: labContactKeys.detail(uuid) });
            queryClient.invalidateQueries({ queryKey: labContactKeys.lists() });
        },
    });
}
