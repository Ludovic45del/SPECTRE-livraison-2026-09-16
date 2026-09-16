/**
 * Tests des mutations campaign-step factorisées (payload + create/update/delete).
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper, server } from '@test/test-utils';
import { useCampaignStepMutations } from './useCampaignStepMutations';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';

const CAMP = '11111111-1111-1111-1111-111111111111';
const FSEC = '22222222-2222-2222-2222-222222222222';
const STEP_UUID = '33333333-3333-3333-3333-333333333333';

const existing: PlanningCampaignStep = {
    uuid: STEP_UUID,
    campaignUuid: CAMP,
    fsecUuid: FSEC,
    stepLabel: 'Assemblage',
    year: 2026,
    startDate: '2026-05-07',
    endDate: '2026-05-09',
};

describe('useCampaignStepMutations', () => {
    it('schedule() POSTs the snake_case payload', async () => {
        let body: Record<string, unknown> | undefined;
        server.use(
            http.post('/api/v1/planning/campaign-steps/', async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ uuid: crypto.randomUUID(), ...body }, { status: 201 });
            }),
        );
        const { result } = renderHook(() => useCampaignStepMutations(CAMP, 2026), { wrapper: createQueryWrapper() });

        act(() => result.current.schedule(FSEC, 'Assemblage', '2026-05-07', '2026-05-09'));

        await waitFor(() => expect(body).toBeDefined());
        expect(body).toEqual({
            campaign_uuid: CAMP,
            fsec_uuid: FSEC,
            step_label: 'Assemblage',
            year: 2026,
            start_date: '2026-05-07',
            end_date: '2026-05-09',
        });
    });

    it('updateDates() PATCHes the step uuid with the rebuilt payload', async () => {
        let body: Record<string, unknown> | undefined;
        let uuid: string | undefined;
        server.use(
            http.patch('/api/v1/planning/campaign-steps/:uuid/', async ({ request, params }) => {
                body = (await request.json()) as Record<string, unknown>;
                uuid = params.uuid as string;
                return HttpResponse.json({ uuid: params.uuid, ...body });
            }),
        );
        const { result } = renderHook(() => useCampaignStepMutations(CAMP, 2026), { wrapper: createQueryWrapper() });

        act(() => result.current.updateDates(existing, '2026-05-10', '2026-05-14'));

        await waitFor(() => expect(uuid).toBe(STEP_UUID));
        expect(body).toEqual({
            campaign_uuid: CAMP,
            fsec_uuid: FSEC,
            step_label: 'Assemblage',
            year: 2026,
            start_date: '2026-05-10',
            end_date: '2026-05-14',
        });
    });

    it('remove() DELETEs the step uuid', async () => {
        let deletedUuid: string | undefined;
        server.use(
            http.delete('/api/v1/planning/campaign-steps/:uuid/', ({ params }) => {
                deletedUuid = params.uuid as string;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const { result } = renderHook(() => useCampaignStepMutations(CAMP, 2026), { wrapper: createQueryWrapper() });

        act(() => result.current.remove(STEP_UUID));

        await waitFor(() => expect(deletedUuid).toBe(STEP_UUID));
    });
});
