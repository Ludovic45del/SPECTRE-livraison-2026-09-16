/**
 * Messaging Queries Tests — hooks TanStack Query via MSW.
 *
 * Pattern task-list.queries.test.tsx : createQueryWrapper + server.use.
 * Couvre liste / non-lus / détail (+ polling raccourci via pollingIntervalMs),
 * le fil de messages (première page en ordre chrono, `before` qui préfixe les
 * plus anciens, polling `after` qui ajoute les nouveaux et invalide liste +
 * non-lus, polling du fil vide), `appendMessagesToCache` (pur) et chaque
 * mutation (corps envoyé, cache détail, invalidations, 200 vs 204).
 * Pas de fake timers (incompatibles avec MSW) : intervalles courts + waitFor.
 */
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';

import {
    appendMessagesToCache,
    replaceMessageInCache,
    useAddConversationMembers,
    useConversation,
    useConversationMessages,
    useConversations,
    useCreateConversation,
    useDeleteConversation,
    useDeleteMessage,
    useEditMessage,
    useEntityMentions,
    useMarkConversationRead,
    useMessageSearch,
    usePostMessage,
    useRemoveConversationMember,
    useRenameConversation,
    useUnreadCount,
    type MessagesInfiniteData,
} from './messaging.queries';
import { conversationKeys } from './messaging.keys';
import { MessageSchema, type Message } from '../model';
import { createQueryWrapper, createTestQueryClient, server } from '@test/test-utils';
import {
    MOCK_ATTACHMENT_URL_PREFIX,
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockAttachment,
    createMockConversation,
    createMockEntityRef,
    createMockMention,
    createMockMessage,
    messagingHandlersWithData,
} from '@test/mocks/messaging-handlers';

const CONV_UUID = '123e4567-e89b-12d3-a456-426614174000';
const GROUP_UUID = '223e4567-e89b-12d3-a456-426614174000';
const THIRD_UUID = '33333333-3333-4333-8333-333333333333';
const FSEC_UUID = '44444444-4444-4444-8444-444444444444';
const FA_UUID = '55555555-5555-4555-8555-555555555555';

/** Uuid déterministe n°n (valide pour zod). */
const uuidN = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
/** Horodatage déterministe, dans le passé (les POST des mocks datent de « maintenant »). */
const isoAt = (minutes: number) => new Date(Date.UTC(2026, 0, 5, 10, minutes)).toISOString();
/** Message n°n de CONV_UUID, créé à la minute n. */
const seqMessage = (n: number, overrides: Record<string, unknown> = {}) =>
    createMockMessage({
        uuid: uuidN(n),
        conversation_uuid: CONV_UUID,
        body: `Message ${n}`,
        created_at: isoAt(n),
        updated_at: isoAt(n),
        ...overrides,
    });
const domainMessage = (n: number, overrides: Record<string, unknown> = {}): Message =>
    MessageSchema.parse(seqMessage(n, overrides));

const directConversation = createMockConversation({ uuid: CONV_UUID, unread_count: 2 });
const groupConversation = createMockConversation({
    uuid: GROUP_UUID,
    kind: 'group',
    name: 'Projet Cryo',
    unread_count: 3,
    last_message_at: isoAt(30),
});

/**
 * QueryClient qui conserve les entrées sans observateur : createTestQueryClient()
 * a gcTime 0, ce qui purge immédiatement un cache écrit par setQueryData avant
 * qu'un test puisse le relire.
 */
const createPersistentQueryClient = () =>
    new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
    });

/** Handler « enregistreur » qui laisse passer (retour undefined = handler suivant). */
function recordMessagesRequests() {
    const urls: URL[] = [];
    const handler = http.get('/api/v1/conversations/:uuid/messages/', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
    });
    const withParam = (name: string) => urls.filter((u) => u.searchParams.has(name));
    const withoutCursor = () => urls.filter((u) => !u.searchParams.has('before') && !u.searchParams.has('after'));
    return { handler, urls, withParam, withoutCursor };
}

// ============================================================================
// useConversations
// ============================================================================

