/**
 * API Client - Fetch wrapper with error handling and Zod validation
 * @module shared/api
 *
 * Uses a token provider pattern to avoid importing from @features (FSD compliance).
 * The token provider is initialized in app/providers.
 */

import type { ZodType } from 'zod';

const API_BASE_URL = '/api/v1';

/**
 * Default per-request timeout. A stalled backend or dropped connection should
 * not leave a `fetch()` promise hanging indefinitely — the UI needs a definite
 * failure to show a retry / offline state.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

// ============================================================================
// Token Provider (FSD-1 fix: no direct import from @features)
// ============================================================================

interface TokenProvider {
    getAccessToken: () => string | null;
    refreshToken: () => Promise<boolean>;
    logout: () => void;
}

let tokenProvider: TokenProvider | null = null;

/**
 * Initialize the API client with a token provider.
 * Must be called once at app startup (in app/providers).
 */
export function initApiClient(provider: TokenProvider) {
    tokenProvider = provider;
}

// ============================================================================
// API Error
// ============================================================================

export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public data?: unknown,
    ) {
        super(`API Error: ${status} ${statusText}`);
        this.name = 'ApiError';
    }
}

// ============================================================================
// Refresh token mutex (API-1 fix: prevent concurrent refresh calls)
// ============================================================================

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokenWithMutex(): Promise<boolean> {
    if (!tokenProvider) return false;

    if (!refreshPromise) {
        refreshPromise = tokenProvider.refreshToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

// ============================================================================
// Request
// ============================================================================

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    signal?: AbortSignal;
}

/**
 * Compose an external `AbortSignal` with a default timeout. If the caller
 * already aborts (e.g. query cancellation) we respect that; otherwise the
 * timeout guarantees the fetch resolves within DEFAULT_TIMEOUT_MS.
 */
function buildTimedSignal(external?: AbortSignal): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
        DEFAULT_TIMEOUT_MS,
    );

    const onExternalAbort = () => controller.abort(external?.reason);
    if (external) {
        if (external.aborted) {
            controller.abort(external.reason);
        } else {
            external.addEventListener('abort', onExternalAbort, { once: true });
        }
    }

    return {
        signal: controller.signal,
        cancel: () => {
            clearTimeout(timeoutId);
            external?.removeEventListener('abort', onExternalAbort);
        },
    };
}

async function request<T>(endpoint: string, options: RequestOptions = {}, schema?: ZodType<T, any, any>): Promise<T> {
    const { body, signal, ...init } = options;
    const token = tokenProvider?.getAccessToken() ?? null;

    const timed = buildTimedSignal(signal);

    // FormData (upload de fichier) : le navigateur DOIT poser lui-même le
    // Content-Type incluant le boundary multipart → on ne le force pas.
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const config: RequestInit = {
        ...init,
        signal: timed.signal,
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { Authorization: `Bearer ${token}` }),
            ...init.headers,
        },
    };

    if (body !== undefined && body !== null) {
        config.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    try {
        let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Auto-refresh token on 401 (with mutex to prevent race conditions)
        if (response.status === 401 && token) {
            const refreshed = await refreshTokenWithMutex();
            if (refreshed) {
                const newToken = tokenProvider?.getAccessToken() ?? null;
                config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${newToken}`,
                };
                response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            } else {
                tokenProvider?.logout();
                throw new ApiError(401, 'Session expired');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new ApiError(response.status, response.statusText, errorData);
        }

        // Handle 204 No Content (T-3 fix: proper void return)
        if (response.status === 204) {
            return undefined as unknown as T;
        }

        const data = await response.json();

        // Validate with Zod schema if provided (Zero Trust)
        if (schema) {
            return schema.parse(data);
        }

        // T-4 fix: warn in dev when no schema is provided
        if (import.meta.env.DEV) {
            console.warn(`[API Client] No Zod schema provided for ${endpoint}. Response is not validated.`);
        }

        return data as T;
    } finally {
        timed.cancel();
    }
}

// ============================================================================
// Public API
// ============================================================================

export const api = {
    get: <T>(endpoint: string, schema?: ZodType<T, any, any>, signal?: AbortSignal) =>
        request<T>(endpoint, { method: 'GET', signal }, schema),

    post: <T>(endpoint: string, body: unknown, schema?: ZodType<T, any, any>) =>
        request<T>(endpoint, { method: 'POST', body }, schema),

    put: <T>(endpoint: string, body: unknown, schema?: ZodType<T, any, any>) =>
        request<T>(endpoint, { method: 'PUT', body }, schema),

    patch: <T>(endpoint: string, body: unknown, schema?: ZodType<T, any, any>) =>
        request<T>(endpoint, { method: 'PATCH', body }, schema),

    delete: <T = void>(endpoint: string, schema?: ZodType<T, any, any>) =>
        request<T>(endpoint, { method: 'DELETE' }, schema),

    /**
     * POST with binary response (e.g. PDF generation). Returns the raw Blob.
     * Réutilise la logique d'auth/refresh de `request` via un fetch interne.
     */
    postBlob: async (endpoint: string, body: unknown, signal?: AbortSignal): Promise<Blob> => {
        const token = tokenProvider?.getAccessToken() ?? null;
        const timed = buildTimedSignal(signal);
        const doFetch = (accessToken: string | null) =>
            fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                signal: timed.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                },
                body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
            });

        try {
            let response = await doFetch(token);
            if (response.status === 401 && token) {
                const refreshed = await refreshTokenWithMutex();
                if (refreshed) {
                    response = await doFetch(tokenProvider?.getAccessToken() ?? null);
                } else {
                    tokenProvider?.logout();
                    throw new ApiError(401, 'Session expired');
                }
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new ApiError(response.status, response.statusText, errorData);
            }
            return await response.blob();
        } finally {
            timed.cancel();
        }
    },
};
