/**
 * Messaging MSW handlers & mock data factories for tests.
 *
 * Couvre les endpoints du module messaging (/api/v1/conversations/…) :
 *   - GET    /conversations/                                  (liste, triée last_message_at desc)
 *   - POST   /conversations/                                  (création : direct | group)
 *   - GET    /conversations/unread-count/                     ({total_unread})
 *   - GET    /conversations/:uuid/                            (détail)
 *   - PATCH  /conversations/:uuid/                            ({name})
 *   - DELETE /conversations/:uuid/
 *   - POST   /conversations/:uuid/members/                    ({member_uuids})
 *   - DELETE /conversations/:uuid/members/:memberUuid/        (200 conversation | 204 si je quitte)
 *   - POST   /conversations/:uuid/read/
 *   - GET    /conversations/mentions/?entity_type&entity_uuid&limit ({results: [mention…]})
 *   - GET    /conversations/:uuid/messages/?limit&before|after&updated_since
 *                                                             ({results, has_more, updated}, ordre chrono)
 *   - POST   /conversations/:uuid/messages/                   (JSON {body, entity_refs?} ou multipart
 *                                                             body + entity_refs (JSON) + attachments[])
 *   - PATCH  /conversations/:uuid/messages/:messageUuid/      ({body} → message édité)
 *   - DELETE /conversations/:uuid/messages/:messageUuid/      (200 message supprimé logiquement)
 *   - GET    /conversations/search/?q&limit                   ({results: [mention…]})
 *
 * IMPORTANT : les mocks renvoient du snake_case (format API brut) — la
 * transformation camelCase est faite par les schémas Zod côté client.
 * Aucun handler `GET /auth/me/` n'est enregistré par défaut : les tests qui
 * ont besoin de useMe() ajoutent `server.use(http.get('/api/v1/auth/me/', () =>
 * HttpResponse.json(createMockMeApi())))`.
 */
import { http, HttpResponse } from 'msw';

/* ------------------------------------------------------------------ */
/*  Polyfill jsdom : Blob.arrayBuffer / text / stream                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Factories (snake_case = format API brut)                           */
/* ------------------------------------------------------------------ */

/** Utilisateur courant des tests (même valeur que MOCK_OWNER_UUID de tasklist-handlers). */
export const MOCK_ME_UUID = '11111111-1111-1111-1111-111111111111';
/** Autre membre par défaut d'une conversation privée. */
export const MOCK_OTHER_UUID = '22222222-2222-2222-2222-222222222222';

export const createMockUserSummary = (overrides: Record<string, unknown> = {}) => ({
    uuid: MOCK_ME_UUID,
    username: 'chef',
    first_name: 'Pierre',
    last_name: 'Dupont',
    avatar_url: null as string | null,
    is_active: true,
    ...overrides,
});

/** Résumé de l'autre membre par défaut (Marie Martin). */
const createMockOtherUserSummary = (overrides: Record<string, unknown> = {}) =>
    createMockUserSummary({
        uuid: MOCK_OTHER_UUID,
        username: 'mmartin',
        first_name: 'Marie',
        last_name: 'Martin',
        ...overrides,
    });

export const createMockConversationMember = (overrides: Record<string, unknown> = {}) => ({
    ...createMockUserSummary(),
    joined_at: new Date().toISOString(),
    last_read_at: null as string | null,
    ...overrides,
});

/** Référence d'entité résolue (format API brut) telle que renvoyée sur un message. */
export const createMockEntityRef = (overrides: Record<string, unknown> = {}) => ({
    entity_type: 'fsec' as string,
    entity_uuid: crypto.randomUUID() as string,
    label: 'FSEC-12',
    slug: 'fsec-12' as string | null,
    exists: true,
    ...overrides,
});

type MockEntityRef = ReturnType<typeof createMockEntityRef>;

/** Référence brute reçue dans le corps de POST messages/ ({entity_type, entity_uuid}). */
interface RawEntityRefInput {
    entity_type?: unknown;
    entity_uuid?: unknown;
}

