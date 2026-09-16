/**
 * Metrology Step Queries - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createQueryWrapper, server } from '@test/test-utils';
import { createMockMetrologyStep } from '@test/mocks/handlers';
import {
    useMetrologyStepsByFsec,
    useMetrologyStep,
    useCreateMetrologyStep,
    useUpdateMetrologyStep,
} from './metrology.queries';

describe('Metrology Step Queries', () => {
    describe('useMetrologyStepsByFsec', () => {
        it('fetches metrology steps for a FSEC', async () => {
            const fsecVersionUuid = crypto.randomUUID();
            const { result } = renderHook(() => useMetrologyStepsByFsec(fsecVersionUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when fsecVersionUuid is empty', () => {
            const { result } = renderHook(() => useMetrologyStepsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useMetrologyStep', () => {
        it('fetches a single metrology step', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useMetrologyStep(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useMetrologyStep(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    // Liens fichiers (R15) : déplacés du scellement vers la métrologie.
    describe('file links payload (metro_file_link / visrad_link)', () => {
        const METRO_LINK = '\\\\serveur\\metro\\fsec-001.txt';
        const VISRAD_LINK = 'https://intranet/visrad/fsec-001';

        it('sends file links in the create payload and round-trips them', async () => {
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.post('/api/v1/metrology-steps/', async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockMetrologyStep(receivedBody), { status: 201 });
                }),
            );

            const { result } = renderHook(() => useCreateMetrologyStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({
                fsecVersionId: crypto.randomUUID(),
                metroFileLink: METRO_LINK,
                visradLink: VISRAD_LINK,
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.metro_file_link).toBe(METRO_LINK);
            expect(receivedBody!.visrad_link).toBe(VISRAD_LINK);
            expect(result.current.data?.metroFileLink).toBe(METRO_LINK);
            expect(result.current.data?.visradLink).toBe(VISRAD_LINK);
        });

        it('sends file links in the update (PUT) payload', async () => {
            const uuid = crypto.randomUUID();
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.put(`/api/v1/metrology-steps/${uuid}/`, async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockMetrologyStep({ uuid, ...receivedBody }));
                }),
            );

            const { result } = renderHook(() => useUpdateMetrologyStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({
                uuid,
                fsecVersionId: crypto.randomUUID(),
                metroFileLink: METRO_LINK,
                visradLink: VISRAD_LINK,
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.metro_file_link).toBe(METRO_LINK);
            expect(receivedBody!.visrad_link).toBe(VISRAD_LINK);
        });

        it('defaults omitted file links to null in the payload', async () => {
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.post('/api/v1/metrology-steps/', async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockMetrologyStep(receivedBody), { status: 201 });
                }),
            );

            const { result } = renderHook(() => useCreateMetrologyStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({ fsecVersionId: crypto.randomUUID() });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.metro_file_link).toBeNull();
            expect(receivedBody!.visrad_link).toBeNull();
        });
    });
});
