/**
 * Tests d'intégration MemberPeriodPopover — create/edit/delete via MSW.
 */
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { setup, server } from '@test/test-utils';
import { MemberPeriodPopover } from './MemberPeriodPopover';
import type { PlanningMemberPeriod } from '@entities/planning/core/model/planning.schema';

const PERIOD_UUID = '33333333-3333-3333-3333-333333333333';

async function clickDay(user: ReturnType<typeof setup>['user'], n: number) {
    const btn = screen.getAllByRole('gridcell').find((b) => b.textContent === String(n));
    expect(btn, `bouton jour ${n} introuvable`).toBeTruthy();
    await user.click(btn!);
}

const existing: PlanningMemberPeriod = {
    uuid: PERIOD_UUID,
    memberName: 'DUPONT Jean',
    memberRole: 'Assembleur',
    year: 2026,
    periodType: 'mission',
    commentaire: 'old',
    startDate: '2026-05-03',
    endDate: '2026-05-06',
};

describe('MemberPeriodPopover', () => {
    it('requires a period type before saving, then creates (POST)', async () => {
        let captured: Record<string, unknown> | undefined;
        server.use(
            http.post('/api/v1/planning/member-periods/', async ({ request }) => {
                captured = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ uuid: crypto.randomUUID(), ...captured }, { status: 201 });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <MemberPeriodPopover
                anchorEl={document.body}
                defaultDate="2026-05-15"
                memberName="DUPONT Jean"
                memberRole="Assembleur"
                year={2026}
                onClose={onClose}
            />,
        );

        // Sans type sélectionné, le bouton est désactivé.
        expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'Congés' }));

        await clickDay(user, 7);
        await clickDay(user, 9);
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(captured).toEqual({
            member_name: 'DUPONT Jean',
            member_role: 'Assembleur',
            year: 2026,
            period_type: 'congés',
            commentaire: null,
            start_date: '2026-05-07',
            end_date: '2026-05-09',
        });
    });

    it('edits an existing period (PATCH on its uuid, commentaire updated)', async () => {
        let captured: Record<string, unknown> | undefined;
        let capturedUuid: string | undefined;
        server.use(
            http.patch('/api/v1/planning/member-periods/:uuid/', async ({ request, params }) => {
                captured = (await request.json()) as Record<string, unknown>;
                capturedUuid = params.uuid as string;
                return HttpResponse.json({ uuid: params.uuid, ...captured });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <MemberPeriodPopover
                anchorEl={document.body}
                existingPeriod={existing}
                defaultDate="2026-05-03"
                memberName="DUPONT Jean"
                memberRole="Assembleur"
                year={2026}
                onClose={onClose}
            />,
        );

        const note = screen.getByLabelText('Commentaire (optionnel)');
        await user.clear(note);
        await user.type(note, 'maj');
        await user.click(screen.getByRole('button', { name: 'Modifier' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(capturedUuid).toBe(PERIOD_UUID);
        expect(captured).toMatchObject({
            period_type: 'mission',
            commentaire: 'maj',
            start_date: '2026-05-03',
            end_date: '2026-05-06',
        });
    });

    it('deletes an existing period (DELETE on its uuid)', async () => {
        let deletedUuid: string | undefined;
        server.use(
            http.delete('/api/v1/planning/member-periods/:uuid/', ({ params }) => {
                deletedUuid = params.uuid as string;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        const onClose = vi.fn();
        const { user } = setup(
            <MemberPeriodPopover
                anchorEl={document.body}
                existingPeriod={existing}
                defaultDate="2026-05-03"
                memberName="DUPONT Jean"
                memberRole="Assembleur"
                year={2026}
                onClose={onClose}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Supprimer' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(deletedUuid).toBe(PERIOD_UUID);
    });
});