describe('useConversations', () => {
    it('récupère la liste triée par dernier message (nulls en dernier) et transformée', async () => {
        server.use(...messagingHandlersWithData({ conversations: [directConversation, groupConversation] }));

        const { result } = renderHook(() => useConversations(), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.map((c) => c.uuid)).toEqual([GROUP_UUID, CONV_UUID]);
        expect(result.current.data?.[0].ownerUuid).toBe(MOCK_ME_UUID);
        expect(result.current.data?.[0].unreadCount).toBe(3);
        expect(result.current.data?.[1].members[1].firstName).toBe('Marie');
    });

    it('gère une liste vide (handlers par défaut)', async () => {
        const { result } = renderHook(() => useConversations(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(0);
    });

    it('polle la liste selon pollingIntervalMs', async () => {
        let calls = 0;
        server.use(
            http.get('/api/v1/conversations/', () => {
                calls += 1;
                return HttpResponse.json([]);
            }),
        );

        const { result } = renderHook(() => useConversations({ pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        await waitFor(() => expect(calls).toBeGreaterThanOrEqual(3));
    });

    it('gère une erreur serveur 500', async () => {
        server.use(
            http.get('/api/v1/conversations/', () => HttpResponse.json({ error: 'Server Error' }, { status: 500 })),
        );

        const { result } = renderHook(() => useConversations(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });
});

// ============================================================================
// useUnreadCount
// ============================================================================

describe('useUnreadCount', () => {
    it('récupère le total des non-lus (somme des conversations)', async () => {
        server.use(...messagingHandlersWithData({ conversations: [directConversation, groupConversation] }));

        const { result } = renderHook(() => useUnreadCount(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ totalUnread: 5 });
    });

    it('polle le compteur selon pollingIntervalMs', async () => {
        let calls = 0;
        server.use(
            http.get('/api/v1/conversations/unread-count/', () => {
                calls += 1;
                return HttpResponse.json({ total_unread: 1 });
            }),
        );

        const { result } = renderHook(() => useUnreadCount({ pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(result.current.data?.totalUnread).toBe(1));
        await waitFor(() => expect(calls).toBeGreaterThanOrEqual(3));
    });
});

// ============================================================================
// useConversation
// ============================================================================

describe('useConversation', () => {
    it('récupère le détail', async () => {
        server.use(...messagingHandlersWithData({ conversations: [groupConversation] }));

        const { result } = renderHook(() => useConversation(GROUP_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.name).toBe('Projet Cryo');
        expect(result.current.data?.kind).toBe('group');
        expect(result.current.data?.lastMessageAt).toBe(isoAt(30));
    });

    it('reste désactivé quand uuid est null', () => {
        const { result } = renderHook(() => useConversation(null), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('gère un 404 (non membre)', async () => {
        const { result } = renderHook(() => useConversation(CONV_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useConversationMessages
// ============================================================================

describe('useConversationMessages', () => {
    it('ne fait aucune requête avec un uuid null', () => {
        const recorder = recordMessagesRequests();
        server.use(recorder.handler);

        const { result } = renderHook(() => useConversationMessages(null), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.messages).toEqual([]);
        expect(result.current.hasOlder).toBe(false);
        expect(recorder.urls).toHaveLength(0);
    });

    it('charge la première page en ordre chronologique (limit=50, sans curseur)', async () => {
        const recorder = recordMessagesRequests();
        server.use(
            recorder.handler,
            ...messagingHandlersWithData({
                conversations: [directConversation],
                messages: [seqMessage(3), seqMessage(1), seqMessage(2)],
            }),
        );

        const { result } = renderHook(() => useConversationMessages(CONV_UUID), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isError).toBe(false);
        expect(result.current.messages.map((m) => m.uuid)).toEqual([uuidN(1), uuidN(2), uuidN(3)]);
        expect(result.current.messages[0].author?.firstName).toBe('Pierre');
        expect(result.current.hasOlder).toBe(false);
        expect(recorder.withoutCursor()[0].searchParams.get('limit')).toBe('50');
    });

    it('fetchOlder charge before=<plus ancien chargé> et préfixe la page en gardant l’ordre', async () => {
        const recorder = recordMessagesRequests();
        const messages = Array.from({ length: 60 }, (_, index) => seqMessage(index + 1));
        server.use(recorder.handler, ...messagingHandlersWithData({ conversations: [directConversation], messages }));

        const { result } = renderHook(() => useConversationMessages(CONV_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.messages).toHaveLength(50));
        expect(result.current.messages[0].uuid).toBe(uuidN(11));
        expect(result.current.messages[49].uuid).toBe(uuidN(60));
        expect(result.current.hasOlder).toBe(true);

        result.current.fetchOlder();

        await waitFor(() => expect(result.current.messages).toHaveLength(60));
        expect(result.current.isFetchingOlder).toBe(false);
        expect(result.current.hasOlder).toBe(false);
        expect(result.current.messages.map((m) => m.uuid)).toEqual(messages.map((m) => m.uuid));
        expect(recorder.withParam('before')).toHaveLength(1);
        expect(recorder.withParam('before')[0].searchParams.get('before')).toBe(uuidN(11));

        // Plus rien à charger : fetchOlder est un no-op.
        result.current.fetchOlder();
        expect(recorder.withParam('before')).toHaveLength(1);
    });

    it('polle after=<dernier uuid>, ajoute les nouveaux messages et invalide liste + non-lus', async () => {
        const recorder = recordMessagesRequests();
        server.use(
            recorder.handler,
            ...messagingHandlersWithData({
                conversations: [directConversation],
                messages: [seqMessage(1), seqMessage(2)],
            }),
        );
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(client),
        });

        await waitFor(() => expect(result.current.messages).toHaveLength(2));
        await waitFor(() => expect(recorder.withParam('after').length).toBeGreaterThanOrEqual(1));
        expect(recorder.withParam('after')[0].searchParams.get('after')).toBe(uuidN(2));
        expect(invalidateSpy).not.toHaveBeenCalled();

        // Un autre client envoie un message : le polling doit le récupérer.
        await fetch(`/api/v1/conversations/${CONV_UUID}/messages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: 'Nouveau' }),
        });

        await waitFor(() => expect(result.current.messages).toHaveLength(3));
        expect(result.current.messages[2].body).toBe('Nouveau');
        expect(result.current.messages.map((m) => m.uuid).slice(0, 2)).toEqual([uuidN(1), uuidN(2)]);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });

        // Le curseur suit le nouveau dernier message ; le fil complet n'est jamais re-pollé.
        const newUuid = result.current.messages[2].uuid;
        await waitFor(() =>
            expect(recorder.withParam('after').some((u) => u.searchParams.get('after') === newUuid)).toBe(true),
        );
        expect(recorder.withoutCursor()).toHaveLength(1);
    });

    it('ne perd pas un message d’autrui créé juste avant mon envoi (curseur = dernier message serveur)', async () => {
        // Scénario : le fil connaît [1, 2]. Marie envoie B (3) puis j’envoie C (4) ;
        // C est ajouté localement au cache (comme le fait usePostMessage) AVANT que
        // le polling n’ait vu B. Le curseur doit rester sur 2 (dernier message reçu
        // du serveur), pas sauter à 4, sinon B ne serait plus jamais demandé.
        const recorder = recordMessagesRequests();
        const gate = { released: false };
        const fromMarie = seqMessage(3, { author_uuid: MOCK_OTHER_UUID, body: 'B (juste avant)' });
        const mine = seqMessage(4, { body: 'C (le mien)' });
        server.use(
            recorder.handler,
            http.get(`/api/v1/conversations/${CONV_UUID}/messages/`, ({ request }) => {
                const after = new URL(request.url).searchParams.get('after');
                if (after === null)
                    return HttpResponse.json({ results: [seqMessage(1), seqMessage(2)], has_more: false });
                if (after === uuidN(2) && gate.released) {
                    return HttpResponse.json({ results: [fromMarie, mine], has_more: false });
                }
                return HttpResponse.json({ results: [], has_more: false });
            }),
        );
        const client = createPersistentQueryClient();
        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(client),
        });
        await waitFor(() => expect(result.current.messages).toHaveLength(2));
        await waitFor(() => expect(recorder.withParam('after').length).toBeGreaterThanOrEqual(1));

        // Mon envoi C est ajouté au cache (réponse du POST) avant que le polling ne voie B.
        client.setQueryData(conversationKeys.messages(CONV_UUID), appendMessagesToCache([domainMessage(4)]));
        await waitFor(() => expect(result.current.messages).toHaveLength(3));

        // Le curseur de polling reste celui du serveur (2) et non mon message (4).
        const requestsBefore = recorder.withParam('after').length;
        await waitFor(() => expect(recorder.withParam('after').length).toBeGreaterThan(requestsBefore));
        const afterRequests = recorder.withParam('after');
        const lastCursor = afterRequests[afterRequests.length - 1]?.searchParams.get('after');
        expect(lastCursor).toBe(uuidN(2));

        gate.released = true;
        await waitFor(() => expect(result.current.messages).toHaveLength(4));
        expect(result.current.messages.map((m) => m.uuid)).toEqual([uuidN(1), uuidN(2), uuidN(3), uuidN(4)]);
        expect(result.current.messages[2].body).toBe('B (juste avant)');
    });

    it('polle le fil complet tant que la conversation est vide', async () => {
        const recorder = recordMessagesRequests();
        server.use(recorder.handler, ...messagingHandlersWithData({ conversations: [directConversation] }));

        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.messages).toEqual([]);
        await waitFor(() => expect(recorder.withoutCursor().length).toBeGreaterThanOrEqual(3));
        expect(recorder.withParam('after')).toHaveLength(0);
    });

    it('remonte une erreur serveur', async () => {
        server.use(
            http.get('/api/v1/conversations/:uuid/messages/', () =>
                HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
            ),
        );

        const { result } = renderHook(() => useConversationMessages(CONV_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
        expect(result.current.messages).toEqual([]);
    });
});

// ============================================================================
// appendMessagesToCache (pur)
// ============================================================================

describe('appendMessagesToCache', () => {
    const cache = (): MessagesInfiniteData => ({
        pages: [
            { results: [domainMessage(3), domainMessage(4)], hasMore: true },
            { results: [domainMessage(1), domainMessage(2)], hasMore: false },
        ],
        pageParams: [null, uuidN(3)],
    });

    it('renvoie undefined si le cache n’existe pas', () => {
        expect(appendMessagesToCache([domainMessage(5)])(undefined)).toBeUndefined();
    });

    it('ajoute à la fin de pages[0] sans toucher aux pages plus anciennes', () => {
        const result = appendMessagesToCache([domainMessage(5), domainMessage(6)])(cache());

        expect(result?.pages[0].results.map((m) => m.uuid)).toEqual([uuidN(3), uuidN(4), uuidN(5), uuidN(6)]);
        expect(result?.pages[0].hasMore).toBe(true);
        expect(result?.pages[1].results.map((m) => m.uuid)).toEqual([uuidN(1), uuidN(2)]);
        expect(result?.pageParams).toEqual([null, uuidN(3)]);
    });

    it('dédoublonne par uuid (toutes pages confondues) et renvoie la même référence si rien de neuf', () => {
        const old = cache();
        expect(appendMessagesToCache([domainMessage(1), domainMessage(4)])(old)).toBe(old);

        const result = appendMessagesToCache([domainMessage(4), domainMessage(5), domainMessage(5)])(old);
        expect(result?.pages[0].results.map((m) => m.uuid)).toEqual([uuidN(3), uuidN(4), uuidN(5)]);
    });

    it('conserve l’ordre chronologique si un message plus ancien arrive après coup', () => {
        const old: MessagesInfiniteData = {
            pages: [{ results: [domainMessage(1), domainMessage(4)], hasMore: false }],
            pageParams: [null],
        };
        const result = appendMessagesToCache([domainMessage(3)])(old);
        expect(result?.pages[0].results.map((m) => m.uuid)).toEqual([uuidN(1), uuidN(3), uuidN(4)]);
    });

    it('crée la première page si le cache n’a aucune page', () => {
        const result = appendMessagesToCache([domainMessage(1)])({ pages: [], pageParams: [] });
        expect(result).toEqual({ pages: [{ results: [domainMessage(1)], hasMore: false }], pageParams: [null] });
    });
});

// ============================================================================
// Mutations de conversation
// ============================================================================

describe('useCreateConversation', () => {
    it('POST une privée ({kind, member_uuids}), met le détail en cache et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/conversations/', async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(directConversation, { status: 201 });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const setDataSpy = vi.spyOn(client, 'setQueryData');
        const { result } = renderHook(() => useCreateConversation(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ kind: 'direct', memberUuid: MOCK_OTHER_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ kind: 'direct', member_uuids: [MOCK_OTHER_UUID] });
        expect(result.current.data?.uuid).toBe(CONV_UUID);
        expect(setDataSpy).toHaveBeenCalledWith(conversationKeys.detail(CONV_UUID), result.current.data);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
    });

    it('POST un groupe ({kind, name, member_uuids}) — handlers par défaut', async () => {
        const { result } = renderHook(() => useCreateConversation(), { wrapper: createQueryWrapper() });

        result.current.mutate({ kind: 'group', name: 'Projet', memberUuids: [MOCK_OTHER_UUID, THIRD_UUID] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.kind).toBe('group');
        expect(result.current.data?.name).toBe('Projet');
        expect(result.current.data?.members.map((m) => m.uuid)).toEqual([MOCK_ME_UUID, MOCK_OTHER_UUID, THIRD_UUID]);
    });

    it('remonte une erreur de validation 400', async () => {
        server.use(
            http.post('/api/v1/conversations/', () =>
                HttpResponse.json({ error: 'Validation Error' }, { status: 400 }),
            ),
        );

        const { result } = renderHook(() => useCreateConversation(), { wrapper: createQueryWrapper() });

        result.current.mutate({ kind: 'direct', memberUuid: MOCK_ME_UUID });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useRenameConversation', () => {
    it('PATCH {name}, met le détail en cache et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/conversations/${GROUP_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...groupConversation, name: 'Renommé' });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const setDataSpy = vi.spyOn(client, 'setQueryData');
        const { result } = renderHook(() => useRenameConversation(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: GROUP_UUID, name: 'Renommé' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ name: 'Renommé' });
        expect(result.current.data?.name).toBe('Renommé');
        expect(setDataSpy).toHaveBeenCalledWith(conversationKeys.detail(GROUP_UUID), result.current.data);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
    });

    it('remonte un 400 (conversation privée)', async () => {
        server.use(
            http.patch(`/api/v1/conversations/${CONV_UUID}/`, () =>
                HttpResponse.json({ error: 'Validation Error' }, { status: 400 }),
            ),
        );

        const { result } = renderHook(() => useRenameConversation(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, name: 'X' });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useDeleteConversation', () => {
    it('DELETE, retire le détail du cache et invalide lists() + unreadCount()', async () => {
        const client = createPersistentQueryClient();
        client.setQueryData(conversationKeys.detail(GROUP_UUID), { uuid: GROUP_UUID });
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteConversation(), { wrapper: createQueryWrapper(client) });

        result.current.mutate(GROUP_UUID);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.detail(GROUP_UUID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });
        expect(client.getQueryData(conversationKeys.detail(GROUP_UUID))).toBeUndefined();
    });

    it('gère un 403 (non propriétaire)', async () => {
        server.use(
            http.delete(`/api/v1/conversations/${GROUP_UUID}/`, () =>
                HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
            ),
        );

        const { result } = renderHook(() => useDeleteConversation(), { wrapper: createQueryWrapper() });

        result.current.mutate(GROUP_UUID);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// Membres
// ============================================================================

describe('useAddConversationMembers', () => {
    it('POST {member_uuids}, met le détail en cache et invalide lists() + messages(uuid)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/conversations/${GROUP_UUID}/members/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(groupConversation);
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const setDataSpy = vi.spyOn(client, 'setQueryData');
        const { result } = renderHook(() => useAddConversationMembers(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: GROUP_UUID, memberUuids: [THIRD_UUID] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ member_uuids: [THIRD_UUID] });
        expect(setDataSpy).toHaveBeenCalledWith(conversationKeys.detail(GROUP_UUID), result.current.data);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.messages(GROUP_UUID) });
    });

    it('remonte un conflit 409 (membre déjà présent) avec les handlers à données', async () => {
        server.use(...messagingHandlersWithData({ conversations: [groupConversation] }));

        const { result } = renderHook(() => useAddConversationMembers(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: GROUP_UUID, memberUuids: [MOCK_OTHER_UUID] });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useRemoveConversationMember', () => {
    it('200 : renvoie la conversation, met le détail en cache, invalide messages/lists/unread', async () => {
        server.use(...messagingHandlersWithData({ conversations: [groupConversation] }));

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const setDataSpy = vi.spyOn(client, 'setQueryData');
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const { result } = renderHook(() => useRemoveConversationMember(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: GROUP_UUID, memberUuid: MOCK_OTHER_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.members.map((m) => m.uuid)).toEqual([MOCK_ME_UUID]);
        expect(setDataSpy).toHaveBeenCalledWith(conversationKeys.detail(GROUP_UUID), result.current.data);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.messages(GROUP_UUID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });
        expect(removeSpy).not.toHaveBeenCalled();
    });

    it('204 (je quitte) : undefined, purge détail + messages, invalide lists/unread', async () => {
        const client = createPersistentQueryClient();
        client.setQueryData(conversationKeys.detail(GROUP_UUID), { uuid: GROUP_UUID });
        client.setQueryData<MessagesInfiniteData>(conversationKeys.messages(GROUP_UUID), {
            pages: [{ results: [], hasMore: false }],
            pageParams: [null],
        });
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const { result } = renderHook(() => useRemoveConversationMember(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: GROUP_UUID, memberUuid: MOCK_ME_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeUndefined();
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.detail(GROUP_UUID) });
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.messages(GROUP_UUID) });
        expect(client.getQueryData(conversationKeys.detail(GROUP_UUID))).toBeUndefined();
        expect(client.getQueryData(conversationKeys.messages(GROUP_UUID))).toBeUndefined();
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });
    });

    it('remonte un 403 (retrait d’un tiers par un non-propriétaire)', async () => {
        server.use(
            http.delete(`/api/v1/conversations/${GROUP_UUID}/members/:memberUuid/`, () =>
                HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
            ),
        );

        const { result } = renderHook(() => useRemoveConversationMember(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: GROUP_UUID, memberUuid: THIRD_UUID });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// Lecture / envoi
// ============================================================================

describe('useMarkConversationRead', () => {
    it('POST read, met le détail (unreadCount 0) en cache et invalide lists() + unreadCount()', async () => {
        let posted = 0;
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/read/`, () => {
                posted += 1;
                return HttpResponse.json({ ...directConversation, unread_count: 0 });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const setDataSpy = vi.spyOn(client, 'setQueryData');
        const { result } = renderHook(() => useMarkConversationRead(), { wrapper: createQueryWrapper(client) });

        result.current.mutate(CONV_UUID);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(posted).toBe(1);
        expect(result.current.data?.unreadCount).toBe(0);
        expect(setDataSpy).toHaveBeenCalledWith(conversationKeys.detail(CONV_UUID), result.current.data);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });
    });
});

describe('usePostMessage', () => {
    it('POST {body}, ajoute le message au cache du fil et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(seqMessage(9, { body: 'Salut' }), { status: 201 });
            }),
        );

        const client = createPersistentQueryClient();
        client.setQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID), {
            pages: [{ results: [domainMessage(1)], hasMore: false }],
            pageParams: [null],
        });
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: CONV_UUID, body: 'Salut' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ body: 'Salut' });
        expect(result.current.data?.body).toBe('Salut');
        const cached = client.getQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID));
        expect(cached?.pages[0].results.map((m) => m.uuid)).toEqual([uuidN(1), uuidN(9)]);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
    });

    it('ne crée pas de cache de fil s’il n’existe pas encore', async () => {
        const client = createTestQueryClient();
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: CONV_UUID, body: 'Salut' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(client.getQueryData(conversationKeys.messages(CONV_UUID))).toBeUndefined();
    });

    it('remonte un 400 (message vide)', async () => {
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, () =>
                HttpResponse.json({ error: 'Validation Error' }, { status: 400 }),
            ),
        );

        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, body: '' });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('POST {body, entity_refs} avec des références, reçoit les refs résolues et invalide les mentions', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    seqMessage(9, {
                        body: 'Voir cette FSEC',
                        entity_refs: [
                            createMockEntityRef({ entity_uuid: FSEC_UUID, label: 'FSEC-12', slug: 'fsec-12' }),
                            createMockEntityRef({
                                entity_type: 'fa',
                                entity_uuid: FA_UUID,
                                label: 'FA-1',
                                slug: 'fa-1',
                            }),
                        ],
                    }),
                    { status: 201 },
                );
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({
            uuid: CONV_UUID,
            body: 'Voir cette FSEC',
            entityRefs: [
                { entityType: 'fsec', entityUuid: FSEC_UUID },
                { entityType: 'fa', entityUuid: FA_UUID },
            ],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({
            body: 'Voir cette FSEC',
            entity_refs: [
                { entity_type: 'fsec', entity_uuid: FSEC_UUID },
                { entity_type: 'fa', entity_uuid: FA_UUID },
            ],
        });
        expect(result.current.data?.entityRefs.map((ref) => [ref.entityType, ref.label, ref.slug, ref.exists])).toEqual(
            [
                ['fsec', 'FSEC-12', 'fsec-12', true],
                ['fa', 'FA-1', 'fa-1', true],
            ],
        );
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.mentionsAll() });
    });

    it('omet entity_refs quand la liste est vide (handler par défaut : refs résolues « Réf <type> »)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            // Lecture sur un clone : le handler par défaut relit le corps ensuite.
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, async ({ request }) => {
                sentBody = (await request.clone().json()) as Record<string, unknown>;
                return undefined;
            }),
        );
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, body: 'Sans ref', entityRefs: [] });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ body: 'Sans ref' });
        expect(result.current.data?.entityRefs).toEqual([]);

        result.current.mutate({
            uuid: CONV_UUID,
            body: 'Avec ref',
            entityRefs: [{ entityType: 'campaign', entityUuid: FSEC_UUID }],
        });
        await waitFor(() => expect(result.current.data?.body).toBe('Avec ref'));
        expect(result.current.data?.entityRefs).toEqual([
            {
                entityType: 'campaign',
                entityUuid: FSEC_UUID,
                label: 'Réf campaign',
                slug: 'slug-campaign',
                exists: true,
            },
        ]);
    });
});

