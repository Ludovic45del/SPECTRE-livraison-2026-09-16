/**
 * Tests NewConversationDialog — bascule privée / groupe, validation zod FR,
 * corps envoyé (member_uuids), onCreated / onClose, erreur serveur, annulation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { createMockConversation, createMockMeApi, messagingHandlersWithData } from '@test/mocks/messaging-handlers';
import { useNotificationStore } from '@shared/lib/notification';
import { NewConversationDialog } from './NewConversationDialog';

// UUIDs de l'annuaire mocké (GET /users/lookup/) — cf. src/test/mocks/handlers.ts.
const ALICE_UUID = '22222222-2222-2222-2222-222222222222';
const JEAN_UUID = '33333333-3333-3333-3333-333333333333';
const CREATED_UUID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** Capture le corps du POST /conversations/ et renvoie `response` (statut `status`). */
function capturePost(status = 201, response: Record<string, unknown> = createMockConversation({ uuid: CREATED_UUID })) {
    const state: { body: Record<string, unknown> | null } = { body: null };
    server.use(
        http.post('/api/v1/conversations/', async ({ request }) => {
            state.body = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json(response, { status });
        }),
    );
    return state;
}

/** Ouvre le sélecteur `label` et clique l'option `name`. */
async function pickUser(user: ReturnType<typeof setup>['user'], label: string, name: RegExp) {
    await user.click(screen.getByLabelText(label));
    await user.click(await screen.findByRole('option', { name }));
}

