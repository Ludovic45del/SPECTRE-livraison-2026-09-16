/**
 * Regression tests for the TanStack Query retry policy.
 *
 * The shared `queryClient` is configured to retry only transient 5xx / network
 * errors and skip 4xx, so a 400 / 404 doesn't bounce off the UI twice before
 * surfacing. These tests lock that behaviour down.
 */

import { describe, expect, it } from 'vitest';

import { ApiError } from '@shared/api';

// We exercise the retry predicate through the queryClient's default options.
// Importing it runs the configuration code once, after which we can pull the
// resolved retry option off the defaults.
import { queryClient } from './query-client';

function getQueryRetryFn() {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');
    return retry as (failureCount: number, error: unknown) => boolean;
}

describe('queryClient retry policy', () => {
    it('retries 5xx errors up to 2 times', () => {
        const retry = getQueryRetryFn();
        const serverError = new ApiError(500, 'Internal Server Error');
        expect(retry(0, serverError)).toBe(true);
        expect(retry(1, serverError)).toBe(true);
        expect(retry(2, serverError)).toBe(false);
    });

    it('does not retry 4xx errors', () => {
        const retry = getQueryRetryFn();
        expect(retry(0, new ApiError(400, 'Bad Request'))).toBe(false);
        expect(retry(0, new ApiError(401, 'Unauthorized'))).toBe(false);
        expect(retry(0, new ApiError(404, 'Not Found'))).toBe(false);
        expect(retry(0, new ApiError(409, 'Conflict'))).toBe(false);
        expect(retry(0, new ApiError(422, 'Unprocessable'))).toBe(false);
    });

    it('retries network / non-ApiError failures exactly once', () => {
        const retry = getQueryRetryFn();
        const networkError = new Error('Failed to fetch');
        expect(retry(0, networkError)).toBe(true);
        expect(retry(1, networkError)).toBe(false);
    });

    it('does not retry mutations by default', () => {
        const mutationRetry = queryClient.getDefaultOptions().mutations?.retry;
        expect(mutationRetry).toBe(0);
    });
});
