/**
 * Messaging Zod Schemas — Validation & Transformation
 * @module entities/messaging/model
 *
 * Source of Truth : backend module messaging (/api/v1/conversations/).
 *
 * API Format: snake_case -> Domain Format: camelCase.
 * Les membres et auteurs sont sérialisés par le backend sous forme de
 * résumés utilisateur (uuid de UserProfile + identité + avatar) : aucune
 * résolution annuaire n'est nécessaire côté client pour l'affichage.
 */

import { z } from 'zod';
import {
    CONVERSATION_KINDS,
    ENTITY_REF_TYPES,
    MAX_CONVERSATION_NAME_LENGTH,
    MAX_MESSAGE_LENGTH,
    MESSAGE_KINDS,
} from './messaging.constants';

/* ------------------------------------------------------------------ */
/*  Résumé utilisateur (auteur d'un message / base d'un membre)        */
/* ------------------------------------------------------------------ */

/** Raw API response schema (snake_case from Backend). */
export const UserSummaryApiSchema = z.object({
    uuid: z.string().uuid(),
    username: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable(),
    is_active: z.boolean(),
});

/** Shared mapping function: snake_case API -> camelCase domain. */
function mapUserSummary(api: z.infer<typeof UserSummaryApiSchema>) {
    return {
        uuid: api.uuid,
        username: api.username,
        firstName: api.first_name,
        lastName: api.last_name,
        avatarUrl: api.avatar_url,
        isActive: api.is_active,
    };
}

/** Domain schema with camelCase transformation. */
export const UserSummarySchema = UserSummaryApiSchema.transform(mapUserSummary);
export type UserSummary = z.infer<typeof UserSummarySchema>;

/* ------------------------------------------------------------------ */
/*  Membre d'une conversation = résumé utilisateur + dates d'adhésion  */
/* ------------------------------------------------------------------ */

export const ConversationMemberApiSchema = UserSummaryApiSchema.extend({
    joined_at: z.string(),
    last_read_at: z.string().nullable(),
});

function mapConversationMember(api: z.infer<typeof ConversationMemberApiSchema>) {
    return {
        ...mapUserSummary(api),
        joinedAt: api.joined_at,
        lastReadAt: api.last_read_at,
    };
}

export const ConversationMemberSchema = ConversationMemberApiSchema.transform(mapConversationMember);
export type ConversationMember = z.infer<typeof ConversationMemberSchema>;

/* ------------------------------------------------------------------ */
/*  Référence d'entité attachée à un message (FSEC / campagne / FA)    */
/* ------------------------------------------------------------------ */

/**
 * Référence résolue par le backend à la lecture : `label` et `slug` sont
 * recalculés sur l'entité courante ; si elle n'existe plus, `exists` passe à
 * false, `slug` à null et `label` reprend le snapshot pris à la création.
 * FSEC : `entity_uuid` = `fsec_uuid` (stable à travers les versions).
 */
export const EntityRefApiSchema = z.object({
    entity_type: z.enum(ENTITY_REF_TYPES),
    entity_uuid: z.string().uuid(),
    label: z.string(),
    slug: z.string().nullable(),
    exists: z.boolean(),
});

function mapEntityRef(api: z.infer<typeof EntityRefApiSchema>) {
    return {
        entityType: api.entity_type,
        entityUuid: api.entity_uuid,
        label: api.label,
        slug: api.slug,
        exists: api.exists,
    };
}

export const EntityRefSchema = EntityRefApiSchema.transform(mapEntityRef);
export type EntityRef = z.infer<typeof EntityRefSchema>;

/** Référence à attacher lors de l'envoi d'un message (POST messages/ `entity_refs`). */
export interface EntityRefInput {
    entityType: EntityRef['entityType'];
    entityUuid: string;
}

/* ------------------------------------------------------------------ */
/*  Pièce jointe d'un message (fichier servi sous MEDIA_URL)           */
/* ------------------------------------------------------------------ */

/**
 * Fichier attaché à un message. `url` est l'URL publique (sous
 * `/api/media/messaging/attachments/…`, chemin non devinable) ; null si le
 * fichier n'est plus disponible. `is_image` est calculé par le backend depuis
 * l'extension (vignette côté client).
 */
export const AttachmentApiSchema = z.object({
    uuid: z.string().uuid(),
    original_name: z.string(),
    content_type: z.string(),
    size: z.number().int().nonnegative(),
    url: z.string().nullable(),
    is_image: z.boolean(),
});

