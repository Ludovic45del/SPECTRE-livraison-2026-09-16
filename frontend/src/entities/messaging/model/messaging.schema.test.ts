/**
 * Messaging Schema Tests — transform snake_case -> camelCase, enums, nullables,
 * schémas de formulaire (messages FR) et mappers vers l'API.
 * @module entities/messaging/model
 */

import { describe, it, expect } from 'vitest';
import {
    ALLOWED_ATTACHMENT_EXTENSIONS,
    ATTACHMENT_INPUT_ACCEPT,
    CONVERSATION_KINDS,
    ENTITY_REF_TYPES,
    ENTITY_REF_TYPE_LABELS,
    IMAGE_ATTACHMENT_EXTENSIONS,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_CONVERSATION_NAME_LENGTH,
    MAX_ENTITY_REFS_PER_MESSAGE,
    MAX_MESSAGE_LENGTH,
    MENTIONS_DEFAULT_LIMIT,
    MESSAGE_KINDS,
    MESSAGE_PAGE_LIMIT,
    POLLING_INTERVAL_MS,
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LENGTH,
    SEARCH_MIN_LENGTH,
} from './messaging.constants';
import {
    AttachmentSchema,
    ConversationCreateSchema,
    ConversationListSchema,
    ConversationMemberSchema,
    ConversationSchema,
    EntityRefSchema,
    MentionSchema,
    MentionsPageSchema,
    MessageBodySchema,
    MessageListSchema,
    MessagePageSchema,
    MessagePreviewSchema,
    MessageSchema,
    UnreadCountSchema,
    UserSummarySchema,
    conversationCreateToApi,
    type EntityRefInput,
} from './messaging.schema';

const CONV_UUID = '123e4567-e89b-12d3-a456-426614174000';
const ME_UUID = '11111111-1111-1111-1111-111111111111';
const OTHER_UUID = '22222222-2222-2222-2222-222222222222';
const MESSAGE_UUID = '33333333-3333-4333-8333-333333333333';
const FSEC_UUID = '44444444-4444-4444-8444-444444444444';
const FA_UUID = '55555555-5555-4555-8555-555555555555';

const validUserApi = {
    uuid: ME_UUID,
    username: 'chef',
    first_name: 'Pierre',
    last_name: 'Dupont',
    avatar_url: '/media/avatars/chef.png',
    is_active: true,
};

const validMemberApi = {
    ...validUserApi,
    joined_at: '2026-01-15T10:00:00Z',
    last_read_at: '2026-01-16T10:00:00Z',
};

const validPreviewApi = {
    uuid: MESSAGE_UUID,
    author_uuid: ME_UUID,
    kind: 'text',
    body: 'Bonjour',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
};

const validMessageApi = {
    uuid: MESSAGE_UUID,
    conversation_uuid: CONV_UUID,
    author_uuid: ME_UUID,
    author: validUserApi,
    kind: 'text',
    body: 'Bonjour à tous',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
};

/** Copie d'un objet API sans la clé donnée (simule un champ absent). */
const omit = (obj: Record<string, unknown>, key: string) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

const ATTACHMENT_UUID = '66666666-6666-4666-8666-666666666666';

const validAttachmentApi = {
    uuid: ATTACHMENT_UUID,
    original_name: 'rapport.pdf',
    content_type: 'application/pdf',
    size: 12345,
    url: '/api/media/messaging/attachments/0123abcd/rapport.pdf',
    is_image: false,
};

const validEntityRefApi = {
    entity_type: 'fsec',
    entity_uuid: FSEC_UUID,
    label: 'FSEC-12',
    slug: '2026-s1-lmj-campagne-fsec-12',
    exists: true,
};

const validConversationApi = {
    uuid: CONV_UUID,
    kind: 'direct',
    name: '',
    owner_uuid: ME_UUID,
    last_message_at: '2026-01-15T10:00:00Z',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    members: [validMemberApi, { ...validMemberApi, uuid: OTHER_UUID, username: 'mmartin', last_read_at: null }],
    unread_count: 2,
    last_message: validPreviewApi,
};

