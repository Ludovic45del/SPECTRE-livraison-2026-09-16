/**
 * Auth Store - JWT Authentication state management
 * @module features/auth/model
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthTokens {
    access: string;
    refresh: string;
}

/**
 * Snapshot de credentials valides en attente d'activation.
 * Permet de jouer une animation post-login avant de flipper `isAuthenticated`
 * (et donc avant que `PublicRoute` ne redirige). Champ purement transient :
 * jamais persisté (cf. partialize plus bas).
 */
interface PendingAuth {
    tokens: AuthTokens;
    roles: string[];
    forcePasswordChange: boolean;
    firstName: string | null;
}

interface AuthState {
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    /** Roles metier SPECTRE de l'utilisateur connecte (cumulables, tries par hierarchie) */
    roles: string[];
    /** True si l'utilisateur doit changer son mot de passe */
    forcePasswordChange: boolean;
    /** Prenom de l'utilisateur, pour personnalisation UI (ex: anim de bienvenue) */
    firstName: string | null;
    /** Credentials valides non encore "commit" — voir PendingAuth */
    pendingAuth: PendingAuth | null;
    login: (username: string, password: string) => Promise<boolean>;
    /** Promeut le pendingAuth en etat authentifie reel (declenche la redirection) */
    commitLogin: () => void;
    /** Annule un pendingAuth en cours (cleanup si l'utilisateur quitte la page) */
    discardPendingAuth: () => void;
    logout: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    getAccessToken: () => string | null;
}

const API_BASE_URL = '/api/v1';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            roles: [],
            forcePasswordChange: false,
            firstName: null,
            pendingAuth: null,

            login: async (username: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/token/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            typeof errorData.detail === 'string' ? errorData.detail : 'Identifiants invalides',
                        );
                    }

                    const data = await response.json();
                    const tokens: AuthTokens = { access: data.access, refresh: data.refresh };
                    // 2-phase commit : on stocke les credentials valides dans pendingAuth
                    // sans flipper isAuthenticated. La page de login peut alors jouer une
                    // animation puis appeler commitLogin() pour declencher la redirection.
                    set({
                        pendingAuth: {
                            tokens,
                            roles: Array.isArray(data.roles) ? data.roles : [],
                            forcePasswordChange: data.force_password_change ?? false,
                            firstName: data.first_name ?? null,
                        },
                        isLoading: false,
                        error: null,
                    });
                    return true;
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Erreur de connexion';
                    set({ isLoading: false, error: message });
                    return false;
                }
            },

            commitLogin: () => {
                const { pendingAuth } = get();
                if (!pendingAuth) return;
                set({
                    tokens: pendingAuth.tokens,
                    isAuthenticated: true,
                    roles: pendingAuth.roles,
                    forcePasswordChange: pendingAuth.forcePasswordChange,
                    firstName: pendingAuth.firstName,
                    pendingAuth: null,
                });
            },

            discardPendingAuth: () => set({ pendingAuth: null }),

            logout: async () => {
                const { tokens } = get();
                if (tokens?.refresh) {
                    try {
                        await fetch(`${API_BASE_URL}/auth/token/blacklist/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh: tokens.refresh }),
                        });
                    } catch (err: unknown) {
                        if (import.meta.env.DEV) {
                            console.warn('Failed to blacklist refresh token:', err);
                        }
                    }
                }
                set({
                    tokens: null,
                    isAuthenticated: false,
                    error: null,
                    roles: [],
                    forcePasswordChange: false,
                    firstName: null,
                    pendingAuth: null,
                });
            },

            refreshToken: async () => {
                const { tokens } = get();
                if (!tokens?.refresh) return false;

                try {
                    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh: tokens.refresh }),
                    });

                    if (!response.ok) {
                        set({ tokens: null, isAuthenticated: false });
                        return false;
                    }

                    const data = await response.json();
                    if (typeof data.access !== 'string') {
                        set({ tokens: null, isAuthenticated: false });
                        return false;
                    }
                    set({ tokens: { access: data.access, refresh: data.refresh ?? tokens.refresh } });
                    return true;
                } catch {
                    set({ tokens: null, isAuthenticated: false });
                    return false;
                }
            },

            getAccessToken: () => {
                const { tokens } = get();
                return tokens?.access || null;
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            // v1 : `role: string | null` -> `roles: string[]` (roles cumulables).
            // Une session ouverte pendant la mise a jour est ainsi rehydratee
            // sans perdre l'authentification.
            version: 1,
            migrate: (persisted: unknown, version: number) => {
                const state = (persisted ?? {}) as Record<string, unknown> & { roles?: string[] };
                if (version < 1) {
                    const legacyRole = (state as { role?: string | null }).role;
                    state.roles = legacyRole ? [legacyRole] : [];
                    delete (state as { role?: unknown }).role;
                }
                return state;
            },
            partialize: (state) => ({
                tokens: state.tokens,
                isAuthenticated: state.isAuthenticated,
                roles: state.roles,
                forcePasswordChange: state.forcePasswordChange,
                firstName: state.firstName,
                // pendingAuth volontairement exclu : doit rester transient (en memoire)
            }),
            onRehydrateStorage: () => (state) => {
                // Validate rehydrated state: if tokens are missing/corrupt, force logout
                if (state && state.isAuthenticated && (!state.tokens?.access || !state.tokens?.refresh)) {
                    state.tokens = null;
                    state.isAuthenticated = false;
                }
            },
        },
    ),
);
