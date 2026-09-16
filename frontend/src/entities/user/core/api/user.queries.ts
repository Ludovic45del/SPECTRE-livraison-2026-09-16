/**
 * User API Service - TanStack Query Hooks
 * @module entities/user/api
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    PasswordResetResponseSchema,
    UserCreatedSchema,
    UserListSchema,
    UserSchema,
    type UserCreateForm,
    type UserUpdateForm,
    userCreateToApi,
    userUpdateToApi,
    type SelfProfileUpdateForm,
    selfProfileUpdateToApi,
    type User,
    type UserCreated,
    type PasswordResetResponse,
    ChangePasswordResponseSchema,
    type ChangePasswordResponse,
    SetInitialPasswordResponseSchema,
    type SetInitialPasswordResponse,
    type SpectreRole,
    UserLookupListSchema,
    type UserLookup,
} from '../model';
import { userKeys } from './user.keys';

// --- Queries ---

export function useUsers() {
    return useQuery({
        queryKey: userKeys.lists(),
        queryFn: ({ signal }): Promise<User[]> => api.get('/users/', UserListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

/**
 * Récupère la liste réduite des utilisateurs pour les dropdowns (UserSelect).
 *
 * - Filtre côté serveur sur is_active=true par défaut.
 * - Filtre optionnel par rôles métier (multi-valeurs).
 * - Réponse projetée (uuid, username, first_name, last_name, role, is_active)
 *   — pas de fuite de bureau/numero/dashboard.
 */
export function useUserLookup(roles?: readonly SpectreRole[]) {
    const params = new URLSearchParams();
    if (roles && roles.length > 0) {
        for (const r of roles) {
            params.append('role', r);
        }
    }
    const qs = params.toString();
    const url = qs ? `/users/lookup/?${qs}` : '/users/lookup/';

    return useQuery({
        queryKey: userKeys.lookup(roles),
        queryFn: ({ signal }): Promise<UserLookup[]> => api.get(url, UserLookupListSchema, signal),
        ...QUERY_CACHE_CONFIG,
        // Lookup quasi-statique (dropdowns) consommé partout : on évite le
        // refetch background à chaque nav. Fini (pas Infinity) car les
        // utilisateurs restent éditables via l'admin front.
        staleTime: 1000 * 60 * 30,
    });
}

export function useMe() {
    return useQuery({
        queryKey: userKeys.me(),
        queryFn: ({ signal }): Promise<User> => api.get('/auth/me/', UserSchema, signal),
        staleTime: 5 * 60 * 1000,
    });
}

// --- Mutations ---

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: UserCreateForm): Promise<UserCreated> => {
            const apiData = userCreateToApi(data);
            const response = await api.post('/users/', apiData);
            return UserCreatedSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: UserUpdateForm }): Promise<User> => {
            const apiData = userUpdateToApi(data);
            const response = await api.put(`/users/${uuid}/`, apiData);
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
        },
    });
}

/**
 * Self-update du profil utilisateur connecté (sans rôle / matricule).
 */
export function useUpdateMe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: SelfProfileUpdateForm): Promise<User> => {
            const apiData = selfProfileUpdateToApi(data);
            const response = await api.put('/auth/me/update/', apiData);
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.me(), updatedUser);
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
        },
    });
}

/**
 * Upload (POST multipart) de la photo de profil de l'utilisateur connecté.
 * Le fichier doit déjà être compressé côté caller (cf. shared/lib/compressImage) ;
 * le serveur le re-normalise (carré 256px, JPEG). Renvoie le profil complet.
 */
export function useUploadAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (image: File): Promise<User> => {
            const form = new FormData();
            form.append('image', image, image.name);
            const response = await api.post('/auth/me/avatar/', form);
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.me(), updatedUser);
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
            // Les chips/avatars d'autres écrans lisent l'avatar via le lookup.
            queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'lookup'] });
        },
    });
}

/**
 * Suppression de la photo de profil (retour aux initiales). Renvoie le profil
 * complet avec `avatarUrl: null`.
 */
export function useDeleteAvatar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<User> => {
            const response = await api.delete<unknown>('/auth/me/avatar/');
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.me(), updatedUser);
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
            queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'lookup'] });
        },
    });
}

/**
 * Upload (POST multipart) de la signature de l'utilisateur connecté.
 * Le fichier est envoyé brut (PAS de compression client : elle aplatirait
 * l'alpha en JPEG) ; le serveur le normalise en PNG transparent. Renvoie le
 * profil complet avec `signatureUrl` à jour.
 */
export function useUploadSignature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (image: File): Promise<User> => {
            const form = new FormData();
            form.append('image', image, image.name);
            const response = await api.post('/auth/me/signature/', form);
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.me(), updatedUser);
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
        },
    });
}

/**
 * Suppression de la signature. Renvoie le profil avec `signatureUrl: null`.
 */
export function useDeleteSignature() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<User> => {
            const response = await api.delete<unknown>('/auth/me/signature/');
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(userKeys.me(), updatedUser);
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
        },
    });
}

export function useToggleUserActive() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<User> => {
            const response = await api.patch(`/users/${uuid}/toggle/`, {});
            return UserSchema.parse(response);
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData<User[]>(userKeys.lists(), (old) =>
                old?.map((u) => (u.uuid === updatedUser.uuid ? updatedUser : u)),
            );
        },
    });
}

export function useResetPassword() {
    return useMutation({
        mutationFn: async (uuid: string): Promise<PasswordResetResponse> => {
            const response = await api.post(`/users/${uuid}/reset-password/`, {});
            return PasswordResetResponseSchema.parse(response);
        },
    });
}

export function useChangePassword() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            current_password: string;
            new_password: string;
        }): Promise<ChangePasswordResponse> => {
            const response = await api.post('/auth/change-password/', data);
            return ChangePasswordResponseSchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.me() });
        },
    });
}

export function useSetInitialPassword() {
    return useMutation({
        mutationFn: async (data: { token: string; new_password: string }): Promise<SetInitialPasswordResponse> => {
            const response = await api.post('/auth/set-initial-password/', data);
            return SetInitialPasswordResponseSchema.parse(response);
        },
    });
}
