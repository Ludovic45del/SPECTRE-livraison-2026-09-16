/**
 * Messaging Queries — TanStack Query hooks pour /conversations/.
 * @module entities/messaging/api
 *
 * Polling (5 s, scope backend `messaging_poll`) UNIQUEMENT sur :
 *  - GET /conversations/                       (useConversations)
 *  - GET /conversations/unread-count/          (useUnreadCount)
 *  - GET /conversations/{uuid}/messages/?after= (useConversationMessages)
 * Le fil est une infinite query (curseur `before`, pages de plus en plus
 * anciennes). Une query de polling à clé STABLE demande `after=<curseur>` et
 * ajoute les nouveaux messages au cache de l'infinite query. Le curseur ne
 * progresse qu'avec des messages CONNUS DU SERVEUR (pages chargées, résultats
 * de polling) — jamais avec un message que l'on vient de poster : sinon un
 * message d'autrui créé juste avant le nôtre ne serait plus jamais demandé.
 * Le même appel de polling porte `updated_since=<max updated_at vu>` : les
 * messages édités / supprimés depuis (hors nouveaux) reviennent dans `updated`
 * et remplacent leur version en cache (`replaceMessageInCache`) — aucune route
 * supplémentaire.
 *
 * Invalidation ciblée :
 *  - mutations de conversation -> lists() (+ detail(uuid) mis à jour directement)
 *  - mutations de membres       -> lists() + messages(uuid) (message système)
 *  - lecture / suppression      -> lists() + unreadCount()
 *  - envoi d'un message         -> lists() + mentionsAll() (références attachées)
 *  - édition d'un message       -> lists() (aperçu) ; suppression -> lists() + mentionsAll()
 *
 * Mentions (GET /conversations/mentions/) : lecture simple sans polling,
 * consommée par l'onglet « Discussions » des fiches FSEC / campagne / FA.
 * Recherche (GET /conversations/search/) : même forme de résultats, sans polling.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    type InfiniteData,
} from '@tanstack/react-query';
import { ApiError, api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    ConversationListSchema,
    ConversationSchema,
    MENTIONS_DEFAULT_LIMIT,
    MESSAGE_PAGE_LIMIT,
    MentionsPageSchema,
    MessagePageSchema,
    MessageSchema,
    POLLING_INTERVAL_MS,
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MIN_LENGTH,
    UnreadCountSchema,
    conversationCreateToApi,
    type Conversation,
    type ConversationCreate,
    type EntityRefInput,
    type EntityRefType,
    type Mention,
    type Message,
    type MessagePage,
    type UnreadCount,
} from '../model';
import { conversationKeys } from './messaging.keys';

/** Options de polling — `pollingIntervalMs` permet de raccourcir l'intervalle en test. */
export interface PollingOptions {
    pollingIntervalMs?: number;
}

/**
 * Page du fil telle que conservée en cache : `results` + `hasMore` seulement —
 * le lot `updated` d'une réponse de polling est appliqué puis oublié.
 */
export type MessageThreadPage = Pick<MessagePage, 'results' | 'hasMore'>;

/** Cache de l'infinite query des messages : pages[0] = la plus récente, suivantes = plus anciennes. */
export type MessagesInfiniteData = InfiniteData<MessageThreadPage, string | null>;

/* ------------------------------------------------------------------ */
/*  Helpers purs                                                       */
/* ------------------------------------------------------------------ */

/** Ordre chronologique (created_at, uuid) — même tri que le backend. */
function compareMessages(a: Message, b: Message): number {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.uuid < b.uuid ? -1 : a.uuid > b.uuid ? 1 : 0;
}

/**
 * Updater pur pour `setQueryData(conversationKeys.messages(uuid), …)` :
 * ajoute des messages à la fin de la page la plus récente (`pages[0]`), en
 * ignorant ceux déjà présents (dédoublonnage par uuid, y compris au sein du
 * lot reçu). La page est re-triée
 * chronologiquement pour rester robuste à un croisement envoi/polling.
 * Renvoie `undefined` si le cache n'existe pas (aucune mise à jour).
 */