describe('constantes', () => {
    it('expose les référentiels et bornes attendus', () => {
        expect(CONVERSATION_KINDS).toEqual(['direct', 'group']);
        expect(MESSAGE_KINDS).toEqual(['text', 'system']);
        expect(MAX_CONVERSATION_NAME_LENGTH).toBe(120);
        expect(MAX_MESSAGE_LENGTH).toBe(4000);
        expect(MESSAGE_PAGE_LIMIT).toBe(50);
        expect(POLLING_INTERVAL_MS).toBe(5000);
    });

    it('expose les référentiels des références d’entités', () => {
        expect(ENTITY_REF_TYPES).toEqual(['fsec', 'campaign', 'fa']);
        expect(MAX_ENTITY_REFS_PER_MESSAGE).toBe(10);
        expect(MENTIONS_DEFAULT_LIMIT).toBe(20);
        expect(ENTITY_REF_TYPE_LABELS).toEqual({ fsec: 'FSEC', campaign: 'Campagne', fa: 'FA' });
        for (const type of ENTITY_REF_TYPES) {
            expect(ENTITY_REF_TYPE_LABELS[type]).toBeTruthy();
        }
    });

    it('expose les bornes des pièces jointes et de la recherche (vague M4)', () => {
        expect(MAX_ATTACHMENTS_PER_MESSAGE).toBe(5);
        expect(MAX_ATTACHMENT_SIZE_BYTES).toBe(10 * 1024 * 1024);
        expect([...ALLOWED_ATTACHMENT_EXTENSIONS]).toEqual([
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'pdf',
            'txt',
            'csv',
            'doc',
            'docx',
            'xls',
            'xlsx',
            'ppt',
            'pptx',
            'zip',
        ]);
        for (const ext of IMAGE_ATTACHMENT_EXTENSIONS) {
            expect(ALLOWED_ATTACHMENT_EXTENSIONS).toContain(ext);
        }
        expect(ATTACHMENT_INPUT_ACCEPT.startsWith('.jpg,.jpeg,.png')).toBe(true);
        expect(ATTACHMENT_INPUT_ACCEPT.split(',')).toHaveLength(ALLOWED_ATTACHMENT_EXTENSIONS.length);
        expect(SEARCH_MIN_LENGTH).toBe(2);
        expect(SEARCH_MAX_LENGTH).toBe(100);
        expect(SEARCH_DEFAULT_LIMIT).toBe(20);
    });
});

describe('AttachmentSchema', () => {
    it('transforme le snake_case en camelCase', () => {
        expect(AttachmentSchema.parse(validAttachmentApi)).toEqual({
            uuid: ATTACHMENT_UUID,
            originalName: 'rapport.pdf',
            contentType: 'application/pdf',
            size: 12345,
            url: '/api/media/messaging/attachments/0123abcd/rapport.pdf',
            isImage: false,
        });
    });

    it('accepte url à null et une image, rejette une taille négative ou non entière et un champ manquant', () => {
        expect(AttachmentSchema.parse({ ...validAttachmentApi, url: null, is_image: true })).toMatchObject({
            url: null,
            isImage: true,
        });
        expect(AttachmentSchema.safeParse({ ...validAttachmentApi, size: -1 }).success).toBe(false);
        expect(AttachmentSchema.safeParse({ ...validAttachmentApi, size: 1.5 }).success).toBe(false);
        expect(AttachmentSchema.safeParse(omit(validAttachmentApi, 'is_image')).success).toBe(false);
        expect(AttachmentSchema.safeParse(omit(validAttachmentApi, 'url')).success).toBe(false);
    });
});