/** « Résolution » des références du corps : label `Réf <type>`, slug `slug-<type>`, exists true. */
const resolveEntityRefs = (raw: unknown): MockEntityRef[] =>
    Array.isArray(raw)
        ? (raw as RawEntityRefInput[]).map((ref) =>
              createMockEntityRef({
                  entity_type: String(ref.entity_type),
                  entity_uuid: String(ref.entity_uuid),
                  label: `Réf ${String(ref.entity_type)}`,
                  slug: `slug-${String(ref.entity_type)}`,
                  exists: true,
              }),
          )
        : [];

/** Extensions rendues en vignette image (même règle que le backend `IMAGE_ATTACHMENT_EXTENSIONS`). */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const extensionOf = (name: string) => {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Préfixe des URL de pièces jointes mockées (le vrai backend sert `/api/media/messaging/attachments/<hex>/<nom>`). */
export const MOCK_ATTACHMENT_URL_PREFIX = '/api/media/messaging/attachments/mock/';

/** Pièce jointe (format API brut) — par défaut un PDF de 12 Ko. */
export const createMockAttachment = (overrides: Record<string, unknown> = {}) => {
    const originalName = typeof overrides.original_name === 'string' ? overrides.original_name : 'rapport.pdf';
    return {
        uuid: crypto.randomUUID(),
        original_name: originalName,
        content_type: 'application/pdf',
        size: 12 * 1024,
        url: `${MOCK_ATTACHMENT_URL_PREFIX}${encodeURIComponent(originalName)}` as string | null,
        is_image: IMAGE_EXTENSIONS.includes(extensionOf(originalName)),
        ...overrides,
    };
};

type MockAttachment = ReturnType<typeof createMockAttachment>;

export const createMockMessage = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    conversation_uuid: crypto.randomUUID(),
    author_uuid: MOCK_ME_UUID as string | null,
    author: createMockUserSummary() as ReturnType<typeof createMockUserSummary> | null,
    kind: 'text',
    body: 'Bonjour',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    entity_refs: [] as MockEntityRef[],
    edited_at: null as string | null,
    deleted_at: null as string | null,
    is_deleted: false,
    attachments: [] as MockAttachment[],
    ...overrides,
});

type MockMessage = ReturnType<typeof createMockMessage>;

/** Aperçu (`last_message`) dérivé d'un message complet. */
const toPreview = (message: MockMessage) => ({
    uuid: message.uuid,
    author_uuid: message.author_uuid,
    kind: message.kind,
    body: message.body.slice(0, 200),
    created_at: message.created_at,
    updated_at: message.updated_at,
    entity_ref_count: message.entity_refs.length,
    is_deleted: message.is_deleted,
    attachment_count: message.attachments.length,
});

type MockMessagePreview = ReturnType<typeof toPreview>;

export const createMockConversation = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    kind: 'direct',
    name: '',
    owner_uuid: MOCK_ME_UUID,
    last_message_at: null as string | null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: [createMockConversationMember(), createMockConversationMember(createMockOtherUserSummary())] as ReturnType<
        typeof createMockConversationMember
    >[],
    unread_count: 0,
    last_message: null as MockMessagePreview | null,
    ...overrides,
});

type MockConversation = ReturnType<typeof createMockConversation>;

/** Contexte de conversation porté par une mention (membres = résumés utilisateur, sans dates). */
const toMentionConversation = (conversation: MockConversation) => ({
    uuid: conversation.uuid,
    kind: conversation.kind,
    name: conversation.name,
    members: conversation.members.map(({ joined_at: _joinedAt, last_read_at: _lastReadAt, ...summary }) => summary),
});

/**
 * Mention (résultat de GET /conversations/mentions/) : message + contexte de
 * conversation. Par défaut un message privé moi ↔ Marie Martin avec une
 * référence FSEC.
 */
export const createMockMention = (overrides: { message?: MockMessage; conversation?: MockConversation } = {}) => {
    const conversation = overrides.conversation ?? createMockConversation();
    const message =
        overrides.message ??
        createMockMessage({ conversation_uuid: conversation.uuid, entity_refs: [createMockEntityRef()] });
    return { message, conversation: toMentionConversation(conversation) };
};