// ============================================================================
// useEntityMentions
// ============================================================================

describe('conversationKeys.mentions', () => {
    it('est une sous-clé de mentionsAll()', () => {
        expect(conversationKeys.mentionsAll()).toEqual(['conversations', 'mentions']);
        expect(conversationKeys.mentions('fsec', FSEC_UUID)).toEqual(['conversations', 'mentions', 'fsec', FSEC_UUID]);
    });
});

describe('useEntityMentions', () => {
    it('reste désactivé tant que entityUuid est null', async () => {
        const seen: string[] = [];
        server.use(
            http.get('/api/v1/conversations/mentions/', ({ request }) => {
                seen.push(request.url);
                return undefined;
            }),
        );
        const { result } = renderHook(() => useEntityMentions('fsec', null), { wrapper: createQueryWrapper() });

        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
        expect(seen).toEqual([]);
    });

    it('GET mentions/ avec entity_type, entity_uuid et limit par défaut (20) — tableau vide par défaut', async () => {
        const seen: URL[] = [];
        server.use(
            http.get('/api/v1/conversations/mentions/', ({ request }) => {
                seen.push(new URL(request.url));
                return undefined;
            }),
        );
        const { result } = renderHook(() => useEntityMentions('campaign', CONV_UUID), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
        expect(seen).toHaveLength(1);
        expect(seen[0].searchParams.get('entity_type')).toBe('campaign');
        expect(seen[0].searchParams.get('entity_uuid')).toBe(CONV_UUID);
        expect(seen[0].searchParams.get('limit')).toBe('20');
    });

    it('renvoie les mentions du jeu de données (cible + conversations connues), du plus récent au plus ancien, avec limit', async () => {
        const fsecRef = () => createMockEntityRef({ entity_uuid: FSEC_UUID });
        server.use(
            ...messagingHandlersWithData({
                conversations: [directConversation, groupConversation],
                messages: [
                    seqMessage(1, { entity_refs: [fsecRef()] }),
                    seqMessage(2),
                    seqMessage(3, {
                        conversation_uuid: GROUP_UUID,
                        entity_refs: [fsecRef(), createMockEntityRef({ entity_type: 'fa', entity_uuid: FA_UUID })],
                    }),
                    // Même cible mais autre type : ignorée.
                    seqMessage(4, {
                        entity_refs: [createMockEntityRef({ entity_type: 'campaign', entity_uuid: FSEC_UUID })],
                    }),
                    // Conversation inconnue du jeu : ignorée.
                    seqMessage(5, { conversation_uuid: THIRD_UUID, entity_refs: [fsecRef()] }),
                ],
            }),
        );

        const { result } = renderHook(() => useEntityMentions('fsec', FSEC_UUID), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.map((m) => m.message.uuid)).toEqual([uuidN(3), uuidN(1)]);
        expect(result.current.data?.[0].conversation).toMatchObject({
            uuid: GROUP_UUID,
            kind: 'group',
            name: 'Projet Cryo',
        });
        expect(result.current.data?.[0].conversation.members.map((m) => m.uuid)).toEqual([
            MOCK_ME_UUID,
            MOCK_OTHER_UUID,
        ]);
        expect(result.current.data?.[0].message.entityRefs).toHaveLength(2);

        const limited = renderHook(() => useEntityMentions('fsec', FSEC_UUID, 1), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(limited.result.current.isSuccess).toBe(true));
        expect(limited.result.current.data?.map((m) => m.message.uuid)).toEqual([uuidN(3)]);

        const fa = renderHook(() => useEntityMentions('fa', FA_UUID), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(fa.result.current.isSuccess).toBe(true));
        expect(fa.result.current.data?.map((m) => m.message.uuid)).toEqual([uuidN(3)]);
    });

    it('valide la réponse (createMockMention) et remonte une erreur serveur', async () => {
        server.use(
            http.get('/api/v1/conversations/mentions/', () =>
                HttpResponse.json({ results: [createMockMention({ conversation: directConversation })] }),
            ),
        );
        const { result } = renderHook(() => useEntityMentions('fsec', FSEC_UUID), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].conversation.uuid).toBe(CONV_UUID);
        expect(result.current.data?.[0].message.entityRefs[0].entityType).toBe('fsec');

        server.use(
            http.get('/api/v1/conversations/mentions/', () => HttpResponse.json({ error: 'Boom' }, { status: 500 })),
        );
        const failing = renderHook(() => useEntityMentions('fa', FA_UUID), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(failing.result.current.isError).toBe(true));
    });
});

