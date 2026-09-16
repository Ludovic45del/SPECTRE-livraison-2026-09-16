/**
 * Tests EditMessageDialog — champ pré-rempli avec le corps courant, validation
 * zod FR (corps requis), PATCH { body } + notification + onClose, Entrée /
 * Maj+Entrée, erreur serveur (dialogue conservé), annulation (réinitialisation),
 * dialogue fermé sans message cible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import { createMockConversation, createMockMessage, messagingHandlersWithData } from '@test/mocks/messaging-handlers';
import { MAX_MESSAGE_LENGTH, MessageSchema, type Message } from '@entities/messaging';
import { useNotificationStore } from '@shared/lib/notification';
import { EditMessageDialog } from './EditMessageDialog';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MESSAGE_UUID = '00000000-0000-4000-8000-000000000004';
const MESSAGE_URL = `/api/v1/conversations/${CONVERSATION_UUID}/messages/${MESSAGE_UUID}/`;

const messageApi = () =>
    createMockMessage({ uuid: MESSAGE_UUID, conversation_uuid: CONVERSATION_UUID, body: 'Bonjour Marie' });

/** Capture les PATCH émis (corps JSON, URL) via les événements MSW. */
function capturePatch() {
    const state: { body: Record<string, unknown> | null; url: string | null; count: number } = {
        body: null,
        url: null,
        count: 0,
    };
    server.events.on('request:start', async ({ request }) => {
        if (request.method !== 'PATCH') return;
        state.count += 1;
        state.url = request.url;
        state.body = (await request.clone().json()) as Record<string, unknown>;
    });
    return state;
}

type Handler = ReturnType<typeof http.patch>;

/** `overrides` (prioritaires) puis handlers avec données, puis rendu du dialogue. */
function renderDialog({
    open = true,
    overrides = [],
    message: messageOverride,
}: { open?: boolean; overrides?: Handler[]; message?: Message | null } = {}) {
    const apiMessage = messageApi();
    server.use(
        ...overrides,
        ...messagingHandlersWithData({
            conversations: [createMockConversation({ uuid: CONVERSATION_UUID })],
            messages: [apiMessage],
        }),
    );
    const message = messageOverride === undefined ? MessageSchema.parse(apiMessage) : messageOverride;
    const onClose = vi.fn();
    const utils = setup(
        <EditMessageDialog open={open} onClose={onClose} conversationUuid={CONVERSATION_UUID} message={message} />,
    );
    return { ...utils, onClose, message };
}

const findDialog = () => screen.findByRole('dialog', { name: 'Modifier le message' });
const bodyInput = (dialog: HTMLElement) => within(dialog).getByLabelText('Corps du message');

describe('EditMessageDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('pré-remplit le champ avec le corps courant du message', async () => {
        renderDialog();

        const dialog = await findDialog();
        const input = bodyInput(dialog);
        expect(input).toHaveValue('Bonjour Marie');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute('maxlength', String(MAX_MESSAGE_LENGTH));
        expect(
            within(dialog).getByText('Entrée pour enregistrer, Maj+Entrée pour un saut de ligne'),
        ).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    });

    it('ne rend rien quand open=false', () => {
        renderDialog({ open: false });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('reste fermé tant qu’aucun message n’est ciblé (message null)', () => {
        renderDialog({ message: null });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('refuse un corps vide (ou espaces) sans appeler le serveur', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const dialog = await findDialog();
        const input = bodyInput(dialog);
        await user.clear(input);
        await user.type(input, '   ');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        expect(await within(dialog).findByText('Le message ne peut pas être vide')).toBeInTheDocument();
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(patch.count).toBe(0);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('envoie PATCH { body } avec le corps strippé, notifie « Message modifié » et ferme', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const dialog = await findDialog();
        const input = bodyInput(dialog);
        await user.clear(input);
        await user.type(input, '  Bonjour Marie !  ');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patch.body).toEqual({ body: 'Bonjour Marie !' }));
        expect(patch.count).toBe(1);
        expect(patch.url).toMatch(new RegExp(`${MESSAGE_URL}$`));
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Message modifié' && n.type === 'success')).toBe(true);
        });
    });

    it('Entrée enregistre, Maj+Entrée insère un saut de ligne', async () => {
        const patch = capturePatch();
        const { user, onClose } = renderDialog();

        const input = bodyInput(await findDialog());
        await user.clear(input);
        await user.type(input, 'ligne 1{Shift>}{Enter}{/Shift}ligne 2');
        expect(input).toHaveValue('ligne 1\nligne 2');
        expect(patch.count).toBe(0);

        await user.keyboard('{Enter}');

        await waitFor(() => expect(patch.body).toEqual({ body: 'ligne 1\nligne 2' }));
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('notifie une erreur serveur (403) et garde le dialogue ouvert avec la saisie', async () => {
        const { user, onClose } = renderDialog({
            overrides: [
                http.patch(MESSAGE_URL, () =>
                    HttpResponse.json(
                        { error: 'Seul l’auteur peut modifier ce message', code: 'FORBIDDEN' },
                        { status: 403 },
                    ),
                ),
            ],
        });

        const dialog = await findDialog();
        const input = bodyInput(dialog);
        await user.clear(input);
        await user.type(input, 'Interdit');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog', { name: 'Modifier le message' })).toBeInTheDocument();
        expect(input).toHaveValue('Interdit');
        expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    });

    it('« Annuler » appelle onClose sans PATCH et réinitialise le champ à la réouverture', async () => {
        const patch = capturePatch();
        const { user, onClose, message, rerender } = renderDialog();

        const dialog = await findDialog();
        const input = bodyInput(dialog);
        await user.clear(input);
        await user.type(input, 'Brouillon');
        await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(patch.count).toBe(0);

        // Réouverture : le corps courant est de nouveau proposé, pas le brouillon.
        rerender(
            <EditMessageDialog open={false} onClose={onClose} conversationUuid={CONVERSATION_UUID} message={message} />,
        );
        rerender(<EditMessageDialog open onClose={onClose} conversationUuid={CONVERSATION_UUID} message={message} />);
        await waitFor(() => expect(bodyInput(screen.getByRole('dialog'))).toHaveValue('Bonjour Marie'));
    });

    it('re-remplit le champ quand le message ciblé change', async () => {
        const { onClose, message, rerender } = renderDialog();

        expect(bodyInput(await findDialog())).toHaveValue('Bonjour Marie');

        const other = MessageSchema.parse(
            createMockMessage({
                uuid: '00000000-0000-4000-8000-000000000005',
                conversation_uuid: CONVERSATION_UUID,
                body: 'Autre message',
            }),
        );
        rerender(<EditMessageDialog open onClose={onClose} conversationUuid={CONVERSATION_UUID} message={other} />);
        await waitFor(() => expect(bodyInput(screen.getByRole('dialog'))).toHaveValue('Autre message'));

        rerender(<EditMessageDialog open onClose={onClose} conversationUuid={CONVERSATION_UUID} message={message} />);
        await waitFor(() => expect(bodyInput(screen.getByRole('dialog'))).toHaveValue('Bonjour Marie'));
    });
});