function mapAttachment(api: z.infer<typeof AttachmentApiSchema>) {
    return {
        uuid: api.uuid,
        originalName: api.original_name,
        contentType: api.content_type,
        size: api.size,
        url: api.url,
        isImage: api.is_image,
    };
}

export const AttachmentSchema = AttachmentApiSchema.transform(mapAttachment);
export type Attachment = z.infer<typeof AttachmentSchema>;

/* ------------------------------------------------------------------ */
/*  Aperçu du dernier message (porté par la conversation)              */
/* ------------------------------------------------------------------ */

export const MessagePreviewApiSchema = z.object({
    uuid: z.string().uuid(),
    author_uuid: z.string().uuid().nullable(),
    kind: z.enum(MESSAGE_KINDS),
    /** Aperçu tronqué par le backend (≤ 200 caractères). */
    body: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    /** Nombre de références attachées au message (absent avant M3 ⇒ 0). */
    entity_ref_count: z.number().int().default(0),
    /** Message supprimé logiquement (absent avant M4 ⇒ false). */
    is_deleted: z.boolean().default(false),
    /** Nombre de pièces jointes (absent avant M4 ⇒ 0). */
    attachment_count: z.number().int().default(0),
});

function mapMessagePreview(api: z.infer<typeof MessagePreviewApiSchema>) {
    return {
        uuid: api.uuid,
        authorUuid: api.author_uuid,
        kind: api.kind,
        body: api.body,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
        entityRefCount: api.entity_ref_count,
        isDeleted: api.is_deleted,
        attachmentCount: api.attachment_count,
    };
}

export const MessagePreviewSchema = MessagePreviewApiSchema.transform(mapMessagePreview);
export type MessagePreview = z.infer<typeof MessagePreviewSchema>;

/* ------------------------------------------------------------------ */
/*  Message complet (GET/POST /conversations/{uuid}/messages/)         */
/* ------------------------------------------------------------------ */

export const MessageApiSchema = z.object({
    uuid: z.string().uuid(),
    conversation_uuid: z.string().uuid(),
    author_uuid: z.string().uuid().nullable(),
    /** Null si l'auteur a été supprimé. Pour un message `system`, l'acteur de l'événement. */
    author: UserSummaryApiSchema.nullable(),
    kind: z.enum(MESSAGE_KINDS),
    body: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    /** Références attachées, dans l'ordre d'insertion (absent avant M3 ⇒ []). */
    entity_refs: z.array(EntityRefApiSchema).default([]),
    /** Date de la dernière édition du corps (null si jamais modifié ; absent avant M4). */
    edited_at: z.string().nullable().default(null),
    /** Date de suppression logique (null si non supprimé ; absent avant M4). */
    deleted_at: z.string().nullable().default(null),
    /** Supprimé logiquement : corps vide, sans références ni pièces jointes (absent avant M4 ⇒ false). */
    is_deleted: z.boolean().default(false),
    /** Pièces jointes dans l'ordre d'envoi (absent avant M4 ⇒ [] ; vide si supprimé). */
    attachments: z.array(AttachmentApiSchema).default([]),
});

/** Shared mapping function: snake_case API -> camelCase domain. */
export function mapMessage(api: z.infer<typeof MessageApiSchema>) {
    return {
        uuid: api.uuid,
        conversationUuid: api.conversation_uuid,
        authorUuid: api.author_uuid,
        author: api.author ? mapUserSummary(api.author) : null,
        kind: api.kind,
        body: api.body,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
        entityRefs: api.entity_refs.map(mapEntityRef),
        editedAt: api.edited_at,
        deletedAt: api.deleted_at,
        isDeleted: api.is_deleted,
        attachments: api.attachments.map(mapAttachment),
    };
}

export const MessageSchema = MessageApiSchema.transform(mapMessage);
export type Message = z.infer<typeof MessageSchema>;

export const MessageListSchema = z.array(MessageSchema);

/**
 * Page de messages (curseur) — `results` toujours en ordre chronologique
 * croissant. `updated` (polling `updated_since`) : messages de la conversation
 * modifiés / supprimés depuis la date donnée et absents de `results` (absent
 * avant M4 ⇒ []).
 */
export const MessagePageApiSchema = z.object({
    results: z.array(MessageApiSchema),
    has_more: z.boolean(),
    updated: z.array(MessageApiSchema).default([]),
});

export const MessagePageSchema = MessagePageApiSchema.transform((api) => ({
    results: api.results.map(mapMessage),
    hasMore: api.has_more,
    updated: api.updated.map(mapMessage),
}));
export type MessagePage = z.infer<typeof MessagePageSchema>;

