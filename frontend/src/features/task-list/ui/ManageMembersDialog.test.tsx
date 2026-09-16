/**
 * Tests ManageMembersDialog — vue owner (inviter / retirer) et vue membre
 * (quitter la liste).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { MOCK_OWNER_UUID, createMockTaskList } from '@test/mocks/tasklist-handlers';
import { TaskListSummarySchema, type TaskListSummary } from '@entities/task-list';
import { useNotificationStore } from '@shared/lib/notification';
import { ManageMembersDialog } from './ManageMembersDialog';

// UUIDs alignés sur mockUserLookup (handlers globaux) :
// owner = Pierre Dupont, membre = Alice Martin, invitable = Jean Bernard.
const MEMBER_UUID = '22222222-2222-2222-2222-222222222222';
const INVITEE_UUID = '33333333-3333-3333-3333-333333333333';
const LIST_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const baseMeApi = {
    username: 'chef',
    first_name: 'Pierre',
    last_name: 'Dupont',
    role: 'chef_labo',
    permission_group: 'admin',
    laboratoire: 'LMJ',
    service: 'SEPI',
    numero: '',
    bureau: '',
    avatar_url: null,
    signature_url: null,
    is_active: true,
    force_password_change: false,
    last_login: null,
    created_at: null,
    updated_at: null,
};

function mockMeAs(uuid: string) {
    server.use(http.get('/api/v1/auth/me/', () => HttpResponse.json({ ...baseMeApi, uuid })));
}

function buildList(): TaskListSummary {
    return TaskListSummarySchema.parse(
        createMockTaskList({
            uuid: LIST_UUID,
            name: 'Prépa campagne',
            owner_uuid: MOCK_OWNER_UUID,
            member_uuids: [MEMBER_UUID],
        }),
    );
}

describe('ManageMembersDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    it("owner : affiche owner (propriétaire), les membres et le champ d'invitation", async () => {
        mockMeAs(MOCK_OWNER_UUID);
        setup(<ManageMembersDialog open onClose={vi.fn()} list={buildList()} />);

        expect(screen.getByText(/Membres — Prépa campagne/)).toBeInTheDocument();
        expect(await screen.findByText('Pierre Dupont')).toBeInTheDocument();
        expect(screen.getByText('(propriétaire)')).toBeInTheDocument();
        expect(await screen.findByText('Alice Martin')).toBeInTheDocument();

        // Un seul bouton retirer (le membre, pas l'owner).
        expect(screen.getAllByRole('button', { name: 'Retirer le membre' })).toHaveLength(1);
        expect(screen.getByLabelText('Ajouter des membres')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /quitter la liste/i })).not.toBeInTheDocument();
    });

    it('owner : invite un utilisateur via UserMultiSelect + bouton Inviter', async () => {
        mockMeAs(MOCK_OWNER_UUID);
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/members/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockTaskList({
                        uuid: LIST_UUID,
                        owner_uuid: MOCK_OWNER_UUID,
                        member_uuids: [MEMBER_UUID, INVITEE_UUID],
                    }),
                );
            }),
        );

        const { user } = setup(<ManageMembersDialog open onClose={vi.fn()} list={buildList()} />);

        const inviteButton = await screen.findByRole('button', { name: 'Inviter' });
        expect(inviteButton).toBeDisabled();

        const input = screen.getByLabelText('Ajouter des membres');
        await user.click(input);
        await user.type(input, 'Bernard');
        const listbox = await screen.findByRole('listbox');
        await user.click(within(listbox).getByText('Jean Bernard'));

        expect(inviteButton).toBeEnabled();
        await user.click(inviteButton);

        await waitFor(() => expect(sentBody).toEqual({ user_uuids: [INVITEE_UUID] }));
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Membres invités avec succès')).toBe(true);
        });
    });

    it('owner : retire un membre', async () => {
        mockMeAs(MOCK_OWNER_UUID);
        let deletedUrl: string | null = null;
        server.use(
            http.delete(`/api/v1/task-lists/${LIST_UUID}/members/:userUuid/`, ({ request }) => {
                deletedUrl = request.url;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { user } = setup(<ManageMembersDialog open onClose={vi.fn()} list={buildList()} />);

        await screen.findByText('Alice Martin');
        await user.click(screen.getByRole('button', { name: 'Retirer le membre' }));

        await waitFor(() => expect(deletedUrl).toContain(`/members/${MEMBER_UUID}/`));
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Membre retiré de la liste')).toBe(true);
        });
    });

    it('membre : pas de gestion, bouton « Quitter la liste » qui se retire lui-même', async () => {
        mockMeAs(MEMBER_UUID);
        let deletedUrl: string | null = null;
        server.use(
            http.delete(`/api/v1/task-lists/${LIST_UUID}/members/:userUuid/`, ({ request }) => {
                deletedUrl = request.url;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const onClose = vi.fn();
        const { user } = setup(<ManageMembersDialog open onClose={onClose} list={buildList()} />);

        await screen.findByText('Alice Martin');
        expect(screen.queryByRole('button', { name: 'Retirer le membre' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Ajouter des membres')).not.toBeInTheDocument();

        const leaveButton = await screen.findByRole('button', { name: /quitter la liste/i });
        await user.click(leaveButton);

        await waitFor(() => expect(deletedUrl).toContain(`/members/${MEMBER_UUID}/`));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("affiche « Aucun membre invité » quand la liste n'a pas de membres", async () => {
        mockMeAs(MOCK_OWNER_UUID);
        const list = TaskListSummarySchema.parse(
            createMockTaskList({ uuid: LIST_UUID, owner_uuid: MOCK_OWNER_UUID, member_uuids: [] }),
        );
        setup(<ManageMembersDialog open onClose={vi.fn()} list={list} />);

        expect(await screen.findByText('Aucun membre invité pour le moment.')).toBeInTheDocument();
    });

    it("signale une erreur si l'invitation échoue (409 déjà membre)", async () => {
        mockMeAs(MOCK_OWNER_UUID);
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/members/`, () =>
                HttpResponse.json({ error: 'Conflict' }, { status: 409 }),
            ),
        );

        const { user } = setup(<ManageMembersDialog open onClose={vi.fn()} list={buildList()} />);

        const input = await screen.findByLabelText('Ajouter des membres');
        await user.click(input);
        await user.type(input, 'Bernard');
        const listbox = await screen.findByRole('listbox');
        await user.click(within(listbox).getByText('Jean Bernard'));
        await user.click(screen.getByRole('button', { name: 'Inviter' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
    });
});