/** Réponse de GET /auth/me/ pour l'utilisateur courant des tests (uuid = MOCK_ME_UUID). */
export const createMockMeApi = (overrides: Record<string, unknown> = {}) => ({
    uuid: MOCK_ME_UUID,
    username: 'chef',
    first_name: 'Pierre',
    last_name: 'Dupont',
    roles: ['chef_labo'],
    role: 'chef_labo',
    permission_group: 'admin',
    laboratoire: 'LMJ',
    service: 'SEPI',
    numero: '',
    bureau: '',
    avatar_url: null,
    signature_url: null,
    is_active: true,
    force_password_change: false,
    last_login: null,
    created_at: null,
    updated_at: null,
    ...overrides,
});

/** Membres d'une conversation créée : moi + un membre générique par uuid demandé. */
const membersFromUuids = (memberUuids: string[]) => [
    createMockConversationMember(),
    ...memberUuids
        .filter((uuid) => uuid !== MOCK_ME_UUID)
        .map((uuid, index) =>
            createMockConversationMember(
                uuid === MOCK_OTHER_UUID
                    ? createMockOtherUserSummary()
                    : { uuid, username: `membre${index + 1}`, first_name: 'Membre', last_name: String(index + 1) },
            ),
        ),
];

/** Construit une conversation à partir du corps de POST /conversations/. */
const conversationFromCreateBody = (body: Record<string, unknown>) =>
    createMockConversation({
        kind: body.kind ?? 'direct',
        name: typeof body.name === 'string' ? body.name : '',
        members: membersFromUuids(Array.isArray(body.member_uuids) ? (body.member_uuids as string[]) : []),
    });

/* ------------------------------------------------------------------ */
/*  Corps de POST messages/ : JSON ou multipart (pièces jointes)        */
/* ------------------------------------------------------------------ */

/**
 * Fichier tel que restitué par `request.formData()` : un `FileLike` d'undici,
 * pas forcément `instanceof File` (jsdom) — on se fie à la présence de `name`.
 */
const isUploadedFile = (value: FormDataEntryValue): value is File =>
    typeof value === 'object' && value !== null && typeof (value as File).name === 'string';

interface PostMessageBody {
    body: string;
    entity_refs: unknown;
    attachments: MockAttachment[];
}

/** Erreur 400 au format du backend. */
const badRequest = (error: string) =>
    HttpResponse.json({ error, type: 'ValidationException', code: 'VALIDATION_ERROR', status: 400 }, { status: 400 });

/**
 * Lit le corps d'un POST messages/ : JSON (`{body, entity_refs?}`) ou, si le
 * Content-Type est multipart, `request.formData()` — `body` (chaîne),
 * `entity_refs` (chaîne JSON, 400 si invalide), `attachments` (fichiers,
 * exposés avec `url` sous MOCK_ATTACHMENT_URL_PREFIX, `is_image` d'après
 * l'extension, `size` du fichier).
 */
async function readPostMessageBody(request: Request): Promise<PostMessageBody | Response> {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
        const json = (await request.json()) as { body?: unknown; entity_refs?: unknown };
        return { body: typeof json.body === 'string' ? json.body : '', entity_refs: json.entity_refs, attachments: [] };
    }
    const form = await request.formData();
    const rawBody = form.get('body');
    const rawRefs = form.get('entity_refs');
    let entityRefs: unknown = undefined;
    if (typeof rawRefs === 'string') {
        try {
            entityRefs = JSON.parse(rawRefs);
        } catch {
            return badRequest('entity_refs : JSON invalide');
        }
    }
    const attachments = form
        .getAll('attachments')
        .filter(isUploadedFile)
        .map((file) =>
            createMockAttachment({
                original_name: file.name,
                content_type: file.type || 'application/octet-stream',
                size: file.size,
            }),
        );
    return { body: typeof rawBody === 'string' ? rawBody : '', entity_refs: entityRefs, attachments };
}

/** Applique une édition (corps + edited_at + updated_at) à un message mocké. */
const applyEdit = (message: MockMessage, body: string) => {
    const now = new Date().toISOString();
    message.body = body;
    message.edited_at = now;
    message.updated_at = now;
    return message;
};