describe('EntityRefSchema', () => {
    it('transforme le snake_case en camelCase', () => {
        expect(EntityRefSchema.parse(validEntityRefApi)).toEqual({
            entityType: 'fsec',
            entityUuid: FSEC_UUID,
            label: 'FSEC-12',
            slug: '2026-s1-lmj-campagne-fsec-12',
            exists: true,
        });
    });

    it('accepte une entité supprimée (exists false, slug null, label snapshot)', () => {
        const result = EntityRefSchema.parse({ ...validEntityRefApi, exists: false, slug: null });
        expect(result.exists).toBe(false);
        expect(result.slug).toBeNull();
        expect(result.label).toBe('FSEC-12');
    });

    it('accepte les trois types et rejette un type inconnu ou un uuid invalide', () => {
        expect(EntityRefSchema.parse({ ...validEntityRefApi, entity_type: 'campaign' }).entityType).toBe('campaign');
        expect(EntityRefSchema.parse({ ...validEntityRefApi, entity_type: 'fa' }).entityType).toBe('fa');
        expect(EntityRefSchema.safeParse({ ...validEntityRefApi, entity_type: 'embase' }).success).toBe(false);
        expect(EntityRefSchema.safeParse({ ...validEntityRefApi, entity_uuid: 'nope' }).success).toBe(false);
    });

    it('rejette une référence sans exists ou sans slug', () => {
        expect(EntityRefSchema.safeParse(omit(validEntityRefApi, 'exists')).success).toBe(false);
        expect(EntityRefSchema.safeParse(omit(validEntityRefApi, 'slug')).success).toBe(false);
    });

    it('EntityRefInput ne porte que le type et l’uuid', () => {
        const input: EntityRefInput = { entityType: 'fa', entityUuid: FA_UUID };
        expect(input).toEqual({ entityType: 'fa', entityUuid: FA_UUID });
    });
});

describe('UserSummarySchema', () => {
    it('transforme le snake_case en camelCase', () => {
        const result = UserSummarySchema.parse(validUserApi);
        expect(result).toEqual({
            uuid: ME_UUID,
            username: 'chef',
            firstName: 'Pierre',
            lastName: 'Dupont',
            avatarUrl: '/media/avatars/chef.png',
            isActive: true,
        });
    });

    it('accepte avatar_url à null', () => {
        expect(UserSummarySchema.parse({ ...validUserApi, avatar_url: null }).avatarUrl).toBeNull();
    });

    it('rejette un uuid invalide', () => {
        expect(UserSummarySchema.safeParse({ ...validUserApi, uuid: 'nope' }).success).toBe(false);
    });
});

describe('ConversationMemberSchema', () => {
    it('ajoute joinedAt / lastReadAt au résumé utilisateur', () => {
        const result = ConversationMemberSchema.parse(validMemberApi);
        expect(result.firstName).toBe('Pierre');
        expect(result.joinedAt).toBe('2026-01-15T10:00:00Z');
        expect(result.lastReadAt).toBe('2026-01-16T10:00:00Z');
    });

    it('accepte last_read_at à null', () => {
        expect(ConversationMemberSchema.parse({ ...validMemberApi, last_read_at: null }).lastReadAt).toBeNull();
    });
});

describe('MessagePreviewSchema', () => {
    it('transforme le snake_case en camelCase', () => {
        const result = MessagePreviewSchema.parse(validPreviewApi);
        expect(result.authorUuid).toBe(ME_UUID);
        expect(result.kind).toBe('text');
        expect(result.createdAt).toBe('2026-01-15T10:00:00Z');
    });

    it('accepte author_uuid à null et rejette un kind inconnu', () => {
        expect(MessagePreviewSchema.parse({ ...validPreviewApi, author_uuid: null }).authorUuid).toBeNull();
        expect(MessagePreviewSchema.safeParse({ ...validPreviewApi, kind: 'audio' }).success).toBe(false);
    });

    it('expose entity_ref_count (0 par défaut si absent, entier requis)', () => {
        expect(MessagePreviewSchema.parse(validPreviewApi).entityRefCount).toBe(0);
        expect(MessagePreviewSchema.parse({ ...validPreviewApi, entity_ref_count: 3 }).entityRefCount).toBe(3);
        expect(MessagePreviewSchema.safeParse({ ...validPreviewApi, entity_ref_count: 1.5 }).success).toBe(false);
    });

    it('expose is_deleted (false par défaut) et attachment_count (0 par défaut, entier requis)', () => {
        const legacy = MessagePreviewSchema.parse(validPreviewApi);
        expect(legacy.isDeleted).toBe(false);
        expect(legacy.attachmentCount).toBe(0);
        const m4 = MessagePreviewSchema.parse({ ...validPreviewApi, is_deleted: true, attachment_count: 2 });
        expect(m4.isDeleted).toBe(true);
        expect(m4.attachmentCount).toBe(2);
        expect(MessagePreviewSchema.safeParse({ ...validPreviewApi, attachment_count: 0.5 }).success).toBe(false);
        expect(MessagePreviewSchema.safeParse({ ...validPreviewApi, is_deleted: 'oui' }).success).toBe(false);
    });
});

