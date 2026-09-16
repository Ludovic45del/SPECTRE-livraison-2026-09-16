import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@shared/api';
import { QUERY_CACHE_CONFIG } from './query-config';

/**
 * Retry strategy: only retry on transient server errors (5xx) or network
 * failures. Retrying a 400/401/403/404/409/422 is pure noise — those won't
 * succeed on a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError) {
        if (error.status >= 500 && error.status < 600) {
            return failureCount < 2;
        }
        return false;
    }
    // Non-ApiError (network failure, abort, parse error) → retry once.
    return failureCount < 1;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            ...QUERY_CACHE_CONFIG,
            retry: shouldRetry,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