export function appendMessagesToCache(
    newMessages: Message[],
): (old: MessagesInfiniteData | undefined) => MessagesInfiniteData | undefined {
    return (old) => {
        if (!old) return undefined;
        const known = new Set(old.pages.flatMap((page) => page.results.map((message) => message.uuid)));
        const additions = newMessages.filter((message) => {
            if (known.has(message.uuid)) return false;
            known.add(message.uuid);
            return true;
        });
        if (additions.length === 0) return old;

        const [latestPage, ...olderPages] = old.pages;
        const merged = [...(latestPage?.results ?? []), ...additions].sort(compareMessages);
        const updatedPage: MessageThreadPage = { results: merged, hasMore: latestPage?.hasMore ?? false };
        return {
            pages: [updatedPage, ...olderPages],
            pageParams: latestPage ? old.pageParams : [null],
        };
    };
}

/**
 * Updater pur pour `setQueryData(conversationKeys.messages(uuid), …)` :
 * remplace, dans toutes les pages, les messages de même uuid par leur nouvelle
 * version (édition, suppression logique). Les messages inconnus du cache sont
 * ignorés (pas d'insertion : ce n'est pas le rôle de cet updater). Renvoie la
 * même référence si rien n'a changé, `undefined` si le cache n'existe pas.
 */
export function replaceMessageInCache(
    replacement: Message | Message[],
): (old: MessagesInfiniteData | undefined) => MessagesInfiniteData | undefined {
    const byUuid = new Map((Array.isArray(replacement) ? replacement : [replacement]).map((m) => [m.uuid, m]));
    return (old) => {
        if (!old || byUuid.size === 0) return old;
        let changed = false;
        const pages = old.pages.map((page) => {
            let pageChanged = false;
            const results = page.results.map((message) => {
                const incoming = byUuid.get(message.uuid);
                // Une version plus ancienne (poll parti avant une édition locale) ne doit
                // jamais écraser une version plus récente déjà en cache.
                if (!incoming || !isNewerOrSame(incoming.updatedAt, message.updatedAt)) return message;
                if (incoming === message) return message;
                pageChanged = true;
                return incoming;
            });
            if (!pageChanged) return page;
            changed = true;
            return { ...page, results };
        });
        return changed ? { ...old, pages } : old;
    };
}

/** Vrai si `candidate` est postérieur ou égal à `reference` (comparaison temporelle, pas lexicographique). */
function isNewerOrSame(candidate: string, reference: string): boolean {
    const a = Date.parse(candidate);
    const b = Date.parse(reference);
    if (Number.isNaN(a) || Number.isNaN(b)) return candidate >= reference;
    return a >= b;
}

/** Plus grand `updatedAt` d'un lot de messages (comparaison temporelle : les offsets peuvent différer), ou null. */
function maxUpdatedAt(messages: Message[], current: string | null): string | null {
    let max = current;
    for (const message of messages) {
        if (max === null || !isNewerOrSame(max, message.updatedAt)) max = message.updatedAt;
    }
    return max;
}