describe('MessageSchema', () => {
    it('transforme le message et son auteur imbriqué', () => {
        const result = MessageSchema.parse(validMessageApi);
        expect(result.conversationUuid).toBe(CONV_UUID);
        expect(result.authorUuid).toBe(ME_UUID);
        expect(result.author?.firstName).toBe('Pierre');
        expect(result.author?.avatarUrl).toBe('/media/avatars/chef.png');
        expect(result.body).toBe('Bonjour à tous');
        expect(result.updatedAt).toBe('2026-01-15T10:00:00Z');
    });

    it('accepte un auteur supprimé (author et author_uuid à null)', () => {
        const result = MessageSchema.parse({ ...validMessageApi, author: null, author_uuid: null });
        expect(result.author).toBeNull();
        expect(result.authorUuid).toBeNull();
    });

    it('accepte un message système', () => {
        expect(MessageSchema.parse({ ...validMessageApi, kind: 'system' }).kind).toBe('system');
    });

    it('MessageListSchema valide un tableau', () => {
        expect(MessageListSchema.parse([validMessageApi, validMessageApi])).toHaveLength(2);
    });

    it('entityRefs vaut [] quand entity_refs est absent (réponse antérieure à M3)', () => {
        expect(MessageSchema.parse(validMessageApi).entityRefs).toEqual([]);
    });

    it('transforme entity_refs en entityRefs dans l’ordre', () => {
        const result = MessageSchema.parse({
            ...validMessageApi,
            entity_refs: [
                validEntityRefApi,
                { entity_type: 'fa', entity_uuid: FA_UUID, label: 'FA-2026-001', slug: null, exists: false },
            ],
        });
        expect(result.entityRefs).toHaveLength(2);
        expect(result.entityRefs[0]).toMatchObject({ entityType: 'fsec', entityUuid: FSEC_UUID, exists: true });
        expect(result.entityRefs[1]).toMatchObject({
            entityType: 'fa',
            label: 'FA-2026-001',
            slug: null,
            exists: false,
        });
    });

    it('vaut editedAt/deletedAt null, isDeleted false, attachments [] quand les champs M4 sont absents', () => {
        const result = MessageSchema.parse(validMessageApi);
        expect(result.editedAt).toBeNull();
        expect(result.deletedAt).toBeNull();
        expect(result.isDeleted).toBe(false);
        expect(result.attachments).toEqual([]);
    });

    it('transforme edited_at, deleted_at, is_deleted et attachments', () => {
        const edited = MessageSchema.parse({ ...validMessageApi, edited_at: '2026-01-15T11:00:00Z' });
        expect(edited.editedAt).toBe('2026-01-15T11:00:00Z');
        expect(edited.deletedAt).toBeNull();

        const deleted = MessageSchema.parse({
            ...validMessageApi,
            body: '',
            deleted_at: '2026-01-16T09:00:00Z',
            is_deleted: true,
            attachments: [],
        });
        expect(deleted.isDeleted).toBe(true);
        expect(deleted.deletedAt).toBe('2026-01-16T09:00:00Z');
        expect(deleted.body).toBe('');

        const withFiles = MessageSchema.parse({
            ...validMessageApi,
            attachments: [validAttachmentApi, { ...validAttachmentApi, original_name: 'photo.png', is_image: true }],
        });
        expect(withFiles.attachments.map((a) => [a.originalName, a.isImage])).toEqual([
            ['rapport.pdf', false],
            ['photo.png', true],
        ]);
    });

    it('rejette une pièce jointe invalide, un edited_at non chaîne et un is_deleted non booléen', () => {
        expect(MessageSchema.safeParse({ ...validMessageApi, attachments: [{ uuid: 'x' }] }).success).toBe(false);
        expect(MessageSchema.safeParse({ ...validMessageApi, edited_at: 12 }).success).toBe(false);
        expect(MessageSchema.safeParse({ ...validMessageApi, is_deleted: 'non' }).success).toBe(false);
    });

    it('rejette une référence invalide dans entity_refs', () => {
        const invalid = { ...validMessageApi, entity_refs: [{ ...validEntityRefApi, entity_type: 'embase' }] };
        expect(MessageSchema.safeParse(invalid).success).toBe(false);
    });
});

