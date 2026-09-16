/**
 * Regroupement des messages par jour (séparateurs du fil de discussion).
 * @module entities/messaging/lib
 */

import dayjs from 'dayjs';
import type { Message } from '../model';
import { formatDaySeparator } from './message-time';

export interface MessageDayGroup {
    /** Clé stable `YYYY-MM-DD` (fuseau local) — utilisable comme `key` React. */
    dayKey: string;
    /** Libellé du séparateur (« Aujourd'hui », « Hier », date longue). */
    label: string;
    messages: Message[];
}

/**
 * Regroupe des messages (déjà en ordre chronologique) par jour, en conservant
 * l'ordre d'entrée : un nouveau groupe démarre dès que le jour change.
 */
export function groupMessagesByDay(messages: Message[]): MessageDayGroup[] {
    const groups: MessageDayGroup[] = [];
    for (const message of messages) {
        const dayKey = dayjs(message.createdAt).format('YYYY-MM-DD');
        const last = groups[groups.length - 1];
        if (last && last.dayKey === dayKey) {
            last.messages.push(message);
        } else {
            groups.push({ dayKey, label: formatDaySeparator(message.createdAt), messages: [message] });
        }
    }
    return groups;
}
