/**
 * Formatage des horodatages de la messagerie (dayjs, locale fr).
 * @module entities/messaging/lib
 */

import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const LOCALE = 'fr';

/** Heure d'un message : `HH:mm`. */
export function formatMessageTime(iso: string): string {
    return dayjs(iso).format('HH:mm');
}

/**
 * Horodatage compact d'une conversation (liste) :
 * `''` si null, `HH:mm` aujourd'hui, `DD/MM` la même année, `DD/MM/YYYY` sinon.
 */
export function formatConversationTimestamp(iso: string | null): string {
    if (!iso) return '';
    const date = dayjs(iso);
    const now = dayjs();
    if (date.isSame(now, 'day')) return date.format('HH:mm');
    if (date.isSame(now, 'year')) return date.format('DD/MM');
    return date.format('DD/MM/YYYY');
}

/** Première lettre en majuscule, le reste inchangé (« mardi 9 septembre » → « Mardi 9 septembre »). */
function capitalizeFirst(value: string): string {
    return value.charAt(0).toLocaleUpperCase('fr') + value.slice(1);
}

/** Date complète d'un message pour l'attribut `title` : « mardi 9 septembre 2026 à 14:05 ». */
export function formatMessageFullDate(iso: string): string {
    return dayjs(iso).locale(LOCALE).format('dddd D MMMM YYYY à HH:mm');
}

/**
 * Libellé d'un séparateur de jour : « Aujourd'hui », « Hier », sinon la date
 * longue avec seule la première lettre en majuscule (« Mardi 9 septembre 2026 » —
 * en français, ni le jour ni le mois ne prennent de majuscule en cours de phrase).
 */
export function formatDaySeparator(iso: string): string {
    const date = dayjs(iso);
    const today = dayjs();
    if (date.isSame(today, 'day')) return "Aujourd'hui";
    if (date.isSame(today.subtract(1, 'day'), 'day')) return 'Hier';
    return capitalizeFirst(date.locale(LOCALE).format('dddd D MMMM YYYY'));
}

/** Vrai si les deux instants tombent le même jour (fuseau local). */
export function isSameDay(a: string, b: string): boolean {
    return dayjs(a).isSame(dayjs(b), 'day');
}