/** Applique la suppression logique (corps vide, refs et pièces jointes retirées) à un message mocké. */
const applySoftDelete = (message: MockMessage) => {
    const now = new Date().toISOString();
    message.body = '';
    message.deleted_at = now;
    message.is_deleted = true;
    message.entity_refs = [];
    message.attachments = [];
    message.updated_at = now;
    return message;
};

/** Bornes de la recherche (backend SEARCH_MIN_LENGTH / SEARCH_MAX_LENGTH / SEARCH_MAX_LIMIT). */
const SEARCH_MIN = 2;
const SEARCH_MAX = 100;
const SEARCH_MAX_LIMIT = 50;

/** Valide `q` et `limit` de GET search/ — renvoie la réponse 400 ou les paramètres normalisés. */
const parseSearchParams = (request: Request): { q: string; limit: number } | Response => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (q.length < SEARCH_MIN || q.length > SEARCH_MAX) return badRequest('q : longueur invalide');
    const limit = Number(url.searchParams.get('limit') ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_LIMIT) return badRequest('limit invalide');
    return { q, limit };
};

/* ------------------------------------------------------------------ */
/*  Default handlers — stateless (liste vide + 404 sur les détails)     */
/* ------------------------------------------------------------------ */

/** Default messaging handlers — pas d'état partagé entre tests. */
export const messagingHandlers = [
    http.get('/api/v1/conversations/', () => HttpResponse.json([])),
    http.post('/api/v1/conversations/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(conversationFromCreateBody(body), { status: 201 });
    }),
    // Routes fixes et imbriquées AVANT le catch-all :uuid.
    http.get('/api/v1/conversations/unread-count/', () => HttpResponse.json({ total_unread: 0 })),
    http.get('/api/v1/conversations/mentions/', () => HttpResponse.json({ results: [] })),
    http.get('/api/v1/conversations/search/', ({ request }) => {
        const parsed = parseSearchParams(request);
        return parsed instanceof Response ? parsed : HttpResponse.json({ results: [] });
    }),
    http.get('/api/v1/conversations/:uuid/messages/', () =>
        HttpResponse.json({ results: [], has_more: false, updated: [] }),
    ),
    http.post('/api/v1/conversations/:uuid/messages/', async ({ params, request }) => {
        const parsed = await readPostMessageBody(request);
        if (parsed instanceof Response) return parsed;
        return HttpResponse.json(
            createMockMessage({
                conversation_uuid: params.uuid as string,
                body: parsed.body,
                entity_refs: resolveEntityRefs(parsed.entity_refs),
                attachments: parsed.attachments,
            }),
            { status: 201 },
        );
    }),
    // Édition / suppression logique — renvoient le message modifié (auteur = moi).
    http.patch('/api/v1/conversations/:uuid/messages/:messageUuid/', async ({ params, request }) => {
        const body = (await request.json()) as { body?: unknown };
        const message = createMockMessage({ uuid: params.messageUuid as string, conversation_uuid: params.uuid });
        return HttpResponse.json(applyEdit(message, typeof body.body === 'string' ? body.body : ''));
    }),
    http.delete('/api/v1/conversations/:uuid/messages/:messageUuid/', ({ params }) => {
        const message = createMockMessage({ uuid: params.messageUuid as string, conversation_uuid: params.uuid });
        return HttpResponse.json(applySoftDelete(message));
    }),
    http.post('/api/v1/conversations/:uuid/read/', ({ params }) =>
        HttpResponse.json(createMockConversation({ uuid: params.uuid as string })),
    ),
    http.post('/api/v1/conversations/:uuid/members/', async ({ params, request }) => {
        const body = (await request.json()) as { member_uuids?: string[] };
        return HttpResponse.json(
            createMockConversation({
                uuid: params.uuid as string,
                kind: 'group',
                name: 'Groupe',
                members: membersFromUuids(body.member_uuids ?? []),
            }),
        );
    }),
    http.delete('/api/v1/conversations/:uuid/members/:memberUuid/', () => new HttpResponse(null, { status: 204 })),
    http.get('/api/v1/conversations/:uuid/', () => new HttpResponse(null, { status: 404 })),
    http.patch('/api/v1/conversations/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockConversation({ uuid: params.uuid as string, kind: 'group', ...body }));
    }),
    http.delete('/api/v1/conversations/:uuid/', () => new HttpResponse(null, { status: 204 })),
];