describe('MentionSchema', () => {
    const validMentionApi = {
        message: { ...validMessageApi, entity_refs: [validEntityRefApi] },
        conversation: {
            uuid: CONV_UUID,
            kind: 'group',
            name: 'Projet Cryo',
            members: [validUserApi, { ...validUserApi, uuid: OTHER_UUID, username: 'mmartin' }],
        },
    };

    it('transforme le message et le contexte de conversation', () => {
        const result = MentionSchema.parse(validMentionApi);
        expect(result.message.uuid).toBe(MESSAGE_UUID);
        expect(result.message.entityRefs[0].entityUuid).toBe(FSEC_UUID);
        expect(result.conversation).toEqual({
            uuid: CONV_UUID,
            kind: 'group',
            name: 'Projet Cryo',
            members: [
                {
                    uuid: ME_UUID,
                    username: 'chef',
                    firstName: 'Pierre',
                    lastName: 'Dupont',
                    avatarUrl: '/media/avatars/chef.png',
                    isActive: true,
                },
                {
                    uuid: OTHER_UUID,
                    username: 'mmartin',
                    firstName: 'Pierre',
                    lastName: 'Dupont',
                    avatarUrl: '/media/avatars/chef.png',
                    isActive: true,
                },
            ],
        });
    });

    it('accepte une conversation privée sans name et rejette un kind inconnu', () => {
        const withoutName = omit(validMentionApi.conversation, 'name');
        expect(
            MentionSchema.parse({ ...validMentionApi, conversation: { ...withoutName, kind: 'direct' } }).conversation
                .name,
        ).toBe('');
        expect(
            MentionSchema.safeParse({
                ...validMentionApi,
                conversation: { ...validMentionApi.conversation, kind: 'channel' },
            }).success,
        ).toBe(false);
    });

    it('MentionsPageSchema transforme results', () => {
        const page = MentionsPageSchema.parse({ results: [validMentionApi, validMentionApi] });
        expect(page.results).toHaveLength(2);
        expect(page.results[1].conversation.uuid).toBe(CONV_UUID);
        expect(MentionsPageSchema.safeParse({}).success).toBe(false);
    });
});

describe('MessagePageSchema', () => {
    it('transforme results + has_more', () => {
        const result = MessagePageSchema.parse({ results: [validMessageApi], has_more: true });
        expect(result.hasMore).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].conversationUuid).toBe(CONV_UUID);
    });

    it('rejette une page sans has_more', () => {
        expect(MessagePageSchema.safeParse({ results: [] }).success).toBe(false);
    });

    it('expose updated ([] par défaut, messages transformés sinon, invalide rejeté)', () => {
        expect(MessagePageSchema.parse({ results: [], has_more: false }).updated).toEqual([]);
        const page = MessagePageSchema.parse({
            results: [],
            has_more: false,
            updated: [{ ...validMessageApi, edited_at: '2026-01-15T11:00:00Z' }],
        });
        expect(page.updated).toHaveLength(1);
        expect(page.updated[0].editedAt).toBe('2026-01-15T11:00:00Z');
        expect(page.updated[0].conversationUuid).toBe(CONV_UUID);
        expect(MessagePageSchema.safeParse({ results: [], has_more: false, updated: [{}] }).success).toBe(false);
    });
});

describe('ConversationSchema', () => {
    it('transforme le snake_case en camelCase (membres + aperçu)', () => {
        const result = ConversationSchema.parse(validConversationApi);
        expect(result.uuid).toBe(CONV_UUID);
        expect(result.kind).toBe('direct');
        expect(result.ownerUuid).toBe(ME_UUID);
        expect(result.lastMessageAt).toBe('2026-01-15T10:00:00Z');
        expect(result.unreadCount).toBe(2);
        expect(result.members).toHaveLength(2);
        expect(result.members[1].username).toBe('mmartin');
        expect(result.members[1].lastReadAt).toBeNull();
        expect(result.lastMessage?.body).toBe('Bonjour');
        expect(result.lastMessage?.authorUuid).toBe(ME_UUID);
    });

    it('accepte last_message_at et last_message à null, name absent', () => {
        const withoutName = Object.fromEntries(Object.entries(validConversationApi).filter(([key]) => key !== 'name'));
        const result = ConversationSchema.parse({ ...withoutName, last_message_at: null, last_message: null });
        expect(result.name).toBe('');
        expect(result.lastMessageAt).toBeNull();
        expect(result.lastMessage).toBeNull();
    });

    it('rejette un kind hors référentiel', () => {
        expect(ConversationSchema.safeParse({ ...validConversationApi, kind: 'channel' }).success).toBe(false);
    });

    it('ConversationListSchema valide un tableau', () => {
        expect(ConversationListSchema.parse([validConversationApi])).toHaveLength(1);
    });
});