function buildMessagesUrl(
    uuid: string,
    cursor: { before?: string | null; after?: string | null; updatedSince?: string | null },
): string {
    const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_LIMIT) });
    if (cursor.before) params.set('before', cursor.before);
    if (cursor.after) params.set('after', cursor.after);
    if (cursor.updatedSince) params.set('updated_since', cursor.updatedSince);
    return `/conversations/${uuid}/messages/?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Conversations                                                      */
/* ------------------------------------------------------------------ */

/** Conversations dont je suis membre (triées par dernier message desc) — pollée. */
export function useConversations(options?: PollingOptions) {
    return useQuery({
        queryKey: conversationKeys.lists(),
        queryFn: ({ signal }): Promise<Conversation[]> => api.get('/conversations/', ConversationListSchema, signal),
        refetchInterval: options?.pollingIntervalMs ?? POLLING_INTERVAL_MS,
        ...QUERY_CACHE_CONFIG,
    });
}

/** Total des messages non lus (badge de navigation) — pollé. */
export function useUnreadCount(options?: PollingOptions) {
    return useQuery({
        queryKey: conversationKeys.unreadCount(),
        queryFn: ({ signal }): Promise<UnreadCount> =>
            api.get('/conversations/unread-count/', UnreadCountSchema, signal),
        refetchInterval: options?.pollingIntervalMs ?? POLLING_INTERVAL_MS,
        ...QUERY_CACHE_CONFIG,
    });
}

/** Détail d'une conversation. Désactivé tant que uuid est null. */
export function useConversation(uuid: string | null) {
    return useQuery({
        queryKey: conversationKeys.detail(uuid ?? ''),
        queryFn: ({ signal }): Promise<Conversation> => api.get(`/conversations/${uuid}/`, ConversationSchema, signal),
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/* ------------------------------------------------------------------ */
/*  Fil de messages : pages `before` + polling `after`                 */
/* ------------------------------------------------------------------ */

export interface ConversationMessagesResult {
    /** Tous les messages chargés, en ordre chronologique croissant. */
    messages: Message[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    /** Il existe des messages plus anciens que ceux chargés. */
    hasOlder: boolean;
    /** Charge la page précédente (plus ancienne) — no-op si rien à charger ou déjà en cours. */
    fetchOlder: () => void;
    isFetchingOlder: boolean;
}

/**
 * Messages d'une conversation : infinite query (pages plus anciennes via
 * `before`) + polling des nouveaux (`after` le plus récent) fusionné dans le
 * cache de l'infinite query. Robuste à un uuid null (aucune requête).
 */
export function useConversationMessages(
    conversationUuid: string | null,
    options?: PollingOptions,
): ConversationMessagesResult {
    const queryClient = useQueryClient();
    const pollingInterval = options?.pollingIntervalMs ?? POLLING_INTERVAL_MS;
    const uuid = conversationUuid ?? '';

    // Curseur de polling : uuid du dernier message connu du serveur pour CETTE
    // conversation (null = aucun → la query de polling demande la page la plus
    // récente, dédoublonnée à l'ajout) + `updatedSince` = plus grand `updatedAt`
    // vu (pages chargées et polling) pour recevoir les éditions / suppressions.
    // Réinitialisés au changement de conversation.
    const pollCursorRef = useRef<{ uuid: string; cursor: string | null; updatedSince: string | null }>({
        uuid,
        cursor: null,
        updatedSince: null,
    });
    if (pollCursorRef.current.uuid !== uuid) {
        pollCursorRef.current = { uuid, cursor: null, updatedSince: null };
    }

    const infinite = useInfiniteQuery({
        queryKey: conversationKeys.messages(uuid),
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam, signal }): Promise<MessagePage> => {
            const page = await api.get(buildMessagesUrl(uuid, { before: pageParam }), MessagePageSchema, signal);
            if (pollCursorRef.current.uuid === uuid) {
                // Première page (la plus récente) : amorce le curseur de polling sur
                // son dernier message — un message venu du serveur, pas d'un envoi local.
                const newest = page.results[page.results.length - 1];
                if (pageParam === null && newest) pollCursorRef.current.cursor = newest.uuid;
                // Toute page (même ancienne) peut contenir un message édité récemment.
                pollCursorRef.current.updatedSince = maxUpdatedAt(page.results, pollCursorRef.current.updatedSince);
            }
            return page;
        },
        // La « page suivante » est la plus ancienne : curseur = premier message de la dernière page.
        getNextPageParam: (last) => (last.hasMore ? (last.results[0]?.uuid ?? undefined) : undefined),
        enabled: Boolean(conversationUuid),
        ...QUERY_CACHE_CONFIG,
    });

    const pages = infinite.data?.pages;
    const messages = useMemo<Message[]>(
        () => (pages ? [...pages].reverse().flatMap((page) => page.results) : []),
        [pages],
    );

    // Polling à clé stable (pas de query recréée à chaque nouveau message) : le
    // curseur est lu dans la ref au moment de la requête et avancé sur ses résultats.
    const polling = useQuery({
        queryKey: conversationKeys.messagesPoll(uuid),
        queryFn: async ({ signal }): Promise<MessagePage> => {
            const { cursor, updatedSince } = pollCursorRef.current;
            const page = await api.get(
                buildMessagesUrl(uuid, { after: cursor ?? undefined, updatedSince }),
                MessagePageSchema,
                signal,
            );
            if (pollCursorRef.current.uuid === uuid) {
                const newest = page.results[page.results.length - 1];
                if (newest) pollCursorRef.current.cursor = newest.uuid;
                pollCursorRef.current.updatedSince = maxUpdatedAt(
                    [...page.results, ...page.updated],
                    pollCursorRef.current.updatedSince,
                );
            }
            return page;
        },
        // Attend la première page du fil : le curseur est alors amorcé.
        enabled: Boolean(conversationUuid) && infinite.isSuccess,
        refetchInterval: pollingInterval,
        staleTime: 0,
        gcTime: 0,
    });

    const polledPage = polling.data;
    const { refetch: refetchPolling } = polling;
    useEffect(() => {
        if (!conversationUuid || !polledPage) return;
        const hasNew = polledPage.results.length > 0;
        const hasUpdated = polledPage.updated.length > 0;
        if (!hasNew && !hasUpdated) return;
        const key = conversationKeys.messages(conversationUuid);
        if (hasNew) {
            queryClient.setQueryData<MessagesInfiniteData>(key, appendMessagesToCache(polledPage.results));
            queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
            // Un événement de groupe (renommage, membres…) modifie la conversation elle-même.
            if (polledPage.results.some((message) => message.kind === 'system')) {
                queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationUuid) });
            }
        }
        // Éditions / suppressions faites ailleurs : remplacement en place (l'aperçu de la liste change aussi).
        if (hasUpdated) {
            queryClient.setQueryData<MessagesInfiniteData>(key, replaceMessageInCache(polledPage.updated));
        }
        queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
        // Plus de MESSAGE_PAGE_LIMIT nouveaux messages : enchaîner sans attendre l'intervalle.
        if (polledPage.hasMore) void refetchPolling();
    }, [polledPage, conversationUuid, queryClient, refetchPolling]);

    // Conversation devenue invisible (retrait, suppression) : le détail repasse en
    // erreur (404) et le fil est purgé — la page affiche « Conversation introuvable ».
    const pollingError = polling.error;
    useEffect(() => {
        if (!conversationUuid || !(pollingError instanceof ApiError) || pollingError.status !== 404) return;
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationUuid) });
        queryClient.removeQueries({ queryKey: conversationKeys.messages(conversationUuid) });
    }, [pollingError, conversationUuid, queryClient]);

    const { hasNextPage, isFetchingNextPage, fetchNextPage } = infinite;
    const fetchOlder = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return {
        messages,
        isLoading: infinite.isLoading,
        isError: infinite.isError,
        error: infinite.error,
        hasOlder: hasNextPage,
        fetchOlder,
        isFetchingOlder: isFetchingNextPage,
    };
}

/* ------------------------------------------------------------------ */
/*  Mutations de conversation                                          */
/* ------------------------------------------------------------------ */

/** Crée une conversation (201) ou renvoie la privée existante (200) — même corps. */
export function useCreateConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: ConversationCreate): Promise<Conversation> => {
            const response = await api.post('/conversations/', conversationCreateToApi(data));
            return ConversationSchema.parse(response);
        },
        onSuccess: (conversation) => {
            queryClient.setQueryData(conversationKeys.detail(conversation.uuid), conversation);
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
        },
    });
}

/** Renomme un groupe (propriétaire). */
export function useRenameConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, name }: { uuid: string; name: string }): Promise<Conversation> => {
            const response = await api.patch(`/conversations/${uuid}/`, { name });
            return ConversationSchema.parse(response);
        },
        onSuccess: (conversation, variables) => {
            queryClient.setQueryData(conversationKeys.detail(variables.uuid), conversation);
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
        },
    });
}

/** Supprime un groupe (propriétaire) — retire aussi le détail du cache. */
export function useDeleteConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/conversations/${uuid}/`);
        },
        onSuccess: (_data, uuid) => {
            queryClient.removeQueries({ queryKey: conversationKeys.detail(uuid) });
            queryClient.removeQueries({ queryKey: conversationKeys.messages(uuid) });
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Membres                                                            */
/* ------------------------------------------------------------------ */

/** Ajoute des membres à un groupe (tout membre) — génère un message système. */
export function useAddConversationMembers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, memberUuids }: { uuid: string; memberUuids: string[] }): Promise<Conversation> => {
            const response = await api.post(`/conversations/${uuid}/members/`, { member_uuids: memberUuids });
            return ConversationSchema.parse(response);
        },
        onSuccess: (conversation, variables) => {
            queryClient.setQueryData(conversationKeys.detail(variables.uuid), conversation);
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.messages(variables.uuid) });
        },
    });
}