/* ------------------------------------------------------------------ */
/*  Handlers avec données injectées — état local mutable par test      */
/* ------------------------------------------------------------------ */

export interface MessagingHandlersData {
    conversations?: MockConversation[];
    messages?: MockMessage[];
}

/** Ordre chronologique (created_at, uuid) — même tri que le backend. */
const compareMessages = (a: MockMessage, b: MockMessage) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.uuid < b.uuid ? -1 : a.uuid > b.uuid ? 1 : 0;
};

/** Liste : last_message_at desc, nulls en dernier. */
const compareConversations = (a: MockConversation, b: MockConversation) => {
    if (a.last_message_at === b.last_message_at) return 0;
    if (a.last_message_at === null) return 1;
    if (b.last_message_at === null) return -1;
    return a.last_message_at < b.last_message_at ? 1 : -1;
};

/**
 * Messaging handlers avec un jeu de données spécifique. L'état est LOCAL à
 * l'appel (copies) et mute au fil des mutations : après invalidation TanStack,
 * les refetch reflètent les envois/lectures/ajouts du test.
 *
 * NOTE : `GET messages` implémente limit/before/after sur l'ordre
 * (created_at, uuid) avec `has_more` correct ; `unread-count` est la somme
 * des `unread_count` ; retirer MOCK_ME_UUID d'un groupe = le quitter (204) ;
 * `GET mentions` filtre les messages du jeu dont `entity_refs` contient la
 * cible (conversations du jeu uniquement), du plus récent au plus ancien.
 * Vague M4 : `GET messages` accepte `updated_since` (seul ou avec `after`,
 * 400 avec `before`) et renvoie dans `updated` les messages de la conversation
 * dont `updated_at > updated_since` absents de `results` ; `POST messages`
 * accepte le multipart (voir `readPostMessageBody`) et exige un corps non vide
 * OU au moins une pièce jointe (400 sinon) ; `PATCH messages/:m/` : auteur
 * uniquement (403), message supprimé ou système ⇒ 400 ; `DELETE messages/:m/` :
 * suppression logique par l'auteur ou le propriétaire du groupe (403 sinon),
 * idempotente ; `GET search/` : `icontains` sur `body`, messages texte non
 * supprimés des conversations du jeu, du plus récent au plus ancien.
 */