describe('UnreadCountSchema', () => {
    it('transforme total_unread en totalUnread', () => {
        expect(UnreadCountSchema.parse({ total_unread: 7 })).toEqual({ totalUnread: 7 });
    });

    it('rejette un total non entier', () => {
        expect(UnreadCountSchema.safeParse({ total_unread: 1.5 }).success).toBe(false);
    });
});

describe('ConversationCreateSchema', () => {
    it('valide une conversation privée avec destinataire', () => {
        expect(ConversationCreateSchema.safeParse({ kind: 'direct', memberUuid: OTHER_UUID }).success).toBe(true);
    });

    it('refuse une privée sans destinataire valide (message FR)', () => {
        const result = ConversationCreateSchema.safeParse({ kind: 'direct', memberUuid: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Choisissez un destinataire');
        }
    });

    it('valide un groupe (nom strippé + membres)', () => {
        const result = ConversationCreateSchema.safeParse({
            kind: 'group',
            name: '  Projet Cryo  ',
            memberUuids: [OTHER_UUID],
        });
        expect(result.success).toBe(true);
        if (result.success && result.data.kind === 'group') {
            expect(result.data.name).toBe('Projet Cryo');
        }
    });

    it('refuse un groupe sans nom ou avec un nom trop long (messages FR)', () => {
        const empty = ConversationCreateSchema.safeParse({ kind: 'group', name: '   ', memberUuids: [] });
        expect(empty.success).toBe(false);
        if (!empty.success) {
            expect(empty.error.issues[0].message).toBe('Le nom du groupe est requis');
        }
        const tooLong = ConversationCreateSchema.safeParse({
            kind: 'group',
            name: 'a'.repeat(121),
            memberUuids: [],
        });
        expect(tooLong.success).toBe(false);
        if (!tooLong.success) {
            expect(tooLong.error.issues[0].message).toBe('Le nom ne doit pas dépasser 120 caractères');
        }
    });

    it('refuse un membre non uuid dans un groupe', () => {
        expect(ConversationCreateSchema.safeParse({ kind: 'group', name: 'G', memberUuids: ['x'] }).success).toBe(
            false,
        );
    });
});

describe('conversationCreateToApi', () => {
    it('mappe une privée vers member_uuids à un élément', () => {
        expect(conversationCreateToApi({ kind: 'direct', memberUuid: OTHER_UUID })).toEqual({
            kind: 'direct',
            member_uuids: [OTHER_UUID],
        });
    });

    it('mappe un groupe avec name + member_uuids', () => {
        expect(conversationCreateToApi({ kind: 'group', name: 'Projet', memberUuids: [OTHER_UUID, ME_UUID] })).toEqual({
            kind: 'group',
            name: 'Projet',
            member_uuids: [OTHER_UUID, ME_UUID],
        });
    });
});

describe('MessageBodySchema', () => {
    it('strippe les espaces', () => {
        expect(MessageBodySchema.parse('  Bonjour  ')).toBe('Bonjour');
    });

    it('refuse un message vide ou blanc', () => {
        const result = MessageBodySchema.safeParse('   ');
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Le message ne peut pas être vide');
        }
    });

    it('refuse un message de plus de 4000 caractères et accepte 4000', () => {
        const tooLong = MessageBodySchema.safeParse('a'.repeat(4001));
        expect(tooLong.success).toBe(false);
        if (!tooLong.success) {
            expect(tooLong.error.issues[0].message).toBe('Le message ne doit pas dépasser 4000 caractères');
        }
        expect(MessageBodySchema.safeParse('a'.repeat(4000)).success).toBe(true);
    });
});
