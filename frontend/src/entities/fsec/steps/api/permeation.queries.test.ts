/**
 * Permeation Step Queries - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createQueryWrapper, server } from '@test/test-utils';
import { createMockPermeationStep } from '@test/mocks/handlers';
import {
    usePermeationStepsByFsec,
    usePermeationStep,
    useCreatePermeationStep,
    useUpdatePermeationStep,
} from './permeation.queries';

describe('Permeation Step Queries', () => {
    describe('usePermeationStepsByFsec', () => {
        it('fetches permeation steps for a FSEC', async () => {
            const fsecVersionUuid = crypto.randomUUID();
            const { result } = renderHook(() => usePermeationStepsByFsec(fsecVersionUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when fsecVersionUuid is empty', () => {
            const { result } = renderHook(() => usePermeationStepsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('usePermeationStep', () => {
        it('fetches a single permeation step', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => usePermeationStep(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => usePermeationStep(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    // R12 : start_date/estimated_end_date sont des DateTimeField backend → on
    // envoie l'instant ISO complet (pas une date tronquée, source du J-1).
    describe('payload dates (start_date / estimated_end_date)', () => {
        // Minuit LOCAL, comme produit par le DatePicker du modal.
        const startDate = new Date(2026, 0, 15);
        const estimatedEndDate = new Date(2026, 0, 20);

        it("envoie l'instant ISO complet à la création et le restitue sans décalage", async () => {
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.post('/api/v1/permeation-steps/', async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockPermeationStep(receivedBody), { status: 201 });
                }),
            );

            const { result } = renderHook(() => useCreatePermeationStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({ fsecVersionId: crypto.randomUUID(), startDate, estimatedEndDate });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.start_date).toBe(startDate.toISOString());
            expect(receivedBody!.estimated_end_date).toBe(estimatedEndDate.toISOString());
            // L'instant est préservé de bout en bout : la Date relue est identique.
            expect(result.current.data?.startDate?.getTime()).toBe(startDate.getTime());
            expect(result.current.data?.estimatedEndDate?.getTime()).toBe(estimatedEndDate.getTime());
        });

        it("envoie l'instant ISO complet à la mise à jour (PUT)", async () => {
            const uuid = crypto.randomUUID();
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.put(`/api/v1/permeation-steps/${uuid}/`, async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockPermeationStep({ uuid, ...receivedBody }));
                }),
            );

            const { result } = renderHook(() => useUpdatePermeationStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({ uuid, fsecVersionId: crypto.randomUUID(), startDate, estimatedEndDate });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.start_date).toBe(startDate.toISOString());
            expect(receivedBody!.estimated_end_date).toBe(estimatedEndDate.toISOString());
        });

        it('envoie null quand les dates sont absentes', async () => {
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.post('/api/v1/permeation-steps/', async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockPermeationStep(receivedBody), { status: 201 });
                }),
            );

            const { result } = renderHook(() => useCreatePermeationStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({ fsecVersionId: crypto.randomUUID() });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.start_date).toBeNull();
            expect(receivedBody!.estimated_end_date).toBeNull();
        });
    });
});
