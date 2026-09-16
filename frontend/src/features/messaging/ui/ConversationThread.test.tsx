/**
 * Tests ConversationThread — ordre chronologique et séparateurs de jour,
 * bulles (mes messages / autres / système), envoi (Entrée / Maj+Entrée),
 * marquage lu (ouverture, polling), chargement des messages précédents,
 * menu propriétaire / membre (renommer, quitter, supprimer), conversation
 * privée, états erreur / vide, bouton retour, chip « Nouveaux messages ».
 *
 * Données via `messagingHandlersWithData` (MSW) ; les requêtes émises sont
 * observées via `server.events` (pas de dépendance à l'ordre des handlers).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import dayjs from 'dayjs';
import type { ComponentProps } from 'react';

import { setup, server, wait } from '@test/test-utils';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
    createMockMeApi,
    createMockMessage,
    createMockUserSummary,
    messagingHandlersWithData,
} from '@test/mocks/messaging-handlers';
import { createMockCampaign, createMockFsec } from '@test/mocks/handlers';
import { formatDaySeparator } from '@entities/messaging';
import { useNotificationStore } from '@shared/lib/notification';
import { ConversationThread } from './ConversationThread';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const THIRD_UUID = '33333333-3333-3333-3333-333333333333';

/** UUID déterministe (tri stable) pour le i-ème message. */
const uuidAt = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

const marie = () =>
    createMockUserSummary({ uuid: MOCK_OTHER_UUID, username: 'mmartin', first_name: 'Marie', last_name: 'Martin' });

/** Message de la conversation testée (snake_case). */
const message = (i: number, createdAt: string, overrides: Record<string, unknown> = {}) =>
    createMockMessage({
        uuid: uuidAt(i),
        conversation_uuid: CONVERSATION_UUID,
        created_at: createdAt,
        updated_at: createdAt,
        ...overrides,
    });

const fromMarie = (i: number, createdAt: string, body: string) =>
    message(i, createdAt, { author_uuid: MOCK_OTHER_UUID, author: marie(), body });

const fromMe = (i: number, createdAt: string, body: string) => message(i, createdAt, { body });

const systemMessage = (i: number, createdAt: string, body: string) =>
    message(i, createdAt, { kind: 'system', author_uuid: null, author: null, body });

const YESTERDAY = dayjs().subtract(1, 'day').hour(9).minute(0).second(0).millisecond(0).toISOString();
const TODAY_A = dayjs().subtract(3, 'minute').toISOString();
const TODAY_B = dayjs().subtract(2, 'minute').toISOString();
const TODAY_C = dayjs().subtract(1, 'minute').toISOString();

const groupMembers = () => [
    createMockConversationMember(),
    createMockConversationMember(marie()),
    createMockConversationMember(
        createMockUserSummary({ uuid: THIRD_UUID, username: 'jbernard', first_name: 'Jean', last_name: 'Bernard' }),
    ),
];

const directConversation = (overrides: Record<string, unknown> = {}) =>
    createMockConversation({ uuid: CONVERSATION_UUID, kind: 'direct', ...overrides });

const groupConversation = (overrides: Record<string, unknown> = {}) =>
    createMockConversation({
        uuid: CONVERSATION_UUID,
        kind: 'group',
        name: 'Prépa tir 42',
        members: groupMembers(),
        ...overrides,
    });

/** Jeu de données standard : hier (Marie), aujourd'hui (Marie, système, moi). */
const standardMessages = () => [
    fromMarie(1, YESTERDAY, 'Message d’hier'),
    fromMarie(2, TODAY_A, 'Bonjour Pierre'),
    systemMessage(3, TODAY_B, 'Jean Bernard a rejoint le groupe'),
    fromMe(4, TODAY_C, 'Bonjour Marie'),
];

interface RecordedRequest {
    method: string;
    url: string;
    body: string | null;
}

/** Enregistre toutes les requêtes émises (méthode, URL, corps) via les événements MSW. */
function recordRequests(): RecordedRequest[] {
    const seen: RecordedRequest[] = [];
    server.events.on('request:start', async ({ request }) => {
        const body = request.method === 'GET' ? null : await request.clone().text();
        seen.push({ method: request.method, url: request.url, body });
    });
    return seen;
}

const postsTo = (seen: RecordedRequest[], suffix: string) =>
    seen.filter((r) => r.method === 'POST' && r.url.endsWith(suffix));