/**
 * Retire un membre (propriétaire, 200 + conversation) ou quitte le groupe
 * (204 ⇒ undefined : la conversation n'est plus visible, on purge son cache).
 */
export function useRemoveConversationMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uuid,
            memberUuid,
        }: {
            uuid: string;
            memberUuid: string;
        }): Promise<Conversation | undefined> => {
            const response = await api.delete<unknown>(`/conversations/${uuid}/members/${memberUuid}/`);
            return response === undefined ? undefined : ConversationSchema.parse(response);
        },
        onSuccess: (conversation, variables) => {
            if (conversation) {
                queryClient.setQueryData(conversationKeys.detail(variables.uuid), conversation);
                queryClient.invalidateQueries({ queryKey: conversationKeys.messages(variables.uuid) });
            } else {
                queryClient.removeQueries({ queryKey: conversationKeys.detail(variables.uuid) });
                queryClient.removeQueries({ queryKey: conversationKeys.messages(variables.uuid) });
            }
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Lecture / envoi                                                    */
/* ------------------------------------------------------------------ */

/** Marque la conversation lue (unread_count = 0). */
export function useMarkConversationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<Conversation> => {
            const response = await api.post(`/conversations/${uuid}/read/`, {});
            return ConversationSchema.parse(response);
        },
        onSuccess: (conversation, uuid) => {
            queryClient.setQueryData(conversationKeys.detail(uuid), conversation);
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
        },
    });
}