// ============================================================================
// Vague M4 — replaceMessageInCache (pur)
// ============================================================================

describe('replaceMessageInCache', () => {
    const cache = (): MessagesInfiniteData => ({
        pages: [
            { results: [domainMessage(3), domainMessage(4)], hasMore: true },
            { results: [domainMessage(1), domainMessage(2)], hasMore: false },
        ],
        pageParams: [null, uuidN(3)],
    });

    it('renvoie undefined si le cache n’existe pas', () => {
        expect(replaceMessageInCache(domainMessage(1))(undefined)).toBeUndefined();
    });

    it('remplace le message de même uuid dans n’importe quelle page sans toucher aux autres', () => {
        const old = cache();
        const edited = domainMessage(1, { body: 'Corrigé', edited_at: isoAt(50), updated_at: isoAt(50) });
        const result = replaceMessageInCache(edited)(old);

        expect(result?.pages[1].results[0]).toBe(edited);
        expect(result?.pages[1].results[1]).toBe(old.pages[1].results[1]);
        // Page non concernée : même référence.
        expect(result?.pages[0]).toBe(old.pages[0]);
        expect(result?.pageParams).toEqual(old.pageParams);
        expect(result?.pages[1].hasMore).toBe(false);
    });

    it('accepte un lot et renvoie la même référence si aucun uuid n’est connu du cache (pas d’insertion)', () => {
        const old = cache();
        expect(replaceMessageInCache(domainMessage(9))(old)).toBe(old);
        expect(replaceMessageInCache([])(old)).toBe(old);

        const result = replaceMessageInCache([
            domainMessage(2, { body: '', is_deleted: true, deleted_at: isoAt(50) }),
            domainMessage(4, { body: 'V2' }),
            domainMessage(9),
        ])(old);
        expect(result?.pages[0].results.map((m) => m.body)).toEqual(['Message 3', 'V2']);
        expect(result?.pages[1].results[1].isDeleted).toBe(true);
        expect(result?.pages.flatMap((p) => p.results)).toHaveLength(4);
    });
});