describe('NewConversationDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
        server.use(
            ...messagingHandlersWithData({ conversations: [] }),
            http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())),
        );
    });

    it('affiche le formulaire « privée » par défaut (destinataire, pas de nom de groupe)', () => {
        setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        expect(screen.getByRole('dialog', { name: 'Nouvelle conversation' })).toBeInTheDocument();
        const toggle = screen.getByRole('group', { name: 'Type de conversation' });
        expect(within(toggle).getByRole('button', { name: 'Privée' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(toggle).getByRole('button', { name: 'Groupe' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByLabelText('Destinataire')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Nom du groupe/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Membres')).not.toBeInTheDocument();
    });

    it('ne rend rien quand open=false', () => {
        setup(<NewConversationDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('bascule en « groupe » (nom + membres) puis revient en « privée »', async () => {
        const { user } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        expect(screen.getByRole('button', { name: 'Groupe' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText(/Nom du groupe/)).toBeInTheDocument();
        expect(screen.getByLabelText('Membres')).toBeInTheDocument();
        expect(screen.queryByLabelText('Destinataire')).not.toBeInTheDocument();

        // Re-cliquer le type déjà actif ne change rien (exclusive → null ignoré).
        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        expect(screen.getByLabelText(/Nom du groupe/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Privée' }));
        expect(screen.getByLabelText('Destinataire')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Nom du groupe/)).not.toBeInTheDocument();
    });

    it('privée : bloque la soumission sans destinataire (validation zod FR)', async () => {
        const post = capturePost();
        const { user } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Créer' }));

        expect(await screen.findByText('Choisissez un destinataire')).toBeInTheDocument();
        expect(post.body).toBeNull();
    });

    it('groupe : bloque la soumission sans nom (validation zod FR)', async () => {
        const post = capturePost();
        const { user } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        expect(await screen.findByText('Le nom du groupe est requis')).toBeInTheDocument();
        expect(post.body).toBeNull();
    });

    it('privée : envoie {kind, member_uuids} puis appelle onCreated et onClose', async () => {
        const post = capturePost();
        const onClose = vi.fn();
        const onCreated = vi.fn();
        const { user } = setup(<NewConversationDialog open onClose={onClose} onCreated={onCreated} />);

        await pickUser(user, 'Destinataire', /Alice Martin/);
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(post.body).toEqual({ kind: 'direct', member_uuids: [ALICE_UUID] });
        expect(onCreated).toHaveBeenCalledTimes(1);
        expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ uuid: CREATED_UUID, kind: 'direct' }));
        // La conversation transmise est la forme domaine (camelCase, parsée par le hook).
        expect(onCreated.mock.calls[0][0]).toHaveProperty('unreadCount', 0);
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications.some((n) => n.message === 'Conversation créée' && n.type === 'success')).toBe(true);
    });

    it('privée déjà existante (200) : même flux, onCreated reçoit la conversation renvoyée', async () => {
        capturePost(200, createMockConversation({ uuid: CREATED_UUID, unread_count: 3 }));
        const onCreated = vi.fn();
        const { user } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={onCreated} />);

        await pickUser(user, 'Destinataire', /Alice Martin/);
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => expect(onCreated).toHaveBeenCalled());
        expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ uuid: CREATED_UUID, unreadCount: 3 }));
    });

    it('groupe : envoie {kind, name, member_uuids} avec les membres choisis', async () => {
        const post = capturePost(201, createMockConversation({ uuid: CREATED_UUID, kind: 'group', name: 'Prépa tir' }));
        const onClose = vi.fn();
        const onCreated = vi.fn();
        const { user } = setup(<NewConversationDialog open onClose={onClose} onCreated={onCreated} />);

        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        await user.type(screen.getByLabelText(/Nom du groupe/), '  Prépa tir  ');
        await pickUser(user, 'Membres', /Alice Martin/);
        await pickUser(user, 'Membres', /Jean Bernard/);
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(post.body).toEqual({ kind: 'group', name: 'Prépa tir', member_uuids: [ALICE_UUID, JEAN_UUID] });
        expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ uuid: CREATED_UUID, kind: 'group' }));
    });

    it("exclut l'utilisateur courant des sélections (privée et groupe)", async () => {
        const post = capturePost();
        const { user } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        // Privée : me choisir moi-même ⇒ valeur vidée (l'input se resynchronise au blur) ⇒ validation.
        await pickUser(user, 'Destinataire', /Pierre Dupont/);
        await user.click(screen.getByRole('button', { name: 'Créer' }));
        expect(await screen.findByText('Choisissez un destinataire')).toBeInTheDocument();
        expect(screen.getByLabelText('Destinataire')).toHaveValue('');
        expect(post.body).toBeNull();

        // Groupe : me choisir moi-même ⇒ aucun chip, member_uuids vide.
        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        await user.type(screen.getByLabelText(/Nom du groupe/), 'Solo');
        await pickUser(user, 'Membres', /Pierre Dupont/);
        expect(screen.queryByRole('button', { name: 'Pierre Dupont' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => expect(post.body).not.toBeNull());
        expect(post.body).toEqual({ kind: 'group', name: 'Solo', member_uuids: [] });
    });

    it('signale une erreur serveur (notification) sans fermer le dialog', async () => {
        server.use(
            http.post('/api/v1/conversations/', () =>
                HttpResponse.json({ error: 'Destinataire inconnu', code: 'VALIDATION_ERROR' }, { status: 400 }),
            ),
        );
        const onClose = vi.fn();
        const onCreated = vi.fn();
        const { user } = setup(<NewConversationDialog open onClose={onClose} onCreated={onCreated} />);

        await pickUser(user, 'Destinataire', /Alice Martin/);
        await user.click(screen.getByRole('button', { name: 'Créer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(onCreated).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('annule sans soumettre', async () => {
        const post = capturePost();
        const onClose = vi.fn();
        const { user } = setup(<NewConversationDialog open onClose={onClose} onCreated={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Annuler' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(post.body).toBeNull();
    });

    it('réinitialise le formulaire (privée, vierge) à chaque ouverture', async () => {
        const { user, rerender } = setup(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Groupe' }));
        await user.type(screen.getByLabelText(/Nom du groupe/), 'Brouillon');

        rerender(<NewConversationDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        rerender(<NewConversationDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

        expect(await screen.findByLabelText('Destinataire')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Privée' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByLabelText(/Nom du groupe/)).not.toBeInTheDocument();
    });
});