/* ------------------------------------------------------------------ */
/*  Conversation (GET /conversations/, GET /conversations/{uuid}/)     */
/* ------------------------------------------------------------------ */

export const ConversationApiSchema = z.object({
    uuid: z.string().uuid(),
    kind: z.enum(CONVERSATION_KINDS),
    /** Vide pour une conversation privée. */
    name: z.string().default(''),
    owner_uuid: z.string().uuid(),
    last_message_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    members: z.array(ConversationMemberApiSchema),
    unread_count: z.number().int(),
    last_message: MessagePreviewApiSchema.nullable(),
});

/** Shared mapping function: snake_case API -> camelCase domain. */
export function mapConversation(api: z.infer<typeof ConversationApiSchema>) {
    return {
        uuid: api.uuid,
        kind: api.kind,
        name: api.name,
        ownerUuid: api.owner_uuid,
        lastMessageAt: api.last_message_at,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
        members: api.members.map(mapConversationMember),
        unreadCount: api.unread_count,
        lastMessage: api.last_message ? mapMessagePreview(api.last_message) : null,
    };
}

export const ConversationSchema = ConversationApiSchema.transform(mapConversation);
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationListSchema = z.array(ConversationSchema);

/* ------------------------------------------------------------------ */
/*  Mention (GET /conversations/mentions/?entity_type&entity_uuid)     */
/* ------------------------------------------------------------------ */

/**
 * Message référençant une entité, accompagné du contexte minimal de sa
 * conversation (titre calculable côté client via `getConversationTitle`).
 */
export const MentionApiSchema = z.object({
    message: MessageApiSchema,
    conversation: z.object({
        uuid: z.string().uuid(),
        kind: z.enum(CONVERSATION_KINDS),
        name: z.string().default(''),
        members: z.array(UserSummaryApiSchema),
    }),
});

function mapMention(api: z.infer<typeof MentionApiSchema>) {
    return {
        message: mapMessage(api.message),
        conversation: {
            uuid: api.conversation.uuid,
            kind: api.conversation.kind,
            name: api.conversation.name,
            members: api.conversation.members.map(mapUserSummary),
        },
    };
}

export const MentionSchema = MentionApiSchema.transform(mapMention);
export type Mention = z.infer<typeof MentionSchema>;

/** Réponse de GET /conversations/mentions/ — du plus récent au plus ancien. */
export const MentionsPageApiSchema = z.object({
    results: z.array(MentionApiSchema),
});

export const MentionsPageSchema = MentionsPageApiSchema.transform((api) => ({
    results: api.results.map(mapMention),
}));
export type MentionsPage = z.infer<typeof MentionsPageSchema>;

/* ------------------------------------------------------------------ */
/*  Compteur global de non-lus (GET /conversations/unread-count/)      */
/* ------------------------------------------------------------------ */

export const UnreadCountApiSchema = z.object({
    total_unread: z.number().int(),
});

export const UnreadCountSchema = UnreadCountApiSchema.transform((api) => ({
    totalUnread: api.total_unread,
}));
export type UnreadCount = z.infer<typeof UnreadCountSchema>;

/* ------------------------------------------------------------------ */
/*  Schémas d'entrée (formulaires) — messages FR                       */
/* ------------------------------------------------------------------ */

/** Création d'une conversation : privée (un destinataire) ou groupe (nom + membres). */
export const ConversationCreateSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('direct'),
        memberUuid: z.string().uuid('Choisissez un destinataire'),
    }),
    z.object({
        kind: z.literal('group'),
        name: z
            .string()
            .trim()
            .min(1, 'Le nom du groupe est requis')
            .max(
                MAX_CONVERSATION_NAME_LENGTH,
                `Le nom ne doit pas dépasser ${MAX_CONVERSATION_NAME_LENGTH} caractères`,
            ),
        memberUuids: z.array(z.string().uuid()),
    }),
]);
export type ConversationCreate = z.infer<typeof ConversationCreateSchema>;

/** camelCase -> snake_case mapper pour POST /conversations/. */
export function conversationCreateToApi(data: ConversationCreate): Record<string, unknown> {
    if (data.kind === 'direct') {
        return { kind: 'direct', member_uuids: [data.memberUuid] };
    }
    return { kind: 'group', name: data.name, member_uuids: data.memberUuids };
}

/** Corps d'un message (strippé, 1..4000 caractères). */
export const MessageBodySchema = z
    .string()
    .trim()
    .min(1, 'Le message ne peut pas être vide')
    .max(MAX_MESSAGE_LENGTH, `Le message ne doit pas dépasser ${MAX_MESSAGE_LENGTH} caractères`);
