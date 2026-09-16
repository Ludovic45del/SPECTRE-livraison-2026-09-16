/**
 * Messaging Constants — types de conversation, bornes de saisie, polling.
 * @module entities/messaging/model
 *
 * Source of Truth : backend module messaging (/api/v1/conversations/).
 */

/** Types de conversation : privée (2 membres) ou groupe nommé. */
export const CONVERSATION_KINDS = ['direct', 'group'] as const;
export type ConversationKind = (typeof CONVERSATION_KINDS)[number];

/** Types de message : texte d'un membre ou événement système (ajout, retrait, renommage…). */
export const MESSAGE_KINDS = ['text', 'system'] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

/** Longueur maximale du nom d'un groupe (contrainte backend). */
export const MAX_CONVERSATION_NAME_LENGTH = 120;

/** Longueur maximale du corps d'un message (contrainte backend). */
export const MAX_MESSAGE_LENGTH = 4000;

/** Taille d'une page de messages (curseur `before` / `after`). */
export const MESSAGE_PAGE_LIMIT = 50;

/** Intervalle de polling (liste, non-lus, nouveaux messages) — scope backend `messaging_poll`. */
export const POLLING_INTERVAL_MS = 5000;

/* ------------------------------------------------------------------ */
/*  Références d'entités attachées à un message (vague M3)             */
/* ------------------------------------------------------------------ */

/** Types d'entités référençables depuis un message (backend `VALID_ENTITY_REF_TYPES`). */
export const ENTITY_REF_TYPES = ['fsec', 'campaign', 'fa'] as const;
export type EntityRefType = (typeof ENTITY_REF_TYPES)[number];

/** Nombre maximal de références par message (contrainte backend). */
export const MAX_ENTITY_REFS_PER_MESSAGE = 10;

/** Libellés FR des types de référence (préfixe des chips, en-têtes du sélecteur). */
export const ENTITY_REF_TYPE_LABELS: Record<EntityRefType, string> = {
    fsec: 'FSEC',
    campaign: 'Campagne',
    fa: 'FA',
};

/** Nombre de mentions renvoyées par défaut par GET /conversations/mentions/ (backend `MENTIONS_DEFAULT_LIMIT`). */
export const MENTIONS_DEFAULT_LIMIT = 20;

/* ------------------------------------------------------------------ */
/*  Pièces jointes, édition / suppression, recherche (vague M4)        */
/* ------------------------------------------------------------------ */

/** Nombre maximal de pièces jointes par message (contrainte backend). */
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

/** Taille maximale d'une pièce jointe : 10 Mo (contrainte backend). */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Extensions autorisées (minuscules, sans point) — même liste que le backend. */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
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
] as const;
export type AllowedAttachmentExtension = (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number];

/** Extensions affichées en vignette image (sous-ensemble des extensions autorisées). */
export const IMAGE_ATTACHMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

/** Valeur `accept` d'un `<input type="file">` limité aux extensions autorisées (`.jpg,.jpeg,…`). */
export const ATTACHMENT_INPUT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Longueur minimale d'une recherche de messages (backend `SEARCH_MIN_LENGTH`). */
export const SEARCH_MIN_LENGTH = 2;

/** Longueur maximale d'une recherche de messages (backend `SEARCH_MAX_LENGTH`). */
export const SEARCH_MAX_LENGTH = 100;

/** Nombre de résultats renvoyés par défaut par GET /conversations/search/ (backend `SEARCH_DEFAULT_LIMIT`). */
export const SEARCH_DEFAULT_LIMIT = 20;
