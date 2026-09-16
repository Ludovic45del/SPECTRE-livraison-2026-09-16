/**
 * Sealing Step Queries - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createQueryWrapper, server } from '@test/test-utils';
import { createMockSealingStep } from '@test/mocks/handlers';
import { useSealingStepByMetrology, useSealingStep, useUpdateSealingStep } from './sealing.queries';

describe('Sealing Step Queries', () => {
    describe('useSealingStepByMetrology', () => {
        it('fetches sealing step for a metrology step', async () => {
            const metrologyStepId = crypto.randomUUID();
            const { result } = renderHook(() => useSealingStepByMetrology(metrologyStepId), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when metrologyStepId is empty', () => {
            const { result } = renderHook(() => useSealingStepByMetrology(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useSealingStep', () => {
        it('fetches a single sealing step', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useSealingStep(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useSealingStep(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    // Vérification scellement (R23-B) : statut OK/NOK + remarque.
    describe('verification payload (verification_status / verification_remark)', () => {
        it('sends verification in the update (PUT) payload and round-trips it', async () => {
            const uuid = crypto.randomUUID();
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.put(`/api/v1/sealing-steps/${uuid}/`, async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockSealingStep({ uuid, ...receivedBody }));
                }),
            );

            const { result } = renderHook(() => useUpdateSealingStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({
                uuid,
                metrologyStepId: crypto.randomUUID(),
                verificationStatus: 'NOK',
                verificationRemark: 'Fuite détectée sur l’interface I0',
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.verification_status).toBe('NOK');
            expect(receivedBody!.verification_remark).toBe('Fuite détectée sur l’interface I0');
            expect(result.current.data?.verificationStatus).toBe('NOK');
            expect(result.current.data?.verificationRemark).toBe('Fuite détectée sur l’interface I0');
        });

        it('defaults omitted verification to null (non vérifié)', async () => {
            const uuid = crypto.randomUUID();
            let receivedBody: Record<string, unknown> | null = null;
            server.use(
                http.put(`/api/v1/sealing-steps/${uuid}/`, async ({ request }) => {
                    receivedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockSealingStep({ uuid, ...receivedBody }));
                }),
            );

            const { result } = renderHook(() => useUpdateSealingStep(), {
                wrapper: createQueryWrapper(),
            });

            result.current.mutate({ uuid, metrologyStepId: crypto.randomUUID() });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(receivedBody!.verification_status).toBeNull();
            expect(receivedBody!.verification_remark).toBeNull();
            expect(result.current.data?.verificationStatus).toBeNull();
        });
    });
});
