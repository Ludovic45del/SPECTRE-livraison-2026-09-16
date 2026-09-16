/**
 * Tests TaskDetailsDialog — champs d'édition (PATCH partiel au blur/changement),
 * options d'assignation limitées aux membres, fil de commentaires.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import {
    MOCK_OWNER_UUID,
    createMockTaskComment,
    createMockTaskItem,
    createMockTaskList,
} from '@test/mocks/tasklist-handlers';
import { TaskListDetailSchema, type TaskListDetail } from '@entities/task-list';
import { TaskDetailsDialog } from './TaskDetailsDialog';

const LIST_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TASK_UUID = '33333333-3333-4333-8333-333333333333';
const MEMBER_UUID = '22222222-2222-2222-2222-222222222222';

const mockMeApi = {
    uuid: MOCK_OWNER_UUID,
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

function buildDetail(): TaskListDetail {
    return TaskListDetailSchema.parse({
        ...createMockTaskList({
            uuid: LIST_UUID,
            name: 'Prépa campagne',
            owner_uuid: MOCK_OWNER_UUID,
            member_uuids: [MEMBER_UUID],
        }),
        tasks: [
            createMockTaskItem({
                uuid: TASK_UUID,
                task_list_uuid: LIST_UUID,
                title: 'Commander les joints',
                note: 'Réf. 42',
                priority: 'high',
            }),
        ],
    });
}

describe('TaskDetailsDialog', () => {
    beforeEach(() => {
        server.use(http.get('/api/v1/auth/me/', () => HttpResponse.json(mockMeApi)));
    });

    it('ne rend rien quand task est null', () => {
        const list = buildDetail();
        setup(<TaskDetailsDialog list={list} task={null} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('affiche les champs pré-remplis de la tâche', async () => {
        const list = buildDetail();
        setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Titre de la tâche')).toHaveValue('Commander les joints');
        expect(screen.getByLabelText('Note de la tâche')).toHaveValue('Réf. 42');
        expect(screen.getByText('Haute')).toBeInTheDocument();
        expect(screen.getByText('Échéance', { selector: 'label' })).toBeInTheDocument();
    });

    it('PATCH le titre au blur (partiel)', async () => {
        const list = buildDetail();
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockTaskItem({ uuid: TASK_UUID, task_list_uuid: LIST_UUID, title: 'Titre modifié' }),
                );
            }),
        );

        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        const titleInput = screen.getByLabelText('Titre de la tâche');
        await user.clear(titleInput);
        await user.type(titleInput, 'Titre modifié');
        await user.tab(); // blur

        await waitFor(() => expect(sentBody).toEqual({ title: 'Titre modifié' }));
    });

    it('PATCH la priorité au changement du select', async () => {
        const list = buildDetail();
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockTaskItem({ uuid: TASK_UUID, task_list_uuid: LIST_UUID, priority: 'critical' }),
                );
            }),
        );

        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        await user.click(screen.getByLabelText('Priorité de la tâche'));
        const listbox = await screen.findByRole('listbox');
        await user.click(within(listbox).getByText('Critique'));

        await waitFor(() => expect(sentBody).toEqual({ priority: 'critical' }));
    });

    it("limite les options d'assignation aux owner + membres de la liste", async () => {
        const list = buildDetail();
        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        await user.click(screen.getByLabelText('Assignée à'));
        const listbox = await screen.findByRole('listbox');

        // Owner + membre présents, les autres utilisateurs du lookup absents.
        expect(await within(listbox).findByText('Pierre Dupont')).toBeInTheDocument();
        expect(within(listbox).getByText('Alice Martin')).toBeInTheDocument();
        expect(within(listbox).getByText('Non assignée')).toBeInTheDocument();
        expect(within(listbox).queryByText('Jean Bernard')).not.toBeInTheDocument();
    });

    it('affiche le fil de commentaires et en ajoute un', async () => {
        const list = buildDetail();
        const existing = createMockTaskComment({
            task_uuid: TASK_UUID,
            author_uuid: MEMBER_UUID,
            text: 'Déjà là',
        });
        const comments = [existing];
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.get(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/`, () => HttpResponse.json(comments)),
            http.post(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                const created = createMockTaskComment({
                    task_uuid: TASK_UUID,
                    author_uuid: MOCK_OWNER_UUID,
                    text: 'Nouveau commentaire',
                });
                comments.push(created);
                return HttpResponse.json(created, { status: 201 });
            }),
        );

        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        expect(await screen.findByText('Déjà là')).toBeInTheDocument();
        expect(await screen.findByText('Alice Martin')).toBeInTheDocument();

        await user.type(screen.getByLabelText('Nouveau commentaire'), 'Nouveau commentaire');
        await user.click(screen.getByRole('button', { name: 'Envoyer le commentaire' }));

        await waitFor(() => expect(sentBody).toEqual({ text: 'Nouveau commentaire' }));
        expect(await screen.findByText('Nouveau commentaire')).toBeInTheDocument();
    });

    it("l'owner peut supprimer le commentaire d'un autre auteur", async () => {
        const list = buildDetail();
        const existing = createMockTaskComment({
            task_uuid: TASK_UUID,
            author_uuid: MEMBER_UUID,
            text: 'À supprimer',
        });
        let deleted = false;
        server.use(
            http.get(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/`, () =>
                HttpResponse.json(deleted ? [] : [existing]),
            ),
            http.delete(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/${existing.uuid}/`, () => {
                deleted = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={vi.fn()} />);

        expect(await screen.findByText('À supprimer')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Supprimer le commentaire' }));

        await waitFor(() => expect(deleted).toBe(true));
        await waitFor(() => expect(screen.queryByText('À supprimer')).not.toBeInTheDocument());
    });

    it('ferme le dialog via le bouton Fermer', async () => {
        const list = buildDetail();
        const onClose = vi.fn();
        const { user } = setup(<TaskDetailsDialog list={list} task={list.tasks[0]} onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Fermer' }));
        expect(onClose).toHaveBeenCalled();
    });
});
