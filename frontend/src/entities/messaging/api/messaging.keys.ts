/**
 * Messaging Query Keys — factory pattern (cf. task-list.keys.ts).
 * @module entities/messaging/api
 */

export const conversationKeys = {
    all: ['conversations'] as const,
    lists: () => [...conversationKeys.all, 'list'] as const,
    unreadCount: () => [...conversationKeys.all, 'unread-count'] as const,
    details: () => [...conversationKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...conversationKeys.details(), uuid] as const,
    /** Pages de messages d'une conversation (infinite query, curseur `before`). */
    messages: (uuid: string) => [...conversationKeys.detail(uuid), 'messages'] as const,
    /** Query de polling des nouveaux messages (clé stable, curseur porté par une ref). */
    messagesPoll: (uuid: string) => [...conversationKeys.messages(uuid), 'poll'] as const,
    /** Toutes les mentions (invalidation globale après envoi d'un message). */
    mentionsAll: () => [...conversationKeys.all, 'mentions'] as const,
    /** Messages mentionnant une entité (FSEC : fsec_uuid ; campagne / FA : uuid). */
    mentions: (entityType: string, entityUuid: string) =>
        [...conversationKeys.mentionsAll(), entityType, entityUuid] as const,
    /** Recherche plein texte dans mes messages (GET /conversations/search/?q=). */
    search: (query: string) => [...conversationKeys.all, 'search', query] as const,
};
