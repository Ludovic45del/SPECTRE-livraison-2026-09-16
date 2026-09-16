/**
 * Tests ManageConversationMembersDialog — vue propriétaire (retirer / ajouter),
 * vue membre simple (quitter sans confirmation), propriétaire qui quitte
 * (confirmation, transfert), conversation privée en lecture seule, mention
 * « (propriétaire) », badge « inactif », notifications d'erreur.
 *
 * UUIDs alignés sur l'annuaire mocké (GET /users/lookup/) : 1111 = Pierre
 * Dupont (moi), 2222 = Alice Martin, 3333 = Jean Bernard, 4444 = Lucie Petit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server } from '@test/test-utils';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
    createMockMeApi,
    createMockUserSummary,
    messagingHandlersWithData,
} from '@test/mocks/messaging-handlers';
import { ConversationSchema, type Conversation } from '@entities/messaging';
import { useNotificationStore } from '@shared/lib/notification';
import { ManageConversationMembersDialog } from './ManageConversationMembersDialog';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const JEAN_UUID = '33333333-3333-3333-3333-333333333333';
const LUCIE_UUID = '44444444-4444-4444-4444-444444444444';
/** Ancien membre désactivé — absent de l'annuaire (is_active=true uniquement) ⇒ texte de repli. */
const INACTIVE_UUID = '88888888-8888-4888-8888-888888888888';

const member = (uuid: string, firstName: string, lastName: string, overrides: Record<string, unknown> = {}) =>
    createMockConversationMember(
        createMockUserSummary({
            uuid,
            username: `${firstName[0]}${lastName}`.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            ...overrides,
        }),
    );

const groupApi = (overrides: Record<string, unknown> = {}) =>
    createMockConversation({
        uuid: CONVERSATION_UUID,
        kind: 'group',
        name: 'Prépa tir 42',
        owner_uuid: MOCK_ME_UUID,
        members: [
            member(MOCK_OTHER_UUID, 'Alice', 'Martin', { joined_at: '2026-09-01T10:00:00Z' }),
            member(MOCK_ME_UUID, 'Pierre', 'Dupont', { joined_at: '2026-09-01T09:00:00Z' }),
            member(JEAN_UUID, 'Jean', 'Bernard', { joined_at: '2026-09-02T10:00:00Z' }),
        ],
        ...overrides,
    });

const directApi = () =>
    createMockConversation({
        uuid: CONVERSATION_UUID,
        kind: 'direct',
        members: [member(MOCK_ME_UUID, 'Pierre', 'Dupont'), member(MOCK_OTHER_UUID, 'Alice', 'Martin')],
    });

interface RecordedRequest {
    method: string;
    url: string;
    body: string | null;
}

function recordRequests(): RecordedRequest[] {
    const seen: RecordedRequest[] = [];
    server.events.on('request:start', async ({ request }) => {
        const body = request.method === 'GET' ? null : await request.clone().text();
        seen.push({ method: request.method, url: request.url, body });
    });
    return seen;
}

const deletes = (seen: RecordedRequest[]) => seen.filter((r) => r.method === 'DELETE');

type Handler = ReturnType<typeof http.get>;

/**
 * Enregistre `overrides` (en tête, donc prioritaires) puis les handlers avec données, et rend
 * le dialogue (ouvert) pour `apiConversation`.
 */
function renderDialog(
    apiConversation: ReturnType<typeof createMockConversation>,
    { meUuid = MOCK_ME_UUID, overrides = [] }: { meUuid?: string; overrides?: Handler[] } = {},
) {
    server.use(...overrides, ...messagingHandlersWithData({ conversations: [apiConversation] }));
    const conversation: Conversation = ConversationSchema.parse(apiConversation);
    const onClose = vi.fn();
    const onLeft = vi.fn();
    const utils = setup(
        <ManageConversationMembersDialog
            open
            onClose={onClose}
            conversation={conversation}
            meUuid={meUuid}
            onLeft={onLeft}
        />,
    );
    return { ...utils, onClose, onLeft };
}

const findDialog = () => screen.findByRole('dialog', { name: /^Membres — / });