/**
 * Variables de usePostMessage — `entityRefs` optionnel (références FSEC /
 * campagne / FA), `attachments` optionnel (fichiers déjà validés par
 * `validateAttachmentFiles` ; un corps vide est accepté s'il y a au moins un fichier).
 */
export interface PostMessageVariables {
    uuid: string;
    body: string;
    entityRefs?: EntityRefInput[];
    attachments?: File[];
}

/** `entity_refs` au format API (snake_case). */
function entityRefsToApi(entityRefs: EntityRefInput[]) {
    return entityRefs.map((ref) => ({ entity_type: ref.entityType, entity_uuid: ref.entityUuid }));
}

/**
 * Corps de POST messages/ : JSON (`entity_refs` omis quand il n'y a aucune
 * référence) ou, avec des fichiers, `FormData` (`body`, `entity_refs` = chaîne
 * JSON si non vide, `attachments` répété — le navigateur pose le Content-Type
 * multipart avec son boundary).
 */
function buildPostMessageBody(
    body: string,
    entityRefs: EntityRefInput[] | undefined,
    attachments: File[] | undefined,
): Record<string, unknown> | FormData {
    const refs = entityRefs && entityRefs.length > 0 ? entityRefsToApi(entityRefs) : null;
    if (attachments && attachments.length > 0) {
        const form = new FormData();
        form.append('body', body);
        if (refs) form.append('entity_refs', JSON.stringify(refs));
        for (const file of attachments) form.append('attachments', file, file.name);
        return form;
    }
    return refs ? { body, entity_refs: refs } : { body };
}

/**
 * Envoie un message texte (avec références et pièces jointes éventuelles) —
 * ajouté immédiatement au cache du fil ; les mentions des entités référencées
 * sont invalidées.
 */
export function usePostMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, body, entityRefs, attachments }: PostMessageVariables): Promise<Message> => {
            const response = await api.post(
                `/conversations/${uuid}/messages/`,
                buildPostMessageBody(body, entityRefs, attachments),
            );
            return MessageSchema.parse(response);
        },
        onSuccess: (message, variables) => {
            queryClient.setQueryData<MessagesInfiniteData>(
                conversationKeys.messages(variables.uuid),
                appendMessagesToCache([message]),
            );
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.mentionsAll() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Édition / suppression logique d'un message                         */
/* ------------------------------------------------------------------ */

/** Variables de useEditMessage. */
export interface EditMessageVariables {
    uuid: string;
    messageUuid: string;
    body: string;
}

/** Variables de useDeleteMessage. */
export interface DeleteMessageVariables {
    uuid: string;
    messageUuid: string;
}

/**
 * Modifie le corps d'un message texte dont je suis l'auteur (PATCH → message
 * avec `editedAt`). Le message est remplacé en place dans le fil ; l'aperçu de
 * la liste est invalidé (`last_message` reflète le nouveau corps).
 */
export function useEditMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, messageUuid, body }: EditMessageVariables): Promise<Message> => {
            const response = await api.patch(`/conversations/${uuid}/messages/${messageUuid}/`, { body });
            return MessageSchema.parse(response);
        },
        onSuccess: (message, variables) => {
            queryClient.setQueryData<MessagesInfiniteData>(
                conversationKeys.messages(variables.uuid),
                replaceMessageInCache(message),
            );
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
        },
    });
}

