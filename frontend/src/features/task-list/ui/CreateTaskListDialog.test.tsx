/**
 * Tests CreateTaskListDialog — validation, sélection couleur, soumission,
 * mode édition (renommer / couleur).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { MOCK_OWNER_UUID, createMockTaskList } from '@test/mocks/tasklist-handlers';
import { TaskListSummarySchema } from '@entities/task-list';
import { useNotificationStore } from '@shared/lib/notification';
import { CreateTaskListDialog } from './CreateTaskListDialog';

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

describe('CreateTaskListDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
        server.use(http.get('/api/v1/auth/me/', () => HttpResponse.json(mockMeApi)));
    });

    it('affiche le formulaire de création (nom, description, couleurs, membres)', () => {
        setup(<CreateTaskListDialog open onClose={vi.fn()} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Nouvelle liste partagée')).toBeInTheDocument();
        expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Couleur Bleu' })).toBeInTheDocument();
        expect(screen.getByLabelText('Inviter des membres')).toBeInTheDocument();
    });

    it('ne rend rien quand open=false', () => {
        setup(<CreateTaskListDialog open={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('bloque la soumission avec un nom vide (validation zod FR)', async () => {
        let posted = false;
        server.use(
            http.post('/api/v1/task-lists/', () => {
                posted = true;
                return HttpResponse.json(createMockTaskList(), { status: 201 });
            }),
        );

        const { user } = setup(<CreateTaskListDialog open onClose={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Créer' }));

        expect(await screen.findByText('Le nom est requis')).toBeInTheDocument();
        expect(posted).toBe(false);
    });

    it('soumet la création avec nom + couleur choisie et ferme le dialog', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/task-lists/', async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockTaskList({ name: 'Prépa tir', color: 'orange' }), { status: 201 });
            }),
        );

        const onClose = vi.fn();
        const { user } = setup(<CreateTaskListDialog open onClose={onClose} />);

        await user.type(screen.getByLabelText(/^nom/i), 'Prépa tir');
        await user.click(screen.getByRole('button', { name: 'Couleur Orange' }));
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(sentBody).toEqual({
            name: 'Prépa tir',
            description: '',
            color: 'orange',
            member_uuids: [],
        });
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications.some((n) => n.message === 'Liste créée avec succès')).toBe(true);
    });

    it('signale une erreur serveur sans fermer le dialog', async () => {
        server.use(http.post('/api/v1/task-lists/', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));

        const onClose = vi.fn();
        const { user } = setup(<CreateTaskListDialog open onClose={onClose} />);

        await user.type(screen.getByLabelText(/^nom/i), 'Echec');
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('mode édition : pré-remplit, masque les membres et PATCH la liste', async () => {
        const list = TaskListSummarySchema.parse(
            createMockTaskList({ name: 'Ancienne', description: 'desc', color: 'green' }),
        );
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/task-lists/${list.uuid}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockTaskList({ uuid: list.uuid, name: 'Renommée' }));
            }),
        );

        const onClose = vi.fn();
        const { user } = setup(<CreateTaskListDialog open onClose={onClose} list={list} />);

        expect(screen.getByText('Modifier la liste')).toBeInTheDocument();
        expect(screen.getByLabelText(/^nom/i)).toHaveValue('Ancienne');
        expect(screen.queryByLabelText('Inviter des membres')).not.toBeInTheDocument();

        await user.clear(screen.getByLabelText(/^nom/i));
        await user.type(screen.getByLabelText(/^nom/i), 'Renommée');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(sentBody).toEqual({ name: 'Renommée', description: 'desc', color: 'green' });
    });

    it('annule sans soumettre', async () => {
        const onClose = vi.fn();
        const { user } = setup(<CreateTaskListDialog open onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Annuler' }));
        expect(onClose).toHaveBeenCalled();
    });
});