/** Compte les POST …/read/ et renvoie la conversation avec unread_count = 0. */
function countReads(conversation: ReturnType<typeof createMockConversation>) {
    const counter = { count: 0 };
    server.use(
        http.post(`/api/v1/conversations/${CONVERSATION_UUID}/read/`, () => {
            counter.count += 1;
            return HttpResponse.json({ ...conversation, unread_count: 0 });
        }),
    );
    return counter;
}

function seed(conversation: ReturnType<typeof createMockConversation>, messages = standardMessages()) {
    server.use(
        http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())),
        ...messagingHandlersWithData({ conversations: [conversation], messages }),
    );
}

function renderThread(props: Partial<ComponentProps<typeof ConversationThread>> = {}) {
    const onLeft = vi.fn();
    const utils = setup(
        <ConversationThread conversationUuid={CONVERSATION_UUID} meUuid={MOCK_ME_UUID} onLeft={onLeft} {...props} />,
    );
    return { ...utils, onLeft };
}

const findLog = () => screen.findByRole('log', { name: 'Messages' });

async function openActionsMenu(user: ReturnType<typeof setup>['user']) {
    await user.click(await screen.findByRole('button', { name: 'Actions de la conversation' }));
    return screen.findByRole('menu');
}

describe('ConversationThread', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('affiche les messages en ordre chronologique avec un séparateur par jour', async () => {
        seed(directConversation());
        renderThread();

        const log = await findLog();
        expect(await within(log).findByText('Bonjour Marie')).toBeInTheDocument();

        expect(within(log).getByRole('separator', { name: 'Hier' })).toBeInTheDocument();
        expect(within(log).getByRole('separator', { name: "Aujourd'hui" })).toBeInTheDocument();
        expect(formatDaySeparator(YESTERDAY)).toBe('Hier');

        const bodies = within(log)
            .getAllByTestId(/^(message-bubble|system-message)$/)
            .map((el) => el.textContent ?? '');
        expect(bodies[0]).toContain('Message d’hier');
        expect(bodies[1]).toContain('Bonjour Pierre');
        expect(bodies[2]).toContain('Jean Bernard a rejoint le groupe');
        expect(bodies[3]).toContain('Bonjour Marie');
    });

    it('aligne mes messages à droite (data-mine) et ceux des autres à gauche avec leur auteur', async () => {
        seed(directConversation());
        renderThread();

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');

        const bubbles = within(log).getAllByTestId('message-bubble');
        expect(bubbles).toHaveLength(3);
        expect(bubbles[0]).toHaveAttribute('data-mine', 'false');
        expect(bubbles[1]).toHaveAttribute('data-mine', 'false');
        expect(bubbles[2]).toHaveAttribute('data-mine', 'true');
        expect(bubbles[2]).toHaveStyle({ alignItems: 'flex-end' });
        expect(bubbles[0]).toHaveStyle({ alignItems: 'flex-start' });
        // Nom de l'auteur au-dessus des messages des autres, jamais au-dessus des miens.
        expect(within(bubbles[0]).getByText('Marie Martin')).toBeInTheDocument();
        expect(within(bubbles[2]).queryByText('Pierre Dupont')).not.toBeInTheDocument();
    });

    it('affiche un message système centré, sans auteur ni bulle', async () => {
        seed(directConversation());
        renderThread();

        const log = await findLog();
        const system = await within(log).findByTestId('system-message');
        expect(system).toHaveTextContent('Jean Bernard a rejoint le groupe');
        expect(system).toHaveStyle({ textAlign: 'center' });
        expect(system).not.toHaveAttribute('data-mine');
        expect(within(log).getAllByTestId('message-bubble')).toHaveLength(3);
    });

    it('affiche l’état vide quand la conversation n’a aucun message', async () => {
        seed(directConversation(), []);
        renderThread();

        expect(await screen.findByText('Aucun message. Écrivez le premier !')).toBeInTheDocument();
    });

    it('envoie le message avec Entrée (POST { body }) et l’affiche dans le fil', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');

        await user.type(screen.getByLabelText('Nouveau message'), 'Salut !{Enter}');

        await waitFor(() => expect(postsTo(seen, `/conversations/${CONVERSATION_UUID}/messages/`)).toHaveLength(1));
        expect(JSON.parse(postsTo(seen, '/messages/')[0].body ?? '')).toEqual({ body: 'Salut !' });
        expect(await within(log).findByText('Salut !')).toBeInTheDocument();
        expect(screen.getByLabelText('Nouveau message')).toHaveValue('');
        // Mon message est ajouté en dernier.
        const bubbles = within(log).getAllByTestId('message-bubble');
        expect(bubbles[bubbles.length - 1]).toHaveTextContent('Salut !');
    });

    it('Maj+Entrée insère un retour à la ligne sans envoyer', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        await within(await findLog()).findByText('Bonjour Marie');

        const input = screen.getByLabelText('Nouveau message');
        await user.type(input, 'ligne 1{Shift>}{Enter}{/Shift}ligne 2');

        expect(input).toHaveValue('ligne 1\nligne 2');
        await wait(50);
        expect(postsTo(seen, '/messages/')).toHaveLength(0);
    });

    it('marque la conversation lue une seule fois à l’ouverture quand unread_count > 0', async () => {
        const conversation = directConversation({ unread_count: 2 });
        seed(conversation);
        const reads = countReads(conversation);
        renderThread();

        await within(await findLog()).findByText('Bonjour Marie');

        await waitFor(() => expect(reads.count).toBe(1));
        await wait(150);
        expect(reads.count).toBe(1);
    });

    it('ne marque pas lu à l’ouverture quand unread_count = 0', async () => {
        const conversation = directConversation({ unread_count: 0 });
        seed(conversation);
        const reads = countReads(conversation);
        renderThread();

        await within(await findLog()).findByText('Bonjour Marie');
        await wait(150);

        expect(reads.count).toBe(0);
    });

    it('affiche un nouveau message reçu par polling et marque la conversation lue', async () => {
        const conversation = directConversation({ unread_count: 0 });
        const messages = standardMessages();
        const lastSeeded = messages[messages.length - 1].uuid;
        const incoming = fromMarie(50, dayjs().toISOString(), 'Tu es là ?');
        const gate = { released: false };
        seed(conversation, messages);
        const reads = countReads(conversation);
        // Handler autonome : liste initiale, puis « après le dernier » ⇒ le message entrant une fois libéré.
        server.use(
            http.get(`/api/v1/conversations/${CONVERSATION_UUID}/messages/`, ({ request }) => {
                const after = new URL(request.url).searchParams.get('after');
                if (after === null) return HttpResponse.json({ results: messages, has_more: false });
                if (after === lastSeeded && gate.released) {
                    return HttpResponse.json({ results: [incoming], has_more: false });
                }
                return HttpResponse.json({ results: [], has_more: false });
            }),
        );
        renderThread({ pollingIntervalMs: 20 });

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');
        expect(reads.count).toBe(0);

        gate.released = true;

        expect(await within(log).findByText('Tu es là ?')).toBeInTheDocument();
        const bubbles = within(log).getAllByTestId('message-bubble');
        expect(bubbles[bubbles.length - 1]).toHaveAttribute('data-mine', 'false');
        await waitFor(() => expect(reads.count).toBe(1));
        await wait(100);
        expect(reads.count).toBe(1);
    });

    it('propose « Nouveaux messages ↓ » quand un message arrive alors que je ne suis pas en bas', async () => {
        const conversation = directConversation({ unread_count: 0 });
        const messages = standardMessages();
        const lastSeeded = messages[messages.length - 1].uuid;
        const incoming = fromMarie(51, dayjs().toISOString(), 'Tu es là ?');
        const gate = { released: false };
        seed(conversation, messages);
        server.use(
            http.get(`/api/v1/conversations/${CONVERSATION_UUID}/messages/`, ({ request }) => {
                const after = new URL(request.url).searchParams.get('after');
                if (after === null) return HttpResponse.json({ results: messages, has_more: false });
                if (after === lastSeeded && gate.released) {
                    return HttpResponse.json({ results: [incoming], has_more: false });
                }
                return HttpResponse.json({ results: [], has_more: false });
            }),
        );
        const { user } = renderThread({ pollingIntervalMs: 20 });

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');

        // jsdom n'a pas de mise en page : on simule un fil long dont je ne suis pas en bas.
        // Le conteneur défilant est le parent de la région live (`role="log"`).
        const scroller = log.parentElement as HTMLElement;
        Object.defineProperty(scroller, 'scrollHeight', { value: 2000, configurable: true });
        Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });
        scroller.scrollTop = 0;
        fireEvent.scroll(scroller);

        gate.released = true;

        await within(log).findByText('Tu es là ?');
        const chip = await screen.findByRole('button', { name: 'Nouveaux messages ↓' });
        await user.click(chip);
        expect(screen.queryByRole('button', { name: 'Nouveaux messages ↓' })).not.toBeInTheDocument();
    });

    it('charge les messages précédents (before=<plus ancien chargé>) et les ajoute en tête', async () => {
        const base = dayjs().subtract(2, 'day').hour(8).minute(0).second(0).millisecond(0);
        const many = Array.from({ length: 60 }, (_, i) =>
            fromMarie(i + 100, base.add(i, 'minute').toISOString(), `Message n°${i}`),
        );
        seed(directConversation(), many);
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        await within(log).findByText('Message n°59');
        // Première page : les 50 plus récents (10..59).
        expect(within(log).getByText('Message n°10')).toBeInTheDocument();
        expect(within(log).queryByText('Message n°9')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Charger les messages précédents' }));

        await waitFor(() => {
            const older = seen.find((r) => r.method === 'GET' && r.url.includes('before='));
            expect(older).toBeDefined();
            expect(new URL(older!.url).searchParams.get('before')).toBe(uuidAt(110));
        });
        expect(await within(log).findByText('Message n°0')).toBeInTheDocument();
        const bodies = within(log)
            .getAllByTestId('message-bubble')
            .map((el) => el.textContent ?? '');
        expect(bodies).toHaveLength(60);
        expect(bodies[0]).toContain('Message n°0');
        expect(bodies[59]).toContain('Message n°59');
        // Plus rien à charger.
        expect(screen.queryByRole('button', { name: 'Charger les messages précédents' })).not.toBeInTheDocument();
    });

    it('propriétaire d’un groupe : menu Renommer / Quitter / Supprimer, sous-titre « N membres »', async () => {
        seed(groupConversation());
        const { user } = renderThread();

        expect(await screen.findByRole('heading', { name: 'Prépa tir 42' })).toBeInTheDocument();
        expect(screen.getByText('3 membres')).toBeInTheDocument();

        const menu = await openActionsMenu(user);
        expect(within(menu).getByRole('menuitem', { name: 'Renommer' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Quitter le groupe' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Supprimer le groupe' })).toBeInTheDocument();
    });

    it('membre simple d’un groupe : seul « Quitter le groupe » est proposé', async () => {
        seed(groupConversation({ owner_uuid: MOCK_OTHER_UUID }));
        const { user } = renderThread();

        const menu = await openActionsMenu(user);
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: 'Quitter le groupe' })).toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: 'Renommer' })).not.toBeInTheDocument();
        expect(within(menu).queryByRole('menuitem', { name: 'Supprimer le groupe' })).not.toBeInTheDocument();
    });

    it('« Renommer » ouvre le dialogue de renommage pré-rempli', async () => {
        seed(groupConversation());
        const { user } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Renommer' }));

        const dialog = await screen.findByRole('dialog', { name: 'Renommer le groupe' });
        expect(within(dialog).getByLabelText(/Nom du groupe/)).toHaveValue('Prépa tir 42');
    });

    it('« Supprimer le groupe » demande confirmation, envoie DELETE puis appelle onLeft', async () => {
        seed(groupConversation());
        const seen = recordRequests();
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer le groupe' }));

        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le groupe ?' });
        expect(within(confirm).getByText(/Cette action est définitive/)).toBeInTheDocument();
        expect(onLeft).not.toHaveBeenCalled();

        await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
        const deletes = seen.filter((r) => r.method === 'DELETE');
        expect(deletes).toHaveLength(1);
        expect(deletes[0].url).toMatch(new RegExp(`/conversations/${CONVERSATION_UUID}/$`));
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Groupe supprimé')).toBe(true);
        });
    });

    it('annuler la suppression ne supprime rien', async () => {
        seed(groupConversation());
        const seen = recordRequests();
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer le groupe' }));
        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le groupe ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Annuler' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Supprimer le groupe ?' })).not.toBeInTheDocument(),
        );
        expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(0);
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('notifie une erreur si la suppression échoue (onLeft non appelé)', async () => {
        seed(groupConversation());
        server.use(
            http.delete(`/api/v1/conversations/${CONVERSATION_UUID}/`, () => new HttpResponse(null, { status: 500 })),
        );
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer le groupe' }));
        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le groupe ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('« Quitter le groupe » (membre simple) envoie DELETE members/me sans confirmation puis appelle onLeft', async () => {
        seed(groupConversation({ owner_uuid: MOCK_OTHER_UUID }));
        const seen = recordRequests();
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Quitter le groupe' }));

        await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
        const deletes = seen.filter((r) => r.method === 'DELETE');
        expect(deletes).toHaveLength(1);
        expect(deletes[0].url).toContain(`/conversations/${CONVERSATION_UUID}/members/${MOCK_ME_UUID}/`);
        expect(screen.queryByRole('dialog', { name: 'Quitter le groupe ?' })).not.toBeInTheDocument();
    });

    it('« Quitter le groupe » (propriétaire) demande confirmation avant de partir', async () => {
        seed(groupConversation());
        const seen = recordRequests();
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Quitter le groupe' }));

        const confirm = await screen.findByRole('dialog', { name: 'Quitter le groupe ?' });
        expect(within(confirm).getByText(/La propriété sera transférée/)).toBeInTheDocument();
        expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(0);

        await user.click(within(confirm).getByRole('button', { name: 'Quitter' }));

        await waitFor(() => expect(onLeft).toHaveBeenCalledTimes(1));
        expect(seen.filter((r) => r.method === 'DELETE')[0].url).toContain(`/members/${MOCK_ME_UUID}/`);
    });

    it('notifie une erreur si le départ échoue (onLeft non appelé)', async () => {
        seed(groupConversation({ owner_uuid: MOCK_OTHER_UUID }));
        server.use(
            http.delete(
                `/api/v1/conversations/${CONVERSATION_UUID}/members/:memberUuid/`,
                () => new HttpResponse(null, { status: 500 }),
            ),
        );
        const { user, onLeft } = renderThread();

        const menu = await openActionsMenu(user);
        await user.click(within(menu).getByRole('menuitem', { name: 'Quitter le groupe' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(onLeft).not.toHaveBeenCalled();
    });

    it('conversation privée : titre = autre membre, « Conversation privée », pas de menu d’actions', async () => {
        seed(directConversation());
        renderThread();

        expect(await screen.findByRole('heading', { name: 'Marie Martin' })).toBeInTheDocument();
        expect(screen.getByText('Conversation privée')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Actions de la conversation' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Membres' })).toBeInTheDocument();
    });

    it('« Membres » ouvre le dialogue des membres', async () => {
        seed(directConversation());
        const { user } = renderThread();

        await user.click(await screen.findByRole('button', { name: 'Membres' }));

        expect(await screen.findByRole('dialog', { name: /^Membres — / })).toBeInTheDocument();
    });

    it('affiche une alerte quand la conversation ne peut pas être chargée', async () => {
        seed(directConversation());
        server.use(
            http.get(`/api/v1/conversations/${CONVERSATION_UUID}/`, () => new HttpResponse(null, { status: 500 })),
        );
        renderThread();

        expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger la conversation');
        expect(screen.queryByRole('log')).not.toBeInTheDocument();
    });

    it('affiche un indicateur de chargement avant les données', () => {
        seed(directConversation());
        renderThread();

        expect(screen.getByRole('progressbar', { name: 'Chargement de la conversation' })).toBeInTheDocument();
    });

    it('affiche le bouton retour quand onBack est fourni', async () => {
        seed(directConversation());
        const onBack = vi.fn();
        const { user } = renderThread({ onBack });

        await user.click(await screen.findByRole('button', { name: 'Retour à la liste' }));

        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('n’affiche pas le bouton retour sans onBack', async () => {
        seed(directConversation());
        renderThread();

        await findLog();
        expect(screen.queryByRole('button', { name: 'Retour à la liste' })).not.toBeInTheDocument();
    });

    it('envoie les références attachées via `@` (POST { body, entity_refs }) et les affiche en chips', async () => {
        const fsecUuid = 'f5ec0000-0000-4000-8000-000000000001';
        const campaignUuid = 'ca000000-0000-4000-8000-000000000001';
        seed(directConversation());
        server.use(
            http.get('/api/v1/campaigns/', () =>
                HttpResponse.json([createMockCampaign({ uuid: campaignUuid, name: 'Campagne Alpha' })]),
            ),
            http.get('/api/v1/fsecs/active/', () =>
                HttpResponse.json([
                    createMockFsec({ name: 'FSEC-Alpha', fsec_uuid: fsecUuid, campaign_id: campaignUuid }),
                ]),
            ),
        );
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');

        const input = screen.getByLabelText('Nouveau message');
        await user.type(input, 'Voir @alp');
        // Sélecteur en deux étapes : « alp » filtre les campagnes, puis les FSEC de la campagne.
        await user.click(await screen.findByRole('menuitem', { name: /Campagne Alpha/ }));
        await user.click(await screen.findByRole('menuitem', { name: /FSEC-Alpha/ }));
        expect(input).toHaveValue('Voir ');
        expect(screen.getByRole('group', { name: 'Références attachées' })).toHaveTextContent('FSEC-Alpha');

        await user.keyboard('{Enter}');

        await waitFor(() => expect(postsTo(seen, '/messages/')).toHaveLength(1));
        expect(JSON.parse(postsTo(seen, '/messages/')[0].body ?? '')).toEqual({
            body: 'Voir',
            entity_refs: [{ entity_type: 'fsec', entity_uuid: fsecUuid }],
        });
        const bubbles = await within(log).findAllByTestId('message-bubble');
        const mine = bubbles[bubbles.length - 1];
        expect(within(mine).getByText('Voir')).toBeInTheDocument();
        // Le mock résout la référence en « Réf fsec » / slug « slug-fsec ».
        expect(within(mine).getByRole('link', { name: 'FSEC · Réf fsec' })).toHaveAttribute(
            'href',
            '/fsec-details/slug-fsec',
        );
        expect(screen.queryByRole('group', { name: 'Références attachées' })).not.toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Vague M4 — édition / suppression, polling updated_since, pièces jointes */
/* ------------------------------------------------------------------ */

const MESSAGE_URL = (uuid: string) => `/api/v1/conversations/${CONVERSATION_UUID}/messages/${uuid}/`;

const findMyBubble = async (log: HTMLElement, body: string) => {
    const text = await within(log).findByText(body);
    return text.closest('[data-testid="message-bubble"]') as HTMLElement;
};

/** Enregistre le Content-Type des requêtes non-GET (multipart vs JSON). */
function recordContentTypes(): Record<string, string | null>[] {
    const seen: Record<string, string | null>[] = [];
    server.events.on('request:start', ({ request }) => {
        if (request.method === 'GET') return;
        seen.push({ method: request.method, url: request.url, contentType: request.headers.get('content-type') });
    });
    return seen;
}

const pdfFile = (name = 'rapport.pdf') => new File(['x'.repeat(12 * 1024)], name, { type: 'application/pdf' });
const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

async function openMessageActions(user: ReturnType<typeof setup>['user'], bubble: HTMLElement) {
    await user.click(within(bubble).getByRole('button', { name: 'Actions du message' }));
    return screen.findByRole('menu');
}

describe('ConversationThread — actions sur les messages (M4)', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('mon message : menu « Actions du message » avec Modifier et Supprimer ; pas d’actions sur les messages d’autrui ni système en privée', async () => {
        seed(directConversation());
        const { user } = renderThread();

        const log = await findLog();
        const mine = await findMyBubble(log, 'Bonjour Marie');
        const menu = await openMessageActions(user, mine);
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
        expect(within(menu).getByRole('menuitem', { name: 'Modifier' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Supprimer' })).toBeInTheDocument();
        await user.keyboard('{Escape}');

        const fromOther = await findMyBubble(log, 'Bonjour Pierre');
        expect(within(fromOther).queryByRole('button', { name: 'Actions du message' })).not.toBeInTheDocument();
        const system = within(log).getByTestId('system-message');
        expect(within(system).queryByRole('button', { name: 'Actions du message' })).not.toBeInTheDocument();
    });

    it('« Modifier » : dialogue pré-rempli, PATCH { body }, la bulle affiche le nouveau corps et « modifié »', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        const mine = await findMyBubble(log, 'Bonjour Marie');
        const menu = await openMessageActions(user, mine);
        await user.click(within(menu).getByRole('menuitem', { name: 'Modifier' }));

        const dialog = await screen.findByRole('dialog', { name: 'Modifier le message' });
        const input = within(dialog).getByLabelText('Corps du message');
        expect(input).toHaveValue('Bonjour Marie');
        await user.clear(input);
        await user.type(input, 'Bonjour Marie, corrigé');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(seen.filter((r) => r.method === 'PATCH')).toHaveLength(1));
        const patch = seen.find((r) => r.method === 'PATCH')!;
        expect(patch.url).toMatch(new RegExp(`${MESSAGE_URL(uuidAt(4))}$`));
        expect(JSON.parse(patch.body ?? '')).toEqual({ body: 'Bonjour Marie, corrigé' });

        const edited = await findMyBubble(log, 'Bonjour Marie, corrigé');
        expect(within(edited).getByText('· modifié')).toBeInTheDocument();
        expect(within(log).queryByText('Bonjour Marie')).not.toBeInTheDocument();
        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Modifier le message' })).not.toBeInTheDocument(),
        );
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Message modifié' && n.type === 'success')).toBe(true);
        });
        // Le fil conserve le même nombre de bulles : le message est remplacé, pas ajouté.
        expect(within(log).getAllByTestId('message-bubble')).toHaveLength(3);
    });

    it('« Supprimer » : confirmation, DELETE, la bulle devient « Message supprimé » sans actions', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        const mine = await findMyBubble(log, 'Bonjour Marie');
        const menu = await openMessageActions(user, mine);
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }));

        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le message ?' });
        expect(within(confirm).getByText(/remplacé par « Message supprimé »/)).toBeInTheDocument();
        expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(0);

        await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() => expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(1));
        expect(seen.find((r) => r.method === 'DELETE')!.url).toMatch(new RegExp(`${MESSAGE_URL(uuidAt(4))}$`));

        const deleted = await findMyBubble(log, 'Message supprimé');
        expect(deleted).toHaveAttribute('data-deleted', 'true');
        expect(within(deleted).queryByRole('button', { name: 'Actions du message' })).not.toBeInTheDocument();
        expect(within(log).queryByText('Bonjour Marie')).not.toBeInTheDocument();
        expect(within(log).getAllByTestId('message-bubble')).toHaveLength(3);
        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.message === 'Message supprimé' && n.type === 'success')).toBe(true);
        });
    });

    it('annuler la suppression d’un message ne supprime rien', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        const menu = await openMessageActions(user, await findMyBubble(log, 'Bonjour Marie'));
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }));
        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le message ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Annuler' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Supprimer le message ?' })).not.toBeInTheDocument(),
        );
        await wait(50);
        expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(0);
        expect(within(log).getByText('Bonjour Marie')).toBeInTheDocument();
    });

    it('notifie une erreur si la suppression du message échoue (bulle inchangée)', async () => {
        seed(directConversation());
        server.use(http.delete(MESSAGE_URL(uuidAt(4)), () => new HttpResponse(null, { status: 500 })));
        const { user } = renderThread();

        const log = await findLog();
        const menu = await openMessageActions(user, await findMyBubble(log, 'Bonjour Marie'));
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }));
        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le message ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() => {
            const notifications = useNotificationStore.getState().notifications;
            expect(notifications.some((n) => n.type === 'error')).toBe(true);
        });
        expect(within(log).getByText('Bonjour Marie')).toBeInTheDocument();
        expect(within(log).queryByText('Message supprimé')).not.toBeInTheDocument();
    });

    it('propriétaire du groupe : « Supprimer » seul sur le message d’un membre (jamais « Modifier »)', async () => {
        seed(groupConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        const fromMarie = await findMyBubble(log, 'Bonjour Pierre');
        const menu = await openMessageActions(user, fromMarie);
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).queryByRole('menuitem', { name: 'Modifier' })).not.toBeInTheDocument();

        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }));
        const confirm = await screen.findByRole('dialog', { name: 'Supprimer le message ?' });
        await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() => expect(seen.filter((r) => r.method === 'DELETE')).toHaveLength(1));
        expect(seen.find((r) => r.method === 'DELETE')!.url).toMatch(new RegExp(`${MESSAGE_URL(uuidAt(2))}$`));
        const deleted = await findMyBubble(log, 'Message supprimé');
        expect(deleted).toHaveAttribute('data-mine', 'false');
    });

    it('membre simple d’un groupe : aucune action sur le message d’un autre membre, les deux sur le mien', async () => {
        seed(groupConversation({ owner_uuid: MOCK_OTHER_UUID }));
        const { user } = renderThread();

        const log = await findLog();
        const fromMarie = await findMyBubble(log, 'Bonjour Pierre');
        expect(within(fromMarie).queryByRole('button', { name: 'Actions du message' })).not.toBeInTheDocument();

        const mine = await findMyBubble(log, 'Bonjour Marie');
        const menu = await openMessageActions(user, mine);
        expect(within(menu).getByRole('menuitem', { name: 'Modifier' })).toBeInTheDocument();
        expect(within(menu).getByRole('menuitem', { name: 'Supprimer' })).toBeInTheDocument();
    });

    it('une édition puis une suppression faites « ailleurs » arrivent par le polling updated_since', async () => {
        seed(groupConversation({ unread_count: 0 }));
        const seen = recordRequests();
        renderThread({ pollingIntervalMs: 20 });

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');
        // Le polling porte after=<dernier> et updated_since=<max updated_at>.
        await waitFor(() => {
            const poll = seen.find((r) => r.method === 'GET' && r.url.includes('after='));
            expect(poll).toBeDefined();
            expect(new URL(poll!.url).searchParams.get('updated_since')).toBe(TODAY_C);
        });

        // Édition de mon message depuis un autre client (directement sur le mock).
        const patch = await fetch(MESSAGE_URL(uuidAt(4)), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: 'Édité ailleurs' }),
        });
        expect(patch.status).toBe(200);

        const edited = await findMyBubble(log, 'Édité ailleurs');
        expect(within(edited).getByText('· modifié')).toBeInTheDocument();
        expect(within(log).queryByText('Bonjour Marie')).not.toBeInTheDocument();
        expect(within(log).getAllByTestId('message-bubble')).toHaveLength(3);

        // Suppression du message de Marie par le propriétaire du groupe (moi), même mécanisme.
        const del = await fetch(MESSAGE_URL(uuidAt(1)), { method: 'DELETE' });
        expect(del.status).toBe(200);

        const deleted = await findMyBubble(log, 'Message supprimé');
        expect(deleted).toHaveAttribute('data-deleted', 'true');
        expect(within(log).queryByText('Message d’hier')).not.toBeInTheDocument();
        expect(within(log).getAllByTestId('message-bubble')).toHaveLength(3);
    });

    it('envoie un message avec pièce jointe en multipart (champ attachments) et affiche la chip du fichier', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const types = recordContentTypes();
        const { user } = renderThread();

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');

        await user.upload(getFileInput(), pdfFile());
        expect(screen.getByRole('group', { name: 'Pièces jointes en attente' })).toHaveTextContent('rapport.pdf');
        await user.type(screen.getByLabelText('Nouveau message'), 'Voici le rapport{Enter}');

        await waitFor(() => expect(postsTo(seen, '/messages/')).toHaveLength(1));
        const post = postsTo(seen, '/messages/')[0];
        const postType = types.find((t) => t.method === 'POST' && t.url === post.url);
        expect(postType?.contentType).toContain('multipart/form-data');
        expect(post.body).toContain('name="body"');
        expect(post.body).toContain('Voici le rapport');
        expect(post.body).toContain('name="attachments"; filename="rapport.pdf"');
        expect(post.body).not.toContain('name="entity_refs"');

        const mine = await findMyBubble(log, 'Voici le rapport');
        const attachments = within(mine).getByRole('group', { name: 'Pièces jointes du message' });
        const chip = within(attachments).getByRole('link', { name: 'rapport.pdf · 12 Ko' });
        expect(chip).toHaveAttribute('href', '/api/media/messaging/attachments/mock/rapport.pdf');
        expect(chip).toHaveAttribute('download');
        // Composer vidé après envoi.
        expect(screen.getByLabelText('Nouveau message')).toHaveValue('');
        expect(screen.queryByRole('group', { name: 'Pièces jointes en attente' })).not.toBeInTheDocument();
    });

    it('envoie une pièce jointe seule (corps vide) : POST multipart avec body vide, bulle sans texte', async () => {
        seed(directConversation());
        const seen = recordRequests();
        const { user } = renderThread();

        const log = await findLog();
        await within(log).findByText('Bonjour Marie');
        const before = within(log).getAllByTestId('message-bubble').length;

        await user.upload(getFileInput(), pdfFile('photo-banc.pdf'));
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        await waitFor(() => expect(postsTo(seen, '/messages/')).toHaveLength(1));
        expect(postsTo(seen, '/messages/')[0].body).toContain('filename="photo-banc.pdf"');

        await waitFor(() => expect(within(log).getAllByTestId('message-bubble')).toHaveLength(before + 1));
        const bubbles = within(log).getAllByTestId('message-bubble');
        const mine = bubbles[bubbles.length - 1];
        expect(mine).toHaveAttribute('data-mine', 'true');
        expect(within(mine).getByRole('link', { name: 'photo-banc.pdf · 12 Ko' })).toBeInTheDocument();
    });
});
