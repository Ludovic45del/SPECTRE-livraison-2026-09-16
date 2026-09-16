/**
 * Regression tests for the API client's default timeout (Axe 4).
 *
 * A stalled fetch must abort on its own so the UI doesn't hang forever waiting
 * for a response. The timeout is composed with the caller's AbortSignal via
 * `buildTimedSignal` — we exercise both paths.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, initApiClient } from './client';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
}

describe('api client request lifecycle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        initApiClient({
            getAccessToken: () => null,
            refreshToken: async () => false,
            logout: () => undefined,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        globalThis.fetch = originalFetch;
    });

    it('aborts the fetch when the default timeout elapses', async () => {
        let observedSignal: AbortSignal | undefined;

        globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            observedSignal = init?.signal ?? undefined;
            return new Promise<Response>((_, rejectFetch) => {
                observedSignal?.addEventListener(
                    'abort',
                    () => rejectFetch(observedSignal?.reason ?? new Error('aborted')),
                    { once: true },
                );
            });
        }) as typeof fetch;

        const promise = api.get<unknown>('/whatever');
        // Attach rejection handler so the unsettled promise doesn't flag unhandled.
        const assertion = expect(promise).rejects.toBeInstanceOf(DOMException);
        vi.advanceTimersByTime(30_001);
        await assertion;
        expect(observedSignal?.aborted).toBe(true);
    });

    it('clears the timeout once the response lands', async () => {
        globalThis.fetch = vi.fn(async () => jsonResponse({ ok: true })) as typeof fetch;

        await api.get<{ ok: boolean }>('/quick');

        // No pending timers should remain — otherwise they'd fire during the
        // next test and try to abort a fresh request.
        expect(vi.getTimerCount()).toBe(0);
    });

    it('propagates caller-provided AbortSignal', async () => {
        const caller = new AbortController();
        globalThis.fetch = vi.fn(
            async (_input: RequestInfo | URL, init?: RequestInit) =>
                new Promise<Response>((_, reject) => {
                    init?.signal?.addEventListener('abort', () => reject(new Error('aborted by caller')), {
                        once: true,
                    });
                }),
        ) as typeof fetch;

        const promise = api.get<unknown>('/cancelable', undefined, caller.signal);
        const assertion = expect(promise).rejects.toThrow('aborted by caller');
        caller.abort();
        await assertion;
    });

    it('surfaces 4xx as ApiError with the response body', async () => {
        globalThis.fetch = vi.fn(async () =>
            jsonResponse({ detail: 'nope' }, { status: 404, statusText: 'Not Found' }),
        ) as typeof fetch;

        await expect(api.get<unknown>('/missing')).rejects.toMatchObject({
            name: 'ApiError',
            status: 404,
            data: { detail: 'nope' },
        } satisfies Partial<ApiError>);
    });
});