// ============================================================================
// Vague M4 — polling updated_since (éditions / suppressions faites ailleurs)
// ============================================================================

describe('useConversationMessages — updated_since', () => {
    it('envoie updated_since = max updatedAt vu avec after, et applique une édition puis une suppression faites ailleurs', async () => {
        const recorder = recordMessagesRequests();
        server.use(
            recorder.handler,
            ...messagingHandlersWithData({
                conversations: [directConversation],
                // Le message 1 a été édité (updated_at > created_at) : le max porte sur updated_at.
                messages: [seqMessage(1, { updated_at: isoAt(40), edited_at: isoAt(40) }), seqMessage(2)],
            }),
        );
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(client),
        });

        await waitFor(() => expect(result.current.messages).toHaveLength(2));
        await waitFor(() => expect(recorder.withParam('after').length).toBeGreaterThanOrEqual(1));
        const firstPoll = recorder.withParam('after')[0].searchParams;
        expect(firstPoll.get('after')).toBe(uuidN(2));
        expect(firstPoll.get('updated_since')).toBe(isoAt(40));
        // La première page ne porte jamais updated_since.
        expect(recorder.withoutCursor().every((u) => !u.searchParams.has('updated_since'))).toBe(true);
        expect(invalidateSpy).not.toHaveBeenCalled();

        // Édition « ailleurs » du message 2 : elle arrive par le polling, sans nouveau message.
        const patch = await fetch(`/api/v1/conversations/${CONV_UUID}/messages/${uuidN(2)}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: 'Corrigé' }),
        });
        expect(patch.status).toBe(200);

        await waitFor(() => expect(result.current.messages[1].body).toBe('Corrigé'));
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[1].editedAt).not.toBeNull();
        expect(result.current.messages[1].uuid).toBe(uuidN(2));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        // Pas de nouveau message : ni non-lus ni détail invalidés.
        expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });

        // updated_since avance sur la date d’édition : l’édition n’est pas renvoyée en boucle.
        const editedAt = result.current.messages[1].updatedAt;
        await waitFor(() =>
            expect(recorder.withParam('after').some((u) => u.searchParams.get('updated_since') === editedAt)).toBe(
                true,
            ),
        );

        // Suppression logique « ailleurs » du message 1.
        const del = await fetch(`/api/v1/conversations/${CONV_UUID}/messages/${uuidN(1)}/`, { method: 'DELETE' });
        expect(del.status).toBe(200);
        await waitFor(() => expect(result.current.messages[0].isDeleted).toBe(true));
        expect(result.current.messages[0].body).toBe('');
        expect(result.current.messages).toHaveLength(2);
        // Le curseur `after` n’a pas bougé (aucun nouveau message).
        const afterRequests = recorder.withParam('after');
        expect(afterRequests[afterRequests.length - 1]?.searchParams.get('after')).toBe(uuidN(2));
    });

    it('n’envoie pas updated_since tant que le fil est vide, puis l’amorce sur le premier message reçu', async () => {
        const recorder = recordMessagesRequests();
        server.use(recorder.handler, ...messagingHandlersWithData({ conversations: [directConversation] }));

        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(recorder.withoutCursor().length).toBeGreaterThanOrEqual(2));
        expect(recorder.urls.every((u) => !u.searchParams.has('updated_since'))).toBe(true);

        await fetch(`/api/v1/conversations/${CONV_UUID}/messages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: 'Premier' }),
        });
        await waitFor(() => expect(result.current.messages).toHaveLength(1));
        const first = result.current.messages[0];
        await waitFor(() =>
            expect(
                recorder
                    .withParam('after')
                    .some(
                        (u) =>
                            u.searchParams.get('after') === first.uuid &&
                            u.searchParams.get('updated_since') === first.updatedAt,
                    ),
            ).toBe(true),
        );
    });

    it('ignore dans updated un message inconnu du cache (pas d’insertion) et applique nouveaux + modifiés ensemble', async () => {
        const gate = { released: false };
        server.use(
            http.get(`/api/v1/conversations/${CONV_UUID}/messages/`, ({ request }) => {
                const params = new URL(request.url).searchParams;
                if (!params.has('after')) {
                    return HttpResponse.json({ results: [seqMessage(1), seqMessage(2)], has_more: false });
                }
                if (!gate.released) return HttpResponse.json({ results: [], has_more: false, updated: [] });
                return HttpResponse.json({
                    results: [seqMessage(3, { body: 'Nouveau' })],
                    has_more: false,
                    updated: [
                        seqMessage(1, { body: 'Édité', edited_at: isoAt(45), updated_at: isoAt(45) }),
                        seqMessage(8, { body: 'Inconnu' }),
                    ],
                });
            }),
        );
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useConversationMessages(CONV_UUID, { pollingIntervalMs: 20 }), {
            wrapper: createQueryWrapper(client),
        });
        await waitFor(() => expect(result.current.messages).toHaveLength(2));
        gate.released = true;

        await waitFor(() => expect(result.current.messages).toHaveLength(3));
        expect(result.current.messages.map((m) => m.body)).toEqual(['Édité', 'Message 2', 'Nouveau']);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.unreadCount() });
    });
});

