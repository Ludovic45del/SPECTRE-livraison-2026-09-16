/**
 * Tests d'intégration EventPopover (labo) — create/edit/delete via MSW.
 */
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { setup, server } from '@test/test-utils';
import { EventPopover } from './EventPopover';
import type { LabEvent } from '@entities/planning/core/model/planning.schema';

const MACHINE_UUID = '11111111-1111-1111-1111-111111111111';
const EVENT_UUID = '22222222-2222-2222-2222-222222222222';

async function clickDay(user: ReturnType<typeof setup>['user'], n: number) {
    const btn = screen.getAllByRole('gridcell').find((b) => b.textContent === String(n));
    expect(btn, `bouton jour ${n} introuvable`).toBeTruthy();
    await user.click(btn!);
}

const existing: LabEvent = {
    uuid: EVENT_UUID,
    machineUuid: MACHINE_UUID,
    category: 'Panne',
    description: 'old',
    startDate: '2026-05-03',
    endDate: '2026-05-06',
};

describe('EventPopover', () => {
    it('creates a lab event with the selected range (POST)', async () => {
        let captured: Record<string, unknown> | undefined;
        server.use(
            http.post('/api/v1/planning/lab-events/', async ({ request }) => {
                captured = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ uuid: crypto.randomUUID(), ...captured }, { status: 201 });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <EventPopover
                anchorEl={document.body}
                defaultDate="2026-05-15"
                machineUuid={MACHINE_UUID}
                onClose={onClose}
            />,
        );

        await clickDay(user, 7);
        await clickDay(user, 9);
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(captured).toEqual({
            machine_uuid: MACHINE_UUID,
            category: 'Maintenance',
            description: '',
            start_date: '2026-05-07',
            end_date: '2026-05-09',
        });
    });

    it('edits an existing event (PATCH on its uuid)', async () => {
        let captured: Record<string, unknown> | undefined;
        let capturedUuid: string | undefined;
        server.use(
            http.patch('/api/v1/planning/lab-events/:uuid/', async ({ request, params }) => {
                captured = (await request.json()) as Record<string, unknown>;
                capturedUuid = params.uuid as string;
                return HttpResponse.json({ uuid: params.uuid, ...captured });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <EventPopover
                anchorEl={document.body}
                existingEvent={existing}
                defaultDate="2026-05-03"
                machineUuid={MACHINE_UUID}
                onClose={onClose}
            />,
        );

        const note = screen.getByLabelText('Description (optionnel)');
        await user.clear(note);
        await user.type(note, 'updated');
        await user.click(screen.getByRole('button', { name: 'Modifier' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(capturedUuid).toBe(EVENT_UUID);
        expect(captured).toMatchObject({
            category: 'Panne',
            description: 'updated',
            start_date: '2026-05-03',
            end_date: '2026-05-06',
        });
    });

    it('deletes an existing event (DELETE on its uuid)', async () => {
        let deletedUuid: string | undefined;
        server.use(
            http.delete('/api/v1/planning/lab-events/:uuid/', ({ params }) => {
                deletedUuid = params.uuid as string;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <EventPopover
                anchorEl={document.body}
                existingEvent={existing}
                defaultDate="2026-05-03"
                machineUuid={MACHINE_UUID}
                onClose={onClose}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Supprimer' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(deletedUuid).toBe(EVENT_UUID);
    });
});