describe('ManageConversationMembersDialog', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
        server.use(http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())));
    });

    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('propriétaire : liste les membres (propriétaire en premier), retirer sur les autres, ajout et quitter', async () => {
        renderDialog(groupApi());

        const dialog = await findDialog();
        expect(dialog).toHaveTextContent('Membres — Prépa tir 42');
        expect(await within(dialog).findByText('Pierre Dupont')).toBeInTheDocument();
        expect(within(dialog).getByText('Alice Martin')).toBeInTheDocument();
        expect(within(dialog).getByText('Jean Bernard')).toBeInTheDocument();
        expect(within(dialog).getByText('(propriétaire)')).toBeInTheDocument();

        // Propriétaire en tête, puis par ordre d'adhésion (Alice avant Jean).
        const names = within(dialog)
            .getAllByRole('button', { name: /Pierre Dupont|Alice Martin|Jean Bernard/ })
            .map((el) => el.textContent);
        expect(names).toEqual(['Pierre Dupont', 'Alice Martin', 'Jean Bernard']);

        // Deux boutons retirer (les autres membres, jamais moi).
        expect(within(dialog).getAllByRole('button', { name: 'Retirer le membre' })).toHaveLength(2);
        expect(within(dialog).getByLabelText('Ajouter des membres')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Ajouter' })).toBeDisabled();
        expect(within(dialog).getByRole('button', { name: 'Quitter le groupe' })).toBeInTheDocument();
    });

    it('propriétaire : retire un membre (DELETE members/:uuid, 200) et notifie', async () => {
        const seen = recordRequests();
        const { user, onClose, onLeft } = renderDialog(groupApi());

        const dialog = await findDialog();
        await within(dialog).findByText('Jean Bernard');
        // Ligne de Jean : le second bouton retirer (Alice puis Jean).
        const removeButtons = within(dialog).getAllByRole('button', { name: 'Retirer le membre' });
        await user.click(removeButtons[1]);

        await waitFor(() => expect(deletes(seen)).toHaveLength(1));
        expect(deletes(seen)[0].url).toContain(`/conversations/${CONVERSATION_UUID}/members/${JEAN_UUID}/`);
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Membre retiré du groupe')).toBe(true);
        });
        expect(onClose).not.toHaveBeenCalled();
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('propriétaire : ajoute des membres via le sélecteur (POST members/ { member_uuids })', async () => {
        const seen = recordRequests();
        const { user } = renderDialog(groupApi());

        const dialog = await findDialog();
        const addButton = within(dialog).getByRole('button', { name: 'Ajouter' });
        expect(addButton).toBeDisabled();

        const input = within(dialog).getByLabelText('Ajouter des membres');
        await user.click(input);
        await user.type(input, 'Petit');
        const listbox = await screen.findByRole('listbox');
        await user.click(within(listbox).getByText('Lucie Petit'));

        expect(addButton).toBeEnabled();
        await user.click(addButton);

        await waitFor(() => {
            const post = seen.find((r) => r.method === 'POST' && r.url.endsWith('/members/'));
            expect(post).toBeDefined();
            expect(JSON.parse(post!.body ?? '')).toEqual({ member_uuids: [LUCIE_UUID] });
        });
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Membres ajoutés au groupe')).toBe(true);
        });
        // La sélection est vidée après l'ajout.
        expect(within(dialog).getByRole('button', { name: 'Ajouter' })).toBeDisabled();
    });

    it("notifie une erreur si l'ajout échoue", async () => {
        const { user } = renderDialog(groupApi(), {
            overrides: [
                http.post(
                    `/api/v1/conversations/${CONVERSATION_UUID}/members/`,
                    () => new HttpResponse(null, { status: 500 }),
                ),
            ],
        });

        const dialog = await findDialog();
        const input = within(dialog).getByLabelText('Ajouter des membres');
        await user.click(input);
        await user.type(input, 'Petit');
        await user.click(within(await screen.findByRole('listbox')).getByText('Lucie Petit'));
        await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
    });

    it('notifie une erreur si le retrait échoue', async () => {
        const { user } = renderDialog(groupApi(), {
            overrides: [
                http.delete(
                    `/api/v1/conversations/${CONVERSATION_UUID}/members/:memberUuid/`,
                    () => new HttpResponse(null, { status: 500 }),
                ),
            ],
        });

        const dialog = await findDialog();
        await within(dialog).findByText('Jean Bernard');
        await user.click(within(dialog).getAllByRole('button', { name: 'Retirer le membre' })[0]);

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
    });

    it('membre simple : aucun bouton retirer, peut ajouter, « Quitter le groupe » sans confirmation (204)', async () => {
        const seen = recordRequests();
        const { user, onClose, onLeft } = renderDialog(groupApi({ owner_uuid: MOCK_OTHER_UUID }));

        const dialog = await findDialog();
        await within(dialog).findByText('Alice Martin');
        expect(within(dialog).queryByRole('button', { name: 'Retirer le membre' })).not.toBeInTheDocument();
        expect(within(dialog).getByLabelText('Ajouter des membres')).toBeInTheDocument();
        // La mention (propriétaire) suit désormais Alice, en tête de liste.
        const first = within(dialog).getAllByRole('button', { name: /Pierre Dupont|Alice Martin|Jean Bernard/ })[0];
        expect(first).toHaveTextContent('Alice Martin');

        await user.click(within(dialog).getByRole('button', { name: 'Quitter le groupe' }));

        expect(screen.queryByRole('dialog', { name: 'Quitter le groupe ?' })).not.toBeInTheDocument();
        await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(deletes(seen)).toHaveLength(1);
        expect(deletes(seen)[0].url).toContain(`/conversations/${CONVERSATION_UUID}/members/${MOCK_ME_UUID}/`);
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Vous avez quitté le groupe')).toBe(true);
        });
    });

    it('propriétaire : « Quitter le groupe » demande confirmation (transfert de propriété) puis part', async () => {
        const seen = recordRequests();
        const { user, onClose, onLeft } = renderDialog(groupApi());

        const dialog = await findDialog();
        await user.click(within(dialog).getByRole('button', { name: 'Quitter le groupe' }));

        const confirm = await screen.findByRole('dialog', { name: 'Quitter le groupe ?' });
        expect(within(confirm).getByText(/La propriété sera transférée au membre le plus ancien/)).toBeInTheDocument();
        expect(deletes(seen)).toHaveLength(0);
        expect(onLeft).not.toHaveBeenCalled();

        await user.click(within(confirm).getByRole('button', { name: 'Quitter' }));

        await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(deletes(seen)[0].url).toContain(`/members/${MOCK_ME_UUID}/`);
    });

    it('propriétaire : annuler la confirmation de départ ne fait rien', async () => {
        const seen = recordRequests();
        const { user, onLeft } = renderDialog(groupApi());

        const dialog = await findDialog();
        await user.click(within(dialog).getByRole('button', { name: 'Quitter le groupe' }));
        const confirm = await screen.findByRole('dialog', { name: 'Quitter le groupe ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Annuler' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Quitter le groupe ?' })).not.toBeInTheDocument(),
        );
        expect(deletes(seen)).toHaveLength(0);
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('notifie une erreur si le départ échoue (onLeft / onClose non appelés)', async () => {
        const { user, onClose, onLeft } = renderDialog(groupApi({ owner_uuid: MOCK_OTHER_UUID }), {
            overrides: [
                http.delete(
                    `/api/v1/conversations/${CONVERSATION_UUID}/members/:memberUuid/`,
                    () => new HttpResponse(null, { status: 500 }),
                ),
            ],
        });

        await user.click(within(await findDialog()).getByRole('button', { name: 'Quitter le groupe' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onLeft).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('conversation privée : les 2 membres en lecture seule, sans ajout / retrait / quitter', async () => {
        renderDialog(directApi());

        const dialog = await findDialog();
        expect(dialog).toHaveTextContent('Membres — Alice Martin');
        expect(await within(dialog).findByText('Pierre Dupont')).toBeInTheDocument();
        expect(within(dialog).getByText('Alice Martin')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Retirer le membre' })).not.toBeInTheDocument();
        expect(within(dialog).queryByLabelText('Ajouter des membres')).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Quitter le groupe' })).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    });

    it('affiche le badge « inactif » pour un membre désactivé (texte de repli hors annuaire)', async () => {
        renderDialog(
            groupApi({
                members: [
                    member(MOCK_ME_UUID, 'Pierre', 'Dupont'),
                    member(INACTIVE_UUID, 'Ancien', 'Membre', { is_active: false }),
                ],
            }),
        );

        const dialog = await findDialog();
        expect(await within(dialog).findByText('Ancien Membre')).toBeInTheDocument();
        expect(within(dialog).getByText('inactif')).toBeInTheDocument();
        expect(within(dialog).getAllByText('inactif')).toHaveLength(1);
    });

    it('« Fermer » appelle onClose', async () => {
        const { user, onClose } = renderDialog(groupApi());

        await user.click(within(await findDialog()).getByRole('button', { name: 'Fermer' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ne rend rien quand open=false', () => {
        server.use(...messagingHandlersWithData({ conversations: [groupApi()] }));
        setup(
            <ManageConversationMembersDialog
                open={false}
                onClose={vi.fn()}
                conversation={ConversationSchema.parse(groupApi())}
                meUuid={MOCK_ME_UUID}
                onLeft={vi.fn()}
            />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