// ============================================================================
// Vague M4 — usePostMessage avec pièces jointes (multipart)
// ============================================================================

describe('usePostMessage — pièces jointes', () => {
    const png = () => new File([new Uint8Array([1, 2, 3])], 'photo.PNG', { type: 'image/png' });
    const pdf = () => new File(['%PDF-1.4'], 'rapport.pdf', { type: 'application/pdf' });

    it('envoie un FormData multipart (body, entity_refs JSON, attachments répétés) et reçoit les pièces jointes', async () => {
        let contentType: string | null = null;
        let fields: { body: unknown; refs: unknown; files: { name: string; type: string; size: number }[] } | null =
            null;
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, async ({ request }) => {
                contentType = request.headers.get('content-type');
                const form = await request.formData();
                fields = {
                    body: form.get('body'),
                    refs: JSON.parse(String(form.get('entity_refs'))),
                    files: form.getAll('attachments').map((f) => {
                        const file = f as File;
                        return { name: file.name, type: file.type, size: file.size };
                    }),
                };
                return HttpResponse.json(
                    seqMessage(9, {
                        body: 'Voir PJ',
                        attachments: [
                            createMockAttachment({ original_name: 'photo.PNG', content_type: 'image/png', size: 3 }),
                            createMockAttachment({ original_name: 'rapport.pdf', size: 8 }),
                        ],
                    }),
                    { status: 201 },
                );
            }),
        );
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({
            uuid: CONV_UUID,
            body: 'Voir PJ',
            entityRefs: [{ entityType: 'fsec', entityUuid: FSEC_UUID }],
            attachments: [png(), pdf()],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(contentType).toContain('multipart/form-data');
        expect(fields).toEqual({
            body: 'Voir PJ',
            refs: [{ entity_type: 'fsec', entity_uuid: FSEC_UUID }],
            files: [
                { name: 'photo.PNG', type: 'image/png', size: 3 },
                { name: 'rapport.pdf', type: 'application/pdf', size: 8 },
            ],
        });
        expect(result.current.data?.attachments.map((a) => [a.originalName, a.isImage, a.size])).toEqual([
            ['photo.PNG', true, 3],
            ['rapport.pdf', false, 8],
        ]);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.mentionsAll() });
    });

    it('omet entity_refs du multipart quand la liste est vide, et reste en JSON exact { body } sans fichier', async () => {
        const seen: { type: string; body: unknown }[] = [];
        server.use(
            http.post(`/api/v1/conversations/${CONV_UUID}/messages/`, async ({ request }) => {
                const ct = request.headers.get('content-type') ?? '';
                if (ct.includes('multipart/form-data')) {
                    const form = await request.clone().formData();
                    seen.push({
                        type: 'multipart',
                        body: { has_refs: form.has('entity_refs'), body: form.get('body') },
                    });
                } else {
                    seen.push({ type: ct, body: await request.clone().json() });
                }
                return undefined;
            }),
        );
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, body: 'PJ seule', entityRefs: [], attachments: [pdf()] });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.attachments).toHaveLength(1);

        result.current.mutate({ uuid: CONV_UUID, body: 'Sans PJ', attachments: [] });
        await waitFor(() => expect(result.current.data?.body).toBe('Sans PJ'));

        expect(seen).toEqual([
            { type: 'multipart', body: { has_refs: false, body: 'PJ seule' } },
            { type: 'application/json', body: { body: 'Sans PJ' } },
        ]);
    });

    it('handlers à données : url mock, is_image selon l’extension, size du fichier, corps vide accepté avec PJ, aperçu attachment_count', async () => {
        server.use(...messagingHandlersWithData({ conversations: [directConversation] }));
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, body: '', attachments: [png(), pdf()] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const attachments = result.current.data?.attachments ?? [];
        expect(attachments).toHaveLength(2);
        expect(attachments[0]).toMatchObject({
            originalName: 'photo.PNG',
            contentType: 'image/png',
            size: 3,
            isImage: true,
            url: `${MOCK_ATTACHMENT_URL_PREFIX}photo.PNG`,
        });
        expect(attachments[1]).toMatchObject({ originalName: 'rapport.pdf', isImage: false, size: 8 });
        expect(result.current.data?.body).toBe('');
        expect(result.current.data?.isDeleted).toBe(false);

        const list = (await (await fetch('/api/v1/conversations/')).json()) as { last_message: unknown }[];
        expect(list[0].last_message).toMatchObject({ attachment_count: 2, is_deleted: false, body: '' });
    });

    it('handlers à données : corps vide sans PJ ⇒ 400 ; entity_refs JSON invalide en multipart ⇒ 400', async () => {
        server.use(...messagingHandlersWithData({ conversations: [directConversation] }));
        const { result } = renderHook(() => usePostMessage(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONV_UUID, body: '   ' });
        await waitFor(() => expect(result.current.isError).toBe(true));

        const form = new FormData();
        form.append('body', 'x');
        form.append('entity_refs', '{pas du json');
        const response = await fetch(`/api/v1/conversations/${CONV_UUID}/messages/`, { method: 'POST', body: form });
        expect(response.status).toBe(400);
    });
});