export function messagingHandlersWithData(data: MessagingHandlersData) {
    let conversations: MockConversation[] = (data.conversations ?? []).map((c) => ({
        ...c,
        members: c.members.map((m) => ({ ...m })),
    }));
    let messages: MockMessage[] = (data.messages ?? []).map((m) => ({ ...m }));

    const findConversation = (uuid: string | readonly string[] | undefined) =>
        conversations.find((c) => c.uuid === uuid);
    const messagesOf = (conversationUuid: string) =>
        messages.filter((m) => m.conversation_uuid === conversationUuid).sort(compareMessages);

    return [
        http.get('/api/v1/conversations/', () => HttpResponse.json([...conversations].sort(compareConversations))),
        http.post('/api/v1/conversations/', async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const created = conversationFromCreateBody(body);
            conversations.push(created);
            return HttpResponse.json(created, { status: 201 });
        }),
        http.get('/api/v1/conversations/unread-count/', () =>
            HttpResponse.json({ total_unread: conversations.reduce((sum, c) => sum + c.unread_count, 0) }),
        ),
        // Mentions — route fixe AVANT le catch-all :uuid.
        http.get('/api/v1/conversations/mentions/', ({ request }) => {
            const url = new URL(request.url);
            const entityType = url.searchParams.get('entity_type');
            const entityUuid = url.searchParams.get('entity_uuid');
            if (!entityType || !entityUuid) return new HttpResponse(null, { status: 400 });
            const limit = Number(url.searchParams.get('limit') ?? 20);
            const results = messages
                .filter((m) => m.entity_refs.some((r) => r.entity_type === entityType && r.entity_uuid === entityUuid))
                .map((m) => ({ message: m, conversation: findConversation(m.conversation_uuid) }))
                .filter((entry): entry is { message: MockMessage; conversation: MockConversation } =>
                    Boolean(entry.conversation),
                )
                .sort((a, b) => compareMessages(b.message, a.message))
                .slice(0, limit)
                .map(({ message, conversation }) => ({ message, conversation: toMentionConversation(conversation) }));
            return HttpResponse.json({ results });
        }),
        // Recherche — route fixe AVANT le catch-all :uuid.
        http.get('/api/v1/conversations/search/', ({ request }) => {
            const parsed = parseSearchParams(request);
            if (parsed instanceof Response) return parsed;
            const needle = parsed.q.toLowerCase();
            const results = messages
                .filter((m) => m.kind === 'text' && !m.is_deleted && m.body.toLowerCase().includes(needle))
                .map((m) => ({ message: m, conversation: findConversation(m.conversation_uuid) }))
                .filter((entry): entry is { message: MockMessage; conversation: MockConversation } =>
                    Boolean(entry.conversation),
                )
                .sort((a, b) => compareMessages(b.message, a.message))
                .slice(0, parsed.limit)
                .map(({ message, conversation }) => ({ message, conversation: toMentionConversation(conversation) }));
            return HttpResponse.json({ results });
        }),
        // Messages — pagination par curseur (+ `updated_since` : éditions / suppressions).
        http.get('/api/v1/conversations/:uuid/messages/', ({ params, request }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            const url = new URL(request.url);
            const limit = Number(url.searchParams.get('limit') ?? 50);
            const before = url.searchParams.get('before');
            const after = url.searchParams.get('after');
            const updatedSince = url.searchParams.get('updated_since');
            if (before && (after || updatedSince)) return new HttpResponse(null, { status: 400 });

            const all = messagesOf(conversation.uuid);
            let candidates: MockMessage[];
            let results: MockMessage[];
            if (before) {
                const index = all.findIndex((m) => m.uuid === before);
                if (index < 0) return new HttpResponse(null, { status: 404 });
                candidates = all.slice(0, index);
                results = candidates.slice(-limit);
            } else if (after) {
                const index = all.findIndex((m) => m.uuid === after);
                if (index < 0) return new HttpResponse(null, { status: 404 });
                candidates = all.slice(index + 1);
                results = candidates.slice(0, limit);
            } else {
                candidates = all;
                results = candidates.slice(-limit);
            }
            const sinceIso = updatedSince ? new Date(updatedSince).toISOString() : null;
            const resultUuids = new Set(results.map((m) => m.uuid));
            // Comme le backend : avec `after`, seuls les messages au plus tard au curseur
            // sont candidats (les plus récents relèvent de `results` / `has_more`).
            const afterIndex = after ? all.findIndex((m) => m.uuid === after) : -1;
            const updatable = afterIndex >= 0 ? all.slice(0, afterIndex + 1) : all;
            const updated = sinceIso
                ? updatable.filter((m) => m.updated_at > sinceIso && !resultUuids.has(m.uuid))
                : [];
            return HttpResponse.json({ results, has_more: candidates.length > limit, updated });
        }),
        http.post('/api/v1/conversations/:uuid/messages/', async ({ params, request }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            const parsed = await readPostMessageBody(request);
            if (parsed instanceof Response) return parsed;
            if (parsed.body.trim() === '' && parsed.attachments.length === 0) {
                return badRequest('Le message ne peut pas être vide');
            }
            const now = new Date().toISOString();
            const created = createMockMessage({
                conversation_uuid: conversation.uuid,
                body: parsed.body,
                created_at: now,
                updated_at: now,
                entity_refs: resolveEntityRefs(parsed.entity_refs),
                attachments: parsed.attachments,
            });
            messages.push(created);
            conversation.last_message = toPreview(created);
            conversation.last_message_at = created.created_at;
            return HttpResponse.json(created, { status: 201 });
        }),
        // Édition (auteur uniquement) / suppression logique (auteur ou propriétaire du groupe).
        http.patch('/api/v1/conversations/:uuid/messages/:messageUuid/', async ({ params, request }) => {
            const conversation = findConversation(params.uuid);
            const message = messages.find((m) => m.uuid === params.messageUuid);
            if (!conversation || !message || message.conversation_uuid !== conversation.uuid) {
                return new HttpResponse(null, { status: 404 });
            }
            if (message.is_deleted) return badRequest('Message supprimé');
            if (message.kind !== 'text') return badRequest('Message système non modifiable');
            if (message.author_uuid !== MOCK_ME_UUID) {
                return HttpResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
            }
            const body = (await request.json()) as { body?: unknown };
            const nextBody = typeof body.body === 'string' ? body.body.trim() : '';
            if (!nextBody) return badRequest('Le message ne peut pas être vide');
            if (nextBody !== message.body) applyEdit(message, nextBody);
            if (conversation.last_message?.uuid === message.uuid) conversation.last_message = toPreview(message);
            return HttpResponse.json(message);
        }),
        http.delete('/api/v1/conversations/:uuid/messages/:messageUuid/', ({ params }) => {
            const conversation = findConversation(params.uuid);
            const message = messages.find((m) => m.uuid === params.messageUuid);
            if (!conversation || !message || message.conversation_uuid !== conversation.uuid) {
                return new HttpResponse(null, { status: 404 });
            }
            if (message.is_deleted) return HttpResponse.json(message);
            if (message.kind !== 'text') return badRequest('Message système non supprimable');
            const isAuthor = message.author_uuid === MOCK_ME_UUID;
            const isGroupOwner = conversation.kind === 'group' && conversation.owner_uuid === MOCK_ME_UUID;
            if (!isAuthor && !isGroupOwner) {
                return HttpResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
            }
            applySoftDelete(message);
            if (conversation.last_message?.uuid === message.uuid) conversation.last_message = toPreview(message);
            return HttpResponse.json(message);
        }),
        // Lecture.
        http.post('/api/v1/conversations/:uuid/read/', ({ params }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            conversation.unread_count = 0;
            return HttpResponse.json(conversation);
        }),
        // Membres — routes imbriquées avant :uuid.
        http.post('/api/v1/conversations/:uuid/members/', async ({ params, request }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as { member_uuids?: string[] };
            const requested = body.member_uuids ?? [];
            if (requested.some((uuid) => conversation.members.some((m) => m.uuid === uuid))) {
                return HttpResponse.json({ error: 'Membre déjà présent', code: 'CONFLICT' }, { status: 409 });
            }
            for (const member of membersFromUuids(requested).slice(1)) {
                conversation.members.push(member);
            }
            return HttpResponse.json(conversation);
        }),
        http.delete('/api/v1/conversations/:uuid/members/:memberUuid/', ({ params }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            if (params.memberUuid === MOCK_ME_UUID) {
                conversations = conversations.filter((c) => c.uuid !== conversation.uuid);
                messages = messages.filter((m) => m.conversation_uuid !== conversation.uuid);
                return new HttpResponse(null, { status: 204 });
            }
            conversation.members = conversation.members.filter((m) => m.uuid !== params.memberUuid);
            return HttpResponse.json(conversation);
        }),
        // Détail / patch / delete (catch-all :uuid en dernier).
        http.get('/api/v1/conversations/:uuid/', ({ params }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            return HttpResponse.json(conversation);
        }),
        http.patch('/api/v1/conversations/:uuid/', async ({ params, request }) => {
            const conversation = findConversation(params.uuid);
            if (!conversation) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as { name?: string };
            if (body.name !== undefined) conversation.name = body.name;
            return HttpResponse.json(conversation);
        }),
        http.delete('/api/v1/conversations/:uuid/', ({ params }) => {
            conversations = conversations.filter((c) => c.uuid !== params.uuid);
            messages = messages.filter((m) => m.conversation_uuid !== params.uuid);
            return new HttpResponse(null, { status: 204 });
        }),
    ];
}
