/**
 * Détection du déclencheur de mention `@` dans le composer.
 * @module features/messaging/lib
 */

export { MAX_ENTITY_REFS_MESSAGE } from './entity-refs';

/**
 * Déclencheur de mention : `@` en début de texte ou après un blanc, suivi du
 * filtre (sans blanc ni `@`), en fin de la valeur jusqu'au curseur.
 */
export const MENTION_TRIGGER_RE = /(^|\s)@([^\s@]*)$/;

/** Position du `@query` dans la valeur (`[start, end)`) et filtre courant. */
export interface MentionTrigger {
    readonly start: number;
    readonly end: number;
    readonly query: string;
}

/** Détecte un `@query` en cours de saisie juste avant le curseur, sinon null. */
export function detectMentionTrigger(value: string, caret: number): MentionTrigger | null {
    const match = MENTION_TRIGGER_RE.exec(value.slice(0, caret));
    if (!match) return null;
    return { start: match.index + match[1].length, end: caret, query: match[2] };
}

/** Retire `[start, end)` de la valeur (suppression du `@query` à la sélection). */
export function removeMentionTrigger(value: string, trigger: MentionTrigger): string {
    return `${value.slice(0, trigger.start)}${value.slice(trigger.end)}`;
}