// ============================================================================
// Vague M4 — édition / suppression logique
// ============================================================================

describe('useEditMessage', () => {
    it('PATCH {body}, remplace le message dans le cache (même en page ancienne) et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/conversations/${CONV_UUID}/messages/${uuidN(1)}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    seqMessage(1, { body: 'Corrigé', edited_at: isoAt(50), updated_at: isoAt(50) }),
                );
            }),
        );
        const client = createPersistentQueryClient();
        client.setQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID), {
            pages: [
                { results: [domainMessage(3)], hasMore: true },
                { results: [domainMessage(1), domainMessage(2)], hasMore: false },
            ],
            pageParams: [null, uuidN(3)],
        });
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useEditMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: CONV_UUID, messageUuid: uuidN(1), body: 'Corrigé' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ body: 'Corrigé' });
        expect(result.current.data?.editedAt).toBe(isoAt(50));
        const cached = client.getQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID));
        expect(cached?.pages[1].results[0].body).toBe('Corrigé');
        expect(cached?.pages[1].results[0].editedAt).toBe(isoAt(50));
        expect(cached?.pages[1].results[1].body).toBe('Message 2');
        expect(cached?.pages[0].results[0].body).toBe('Message 3');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: conversationKeys.mentionsAll() });
    });

    it('handlers par défaut : renvoie le message édité sans cache de fil ; handlers à données : 403 / 400 / 404', async () => {
        const client = createTestQueryClient();
        const { result } = renderHook(() => useEditMessage(), { wrapper: createQueryWrapper(client) });
        result.current.mutate({ uuid: CONV_UUID, messageUuid: uuidN(1), body: 'Nouveau corps' });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.body).toBe('Nouveau corps');
        expect(result.current.data?.editedAt).not.toBeNull();
        expect(client.getQueryData(conversationKeys.messages(CONV_UUID))).toBeUndefined();

        server.use(
            ...messagingHandlersWithData({
                conversations: [directConversation],
                messages: [
                    seqMessage(1, { author_uuid: MOCK_OTHER_UUID }),
                    seqMessage(2, { body: '', is_deleted: true, deleted_at: isoAt(3) }),
                    seqMessage(3, { kind: 'system', body: 'Marie a rejoint' }),
                    seqMessage(4),
                ],
            }),
        );
        const attempt = async (messageUuid: string, body = 'x') => {
            const hook = renderHook(() => useEditMessage(), { wrapper: createQueryWrapper() });
            hook.result.current.mutate({ uuid: CONV_UUID, messageUuid, body });
            await waitFor(() => expect(hook.result.current.isError || hook.result.current.isSuccess).toBe(true));
            return hook.result.current;
        };
        expect((await attempt(uuidN(1))).isError).toBe(true); // auteur ≠ moi
        expect((await attempt(uuidN(2))).isError).toBe(true); // supprimé
        expect((await attempt(uuidN(3))).isError).toBe(true); // système
        expect((await attempt(uuidN(7))).isError).toBe(true); // inconnu
        expect((await attempt(uuidN(4), '  ')).isError).toBe(true); // corps vide
        const ok = await attempt(uuidN(4), 'Modifié');
        expect(ok.data?.body).toBe('Modifié');
        expect(ok.data?.editedAt).not.toBeNull();
        // Corps identique : renvoyé tel quel, sans nouvelle date d’édition.
        const same = await attempt(uuidN(4), 'Modifié');
        expect(same.data?.editedAt).toBe(ok.data?.editedAt);
    });
});

