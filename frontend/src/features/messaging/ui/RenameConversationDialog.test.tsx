/**
 * Tests RenameConversationDialog — champ pré-rempli, validation zod FR (nom
 * requis, longueur max), PATCH { name } + onClose + notification, erreur
 * serveur (dialogue conservé), annulation (réinitialisation).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { createMockConversation, messagingHandlersWithData } from '@test/mocks/messaging-handlers';
import { ConversationSchema, MAX_CONVERSATION_NAME_LENGTH, type Conversation } from '@entities/messaging';
import { useNotificationStore } from '@shared/lib/notification';
import { RenameConversationDialog } from './RenameConversationDialog';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const groupApi = () => createMockConversation({ uuid: CONVERSATION_UUID, kind: 'group', name: 'Prépa tir 42' });

/** Capture le corps du PATCH /conversations/:uuid/ (les handlers avec données répondent). */
function capturePatch() {
    const state: { body: Record<string, unknown> | null; count: number } = { body: null, count: 0 };
    server.events.on('request:start', async ({ request }) => {
        if (request.method !== 'PATCH') return;
        state.count += 1;
        state.body = (await request.clone().json()) as Record<string, unknown>;
    });
    return state;
}

type Handler = ReturnType<typeof http.patch>;

/** `overrides` (en tête, donc prioritaires) puis handlers avec données, puis rendu du dialogue. */
function renderDialog({ open = true, overrides = [] }: { open?: boolean; overrides?: Handler[] } = {}) {
    const apiConversation = groupApi();
    server.use(...overrides, ...messagingHandlersWithData({ conversations: [apiConversation] }));
    const conversation: Conversation = ConversationSchema.parse(apiConversation);
    const onClose = vi.fn();
    const utils = setup(<RenameConversationDialog open={open} onClose={onClose} conversation={conversation} />);
    return { ...utils, onClose, conversation };
}

const findDialog = () => screen.findByRole('dialog', { name: 'Renommer le groupe' });
const nameInput = (dialog: HTMLElement) => within(dialog).getByLabelText(/Nom du groupe/);

describe('RenameConversationDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('pré-remplit le champ avec le nom courant du groupe', async () => {
        renderDialog();

        const dialog = await findDialog();
        const input = nameInput(dialog);
        expect(input).toHaveValue('Prépa tir 42');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute('maxlength', String(MAX_CONVERSATION_NAME_LENGTH));
        expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    });

    it('ne rend rien quand open=false', () => {
        renderDialog({ open: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('refuse un nom vide (ou espaces) sans appeler le serveur', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const dialog = await findDialog();
        const input = nameInput(dialog);
        await user.clear(input);
        await user.type(input, '   ');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        expect(await within(dialog).findByText('Le nom du groupe est requis')).toBeInTheDocument();
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(patch.count).toBe(0);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('envoie PATCH { name } avec le nom strippé, notifie et ferme', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const dialog = await findDialog();
        const input = nameInput(dialog);
        await user.clear(input);
        await user.type(input, '  Prépa tir 43  ');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patch.body).toEqual({ name: 'Prépa tir 43' }));
        expect(patch.count).toBe(1);
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Groupe renommé' && n.type === 'success')).toBe(true);
        });
    });

    it('soumet aussi avec Entrée dans le champ', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const input = nameInput(await findDialog());
        await user.clear(input);
        await user.type(input, 'Nouveau nom{Enter}');

        await waitFor(() => expect(patch.body).toEqual({ name: 'Nouveau nom' }));
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('notifie une erreur serveur et garde le dialogue ouvert', async () => {
        const { user, onClose } = renderDialog({
            overrides: [
                http.patch(`/api/v1/conversations/${CONVERSATION_UUID}/`, () =>
                    HttpResponse.json(
                        { error: 'Seul le propriétaire peut renommer', code: 'FORBIDDEN' },
                        { status: 403 },
                    ),
                ),
            ],
        });

        const dialog = await findDialog();
        const input = nameInput(dialog);
        await user.clear(input);
        await user.type(input, 'Interdit');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog', { name: 'Renommer le groupe' })).toBeInTheDocument();
        expect(input).toHaveValue('Interdit');
    });

    it('« Annuler » réinitialise le champ et appelle onClose', async () => {
        const patch = capturePatch();
        const { user, onClose, conversation, rerender } = renderDialog();

        const dialog = await findDialog();
        const input = nameInput(dialog);
        await user.clear(input);
        await user.type(input, 'Brouillon');
        await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(patch.count).toBe(0);

        // Réouverture : le nom courant est de nouveau proposé, pas le brouillon.
        rerender(<RenameConversationDialog open={false} onClose={onClose} conversation={conversation} />);
        rerender(<RenameConversationDialog open onClose={onClose} conversation={conversation} />);
        await waitFor(() => expect(nameInput(screen.getByRole('dialog'))).toHaveValue('Prépa tir 42'));
    });
});