/**
 * Suppression logique d'un message (auteur, ou propriétaire du groupe) :
 * DELETE → 200 message `isDeleted` (corps vide, sans références ni pièces
 * jointes). Remplacé en place dans le fil ; liste et mentions invalidées.
 */
export function useDeleteMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, messageUuid }: DeleteMessageVariables): Promise<Message> => {
            const response = await api.delete<unknown>(`/conversations/${uuid}/messages/${messageUuid}/`);
            return MessageSchema.parse(response);
        },
        onSuccess: (message, variables) => {
            queryClient.setQueryData<MessagesInfiniteData>(
                conversationKeys.messages(variables.uuid),
                replaceMessageInCache(message),
            );
            queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conversationKeys.mentionsAll() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Recherche dans mes messages                                        */
/* ------------------------------------------------------------------ */

/** Fraîcheur d'un résultat de recherche (pas de polling : une relance après 30 s suffit). */
const SEARCH_STALE_TIME_MS = 30_000;

/**
 * Recherche plein texte (insensible à la casse) dans les messages texte non
 * supprimés de mes conversations, du plus récent au plus ancien. Désactivée
 * tant que la requête strippée fait moins de `SEARCH_MIN_LENGTH` caractères ;
 * les résultats précédents restent affichés pendant la frappe
 * (`keepPreviousData`). `data` = tableau de mentions (même forme que
 * `useEntityMentions`). NOTE : `limit` ne fait pas partie de la clé.
 */
export function useMessageSearch(query: string, limit = SEARCH_DEFAULT_LIMIT) {
    const trimmed = query.trim();
    const enabled = trimmed.length >= SEARCH_MIN_LENGTH;
    return useQuery({
        queryKey: conversationKeys.search(trimmed),
        queryFn: ({ signal }): Promise<Mention[]> => {
            const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
            return api
                .get(`/conversations/search/?${params.toString()}`, MentionsPageSchema, signal)
                .then((page) => page.results);
        },
        enabled,
        staleTime: SEARCH_STALE_TIME_MS,
        gcTime: QUERY_CACHE_CONFIG.gcTime,
        // Sous le seuil, aucun résultat périmé ne doit rester affiché.
        placeholderData: enabled ? keepPreviousData : undefined,
    });
}

/* ------------------------------------------------------------------ */
/*  Mentions d'une entité                                              */
/* ------------------------------------------------------------------ */

/**
 * Messages (des conversations dont je suis membre) mentionnant une entité, du
 * plus récent au plus ancien. Désactivé tant que `entityUuid` est null. Pas de
 * polling (throttle `user` côté backend). `data` = tableau de mentions.
 * NOTE : `limit` ne fait pas partie de la clé — deux consommateurs d'une même
 * cible partagent le cache.
 */
export function useEntityMentions(
    entityType: EntityRefType,
    entityUuid: string | null,
    limit = MENTIONS_DEFAULT_LIMIT,
) {
    const uuid = entityUuid ?? '';
    return useQuery({
        queryKey: conversationKeys.mentions(entityType, uuid),
        queryFn: ({ signal }): Promise<Mention[]> => {
            const params = new URLSearchParams({ entity_type: entityType, entity_uuid: uuid, limit: String(limit) });
            return api
                .get(`/conversations/mentions/?${params.toString()}`, MentionsPageSchema, signal)
                .then((page) => page.results);
        },
        enabled: Boolean(entityUuid),
        ...QUERY_CACHE_CONFIG,
    });
}