describe('useDeleteMessage', () => {
    it('DELETE, remplace par la version supprimée dans le cache et invalide lists() + mentionsAll()', async () => {
        const target = seqMessage(1, { entity_refs: [createMockEntityRef()], attachments: [createMockAttachment()] });
        server.use(
            ...messagingHandlersWithData({
                conversations: [
                    createMockConversation({
                        uuid: CONV_UUID,
                        last_message_at: target.created_at,
                        last_message: {
                            uuid: target.uuid,
                            author_uuid: target.author_uuid,
                            kind: target.kind,
                            body: target.body,
                            created_at: target.created_at,
                            updated_at: target.updated_at,
                            entity_ref_count: 1,
                            is_deleted: false,
                            attachment_count: 1,
                        },
                    }),
                ],
                messages: [target],
            }),
        );
        const client = createPersistentQueryClient();
        client.setQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID), {
            pages: [{ results: [domainMessage(1), domainMessage(2)], hasMore: false }],
            pageParams: [null],
        });
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useDeleteMessage(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: CONV_UUID, messageUuid: uuidN(1) });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            uuid: uuidN(1),
            isDeleted: true,
            body: '',
            entityRefs: [],
            attachments: [],
        });
        expect(result.current.data?.deletedAt).not.toBeNull();
        const cached = client.getQueryData<MessagesInfiniteData>(conversationKeys.messages(CONV_UUID));
        expect(cached?.pages[0].results.map((m) => [m.uuid, m.isDeleted])).toEqual([
            [uuidN(1), true],
            [uuidN(2), false],
        ]);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.mentionsAll() });

        // L’aperçu de la liste reflète la suppression.
        const list = (await (await fetch('/api/v1/conversations/')).json()) as { last_message: unknown }[];
        expect(list[0].last_message).toMatchObject({ is_deleted: true, body: '', attachment_count: 0 });
    });

    it('propriétaire du groupe : message d’un membre OK (idempotent) ; membre / privée / système : refusés', async () => {
        const otherGroup = createMockConversation({
            uuid: THIRD_UUID,
            kind: 'group',
            name: 'Pas à moi',
            owner_uuid: MOCK_OTHER_UUID,
        });
        server.use(
            ...messagingHandlersWithData({
                conversations: [directConversation, groupConversation, otherGroup],
                messages: [
                    seqMessage(1, { conversation_uuid: GROUP_UUID, author_uuid: MOCK_OTHER_UUID }),
                    seqMessage(2, { conversation_uuid: THIRD_UUID, author_uuid: MOCK_OTHER_UUID }),
                    seqMessage(3, { author_uuid: MOCK_OTHER_UUID }),
                    seqMessage(4, { kind: 'system', body: 'Groupe renommé' }),
                    seqMessage(5, { conversation_uuid: THIRD_UUID }),
                ],
            }),
        );
        const attempt = async (uuid: string, messageUuid: string) => {
            const hook = renderHook(() => useDeleteMessage(), { wrapper: createQueryWrapper() });
            hook.result.current.mutate({ uuid, messageUuid });
            await waitFor(() => expect(hook.result.current.isError || hook.result.current.isSuccess).toBe(true));
            return hook.result.current;
        };
        const owned = await attempt(GROUP_UUID, uuidN(1));
        expect(owned.data?.isDeleted).toBe(true);
        const again = await attempt(GROUP_UUID, uuidN(1));
        expect(again.isSuccess).toBe(true);
        expect(again.data?.deletedAt).toBe(owned.data?.deletedAt);

        expect((await attempt(THIRD_UUID, uuidN(2))).isError).toBe(true); // membre non propriétaire
        expect((await attempt(CONV_UUID, uuidN(3))).isError).toBe(true); // privée, message de l’autre
        expect((await attempt(CONV_UUID, uuidN(4))).isError).toBe(true); // système
        expect((await attempt(CONV_UUID, uuidN(5))).isError).toBe(true); // message d’une autre conversation (404)
        expect((await attempt(THIRD_UUID, uuidN(5))).data?.isDeleted).toBe(true); // mon message, groupe d’autrui

        const failing = renderHook(() => useDeleteMessage(), { wrapper: createQueryWrapper() });
        server.use(
            http.delete(`/api/v1/conversations/${CONV_UUID}/messages/:messageUuid/`, () =>
                HttpResponse.json({ error: 'Boom' }, { status: 500 }),
            ),
        );
        failing.result.current.mutate({ uuid: CONV_UUID, messageUuid: uuidN(3) });
        await waitFor(() => expect(failing.result.current.isError).toBe(true));
    });
});

// ============================================================================
// Vague M4 — recherche
// ============================================================================

describe('conversationKeys.search', () => {
    it('est une sous-clé de all', () => {
        expect(conversationKeys.search('bonjour')).toEqual(['conversations', 'search', 'bonjour']);
    });
});

describe('useMessageSearch', () => {
    function recordSearchRequests() {
        const urls: URL[] = [];
        server.use(
            http.get('/api/v1/conversations/search/', ({ request }) => {
                urls.push(new URL(request.url));
                return undefined;
            }),
        );
        return urls;
    }

    it('reste désactivé sous 2 caractères (après strip) — aucune requête', async () => {
        const urls = recordSearchRequests();
        const { result, rerender } = renderHook(({ q }) => useMessageSearch(q), {
            wrapper: createQueryWrapper(),
            initialProps: { q: '' },
        });
        rerender({ q: ' a ' });
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
        expect(urls).toEqual([]);
    });

    it('GET search/?q&limit (q strippé, limit 20 par défaut, limit explicite) — [] par défaut', async () => {
        const urls = recordSearchRequests();
        const { result } = renderHook(() => useMessageSearch('  Bonjour '), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
        expect(urls).toHaveLength(1);
        expect(urls[0].searchParams.get('q')).toBe('Bonjour');
        expect(urls[0].searchParams.get('limit')).toBe('20');

        const limited = renderHook(() => useMessageSearch('salut', 5), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(limited.result.current.isSuccess).toBe(true));
        expect(urls[1].searchParams.get('limit')).toBe('5');
    });

    it('handlers à données : insensible à la casse, exclut supprimés / système / conversations inconnues, récent d’abord, limit', async () => {
        server.use(
            ...messagingHandlersWithData({
                conversations: [directConversation, groupConversation],
                messages: [
                    seqMessage(1, { body: 'Bonjour à tous' }),
                    seqMessage(2, { body: 'rien à voir' }),
                    seqMessage(3, { conversation_uuid: GROUP_UUID, body: 'BONJOUR Marie' }),
                    seqMessage(4, { body: 'bonjour supprimé', is_deleted: true, deleted_at: isoAt(5) }),
                    seqMessage(5, { kind: 'system', body: 'bonjour système' }),
                    seqMessage(6, { conversation_uuid: THIRD_UUID, body: 'bonjour ailleurs' }),
                ],
            }),
        );
        const { result } = renderHook(() => useMessageSearch('bonjour'), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.map((m) => m.message.uuid)).toEqual([uuidN(3), uuidN(1)]);
        expect(result.current.data?.[0].conversation).toMatchObject({ uuid: GROUP_UUID, name: 'Projet Cryo' });
        expect(result.current.data?.[0].conversation.members.map((m) => m.uuid)).toEqual([
            MOCK_ME_UUID,
            MOCK_OTHER_UUID,
        ]);

        const limited = renderHook(() => useMessageSearch('bonjour', 1), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(limited.result.current.isSuccess).toBe(true));
        expect(limited.result.current.data?.map((m) => m.message.uuid)).toEqual([uuidN(3)]);
    });

    it('conserve les résultats précédents pendant la frappe, les lâche sous le seuil, et remonte un 400 (q trop long)', async () => {
        server.use(
            ...messagingHandlersWithData({
                conversations: [directConversation],
                messages: [seqMessage(1, { body: 'Bonjour Marie' }), seqMessage(2, { body: 'Bonjour Paul' })],
            }),
        );
        const { result, rerender } = renderHook(({ q }) => useMessageSearch(q), {
            wrapper: createQueryWrapper(),
            initialProps: { q: 'bonjour' },
        });
        await waitFor(() => expect(result.current.data).toHaveLength(2));

        rerender({ q: 'bonjour p' });
        expect(result.current.isPlaceholderData).toBe(true);
        expect(result.current.data).toHaveLength(2);
        await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
        expect(result.current.data?.map((m) => m.message.body)).toEqual(['Bonjour Paul']);

        rerender({ q: 'b' });
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();

        rerender({ q: 'x'.repeat(101) });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('valide la réponse (createMockMention) et remonte une erreur serveur', async () => {
        server.use(
            http.get('/api/v1/conversations/search/', () =>
                HttpResponse.json({ results: [createMockMention({ conversation: directConversation })] }),
            ),
        );
        const { result } = renderHook(() => useMessageSearch('fsec'), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.[0].conversation.uuid).toBe(CONV_UUID);

        server.use(
            http.get('/api/v1/conversations/search/', () => HttpResponse.json({ error: 'Boom' }, { status: 500 })),
        );
        const failing = renderHook(() => useMessageSearch('autre'), { wrapper: createQueryWrapper() });
        await waitFor(() => expect(failing.result.current.isError).toBe(true));
    });
});
