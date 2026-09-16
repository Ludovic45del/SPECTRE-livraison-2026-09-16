/**
 * Tests SharedTasksWidget — état vide, rendu des listes, création de tâche,
 * toggle done, menu d'actions owner.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders, setup, server } from '@test/test-utils';
import {
    MOCK_OWNER_UUID,
    createMockTaskItem,
    createMockTaskList,
    tasklistHandlersWithData,
} from '@test/mocks/tasklist-handlers';
import SharedTasksWidget from './SharedTasksWidget';

const LIST_A_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LIST_B_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MEMBER_UUID = '22222222-2222-2222-2222-222222222222';

/** Profil /auth/me/ = Pierre Dupont (uuid = MOCK_OWNER_UUID, présent dans le lookup). */
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

function useMeHandler() {
    return http.get('/api/v1/auth/me/', () => HttpResponse.json(mockMeApi));
}

function buildDataset() {
    return {
        lists: [
            createMockTaskList({
                uuid: LIST_A_UUID,
                name: 'Prépa campagne',
                color: 'blue',
                owner_uuid: MOCK_OWNER_UUID,
                member_uuids: [MEMBER_UUID],
            }),
            createMockTaskList({ uuid: LIST_B_UUID, name: 'Divers', owner_uuid: MEMBER_UUID }),
        ],
        tasks: [
            createMockTaskItem({ task_list_uuid: LIST_A_UUID, title: 'Commander les joints', priority: 'high' }),
            createMockTaskItem({ task_list_uuid: LIST_A_UUID, title: 'Ranger la salle', priority: 'low' }),
            createMockTaskItem({ task_list_uuid: LIST_B_UUID, title: 'Tâche autre liste' }),
        ],
    };
}

describe('SharedTasksWidget', () => {
    beforeEach(() => {
        server.use(useMeHandler());
    });

    it("affiche l'état vide avec CTA quand aucune liste n'est visible", async () => {
        renderWithProviders(<SharedTasksWidget />);

        expect(await screen.findByText('Aucune liste partagée')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Créer une liste' })).toBeInTheDocument();
        expect(screen.getByText('Listes partagées')).toBeInTheDocument();
    });

    it('ouvre le dialog de création depuis le CTA', async () => {
        const { user } = setup(<SharedTasksWidget />);

        await user.click(await screen.findByRole('button', { name: 'Créer une liste' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Nouvelle liste partagée')).toBeInTheDocument();
    });

    it('affiche le sélecteur de listes et le contenu de la première liste', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        renderWithProviders(<SharedTasksWidget />);

        // Chips des deux listes (compteur de tâches restantes inclus).
        expect(await screen.findByText(/Prépa campagne · 2/)).toBeInTheDocument();
        expect(screen.getByText(/Divers · 1/)).toBeInTheDocument();

        // Corps = première liste, triée priorité desc (high avant low).
        expect(await screen.findByText('Commander les joints')).toBeInTheDocument();
        expect(screen.getByText('Ranger la salle')).toBeInTheDocument();
        expect(screen.queryByText('Tâche autre liste')).not.toBeInTheDocument();

        // Progression 0/2.
        expect(screen.getByText('0 / 2 terminées')).toBeInTheDocument();
    });

    it('change de liste au clic sur un chip', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        await user.click(await screen.findByText(/Divers · 1/));

        expect(await screen.findByText('Tâche autre liste')).toBeInTheDocument();
        expect(screen.queryByText('Commander les joints')).not.toBeInTheDocument();
    });

    it('crée une tâche via la saisie rapide (Entrée)', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        const input = await screen.findByPlaceholderText('Ajouter une tâche...');
        await user.type(input, 'Nouvelle mission{Enter}');

        // La tâche créée réapparaît après invalidation + refetch du détail.
        expect(await screen.findByText('Nouvelle mission')).toBeInTheDocument();
        await waitFor(() => expect(input).toHaveValue(''));
        expect(screen.getByText('0 / 3 terminées')).toBeInTheDocument();
    });

    it('coche une tâche : elle passe dans la section Terminées', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        const checkbox = await screen.findByRole('checkbox', { name: /cocher commander les joints/i });
        await user.click(checkbox);

        expect(await screen.findByText('Terminées · 1')).toBeInTheDocument();
        expect(await screen.findByText('1 / 2 terminées')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /décocher commander les joints/i })).toBeChecked();
    });

    it('propose les actions owner dans le menu ⋮ (gérer les membres, renommer, supprimer)', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        await screen.findByText('Commander les joints');
        await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));

        expect(await screen.findByText('Gérer les membres')).toBeInTheDocument();
        expect(screen.getByText('Renommer / couleur')).toBeInTheDocument();
        expect(screen.getByText('Supprimer la liste')).toBeInTheDocument();
        expect(screen.queryByText('Quitter la liste')).not.toBeInTheDocument();
    });

    it('propose « Quitter la liste » à un simple membre et confirme la suppression owner', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        // Bascule sur « Divers » (owner = MEMBER_UUID, me = simple visiteur).
        await user.click(await screen.findByText(/Divers · 1/));
        await screen.findByText('Tâche autre liste');
        await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));

        expect(await screen.findByText('Quitter la liste')).toBeInTheDocument();
        expect(screen.getByText('Voir les membres')).toBeInTheDocument();
        expect(screen.queryByText('Supprimer la liste')).not.toBeInTheDocument();
    });

    it('supprime une liste après confirmation', async () => {
        server.use(useMeHandler(), ...tasklistHandlersWithData(buildDataset()));

        const { user } = setup(<SharedTasksWidget />);

        await screen.findByText('Commander les joints');
        await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
        await user.click(await screen.findByText('Supprimer la liste'));

        // Dialog de confirmation.
        expect(await screen.findByText('Supprimer la liste ?')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Supprimer' }));

        // La liste A disparaît, la liste B devient la sélection courante.
        expect(await screen.findByText('Tâche autre liste')).toBeInTheDocument();
        expect(screen.queryByText(/Prépa campagne/)).not.toBeInTheDocument();
    });

    it("affiche un message en cas d'erreur serveur", async () => {
        server.use(
            useMeHandler(),
            http.get('/api/v1/task-lists/', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
        );

        renderWithProviders(<SharedTasksWidget />);

        expect(await screen.findByText('Impossible de charger les listes partagées.')).toBeInTheDocument();
    });
});
