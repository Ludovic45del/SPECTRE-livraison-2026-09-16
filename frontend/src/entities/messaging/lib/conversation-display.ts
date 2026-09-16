/**
 * Helpers d'affichage d'une conversation (titre, initiales, propriétaire).
 * @module entities/messaging/lib
 *
 * Réimplémente localement le formatage « Prénom Nom » (sinon matricule) :
 * une entité ne peut pas importer `@entities/user` (frontière FSD).
 */

import type { Conversation, ConversationKind, UserSummary } from '../model';

type DisplayableUser = Pick<UserSummary, 'firstName' | 'lastName' | 'username'>;

/** Membre affichable : identifiant + nom (une `ConversationMember` comme un `UserSummary` conviennent). */
type DisplayableMember = DisplayableUser & Pick<UserSummary, 'uuid'>;

/**
 * Contexte minimal pour titrer une conversation : une `Conversation` complète
 * ou le contexte réduit porté par une mention (`{ kind, name, members }`).
 */
export interface ConversationTitleContext<TMember extends DisplayableMember = DisplayableMember> {
    readonly kind: ConversationKind;
    readonly name: string;
    readonly members: readonly TMember[];
}

/** Libellé de repli quand aucun titre ne peut être calculé. */
const FALLBACK_TITLE = 'Conversation';

/**
 * Formate un résumé utilisateur pour affichage : « Prénom Nom », ou le
 * matricule (username) si aucun nom n'est renseigné — jamais une chaîne vide.
 */
export function formatUserSummaryName(user: DisplayableUser): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.username;
}

/** Conversation privée : l'autre membre (≠ moi). Groupe : undefined. */
export function getOtherMember<TMember extends DisplayableMember>(
    conversation: ConversationTitleContext<TMember>,
    meUuid: string,
): TMember | undefined {
    if (conversation.kind !== 'direct') return undefined;
    return conversation.members.find((member) => member.uuid !== meUuid);
}

/** Titre affichable : nom de l'autre membre (privée) ou nom du groupe. */
export function getConversationTitle(conversation: ConversationTitleContext, meUuid: string): string {
    if (conversation.kind === 'group') {
        return conversation.name.trim() || FALLBACK_TITLE;
    }
    const other = getOtherMember(conversation, meUuid);
    return other ? formatUserSummaryName(other) : FALLBACK_TITLE;
}

/** Deux lettres majuscules dérivées du titre (initiales des 2 premiers mots, sinon 2 premières lettres). */
export function getConversationInitials(conversation: ConversationTitleContext, meUuid: string): string {
    const words = getConversationTitle(conversation, meUuid).split(/\s+/).filter(Boolean);
    const first = words[0] ?? '';
    const second = words[1];
    const initials = second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2);
    return initials.toUpperCase();
}

/** Vrai si l'utilisateur courant est propriétaire de la conversation. */
export function isConversationOwner(conversation: Conversation, meUuid: string): boolean {
    return conversation.ownerUuid === meUuid;
}
