/**
 * Message Time Tests — formats d'horodatage relatifs à « aujourd'hui ».
 * @module entities/messaging/lib
 */

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
    formatConversationTimestamp,
    formatDaySeparator,
    formatMessageFullDate,
    formatMessageTime,
    isSameDay,
} from './message-time';

/** Les chaînes sans fuseau sont interprétées en heure locale par dayjs : pas de dérive selon le TZ du runner. */
const TODAY_NOON = new Date(2026, 8, 9, 12, 0, 0); // mardi 9 septembre 2026

describe('message-time', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(TODAY_NOON);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('formatMessageTime', () => {
        it('formate en HH:mm', () => {
            expect(formatMessageTime('2026-09-09T14:05:00')).toBe('14:05');
            expect(formatMessageTime('2026-09-09T08:07:59')).toBe('08:07');
        });
    });

    describe('formatConversationTimestamp', () => {
        it('renvoie une chaîne vide pour null', () => {
            expect(formatConversationTimestamp(null)).toBe('');
        });

        it('HH:mm aujourd’hui', () => {
            expect(formatConversationTimestamp('2026-09-09T09:30:00')).toBe('09:30');
        });

        it('DD/MM la même année', () => {
            expect(formatConversationTimestamp('2026-03-02T10:00:00')).toBe('02/03');
            expect(formatConversationTimestamp('2026-09-08T23:59:00')).toBe('08/09');
        });

        it('DD/MM/YYYY une autre année', () => {
            expect(formatConversationTimestamp('2025-12-31T10:00:00')).toBe('31/12/2025');
        });
    });

    describe('formatMessageFullDate', () => {
        it('rend la date longue française avec l’heure (pour un attribut title)', () => {
            expect(formatMessageFullDate('2026-09-07T09:05:00')).toBe('lundi 7 septembre 2026 à 09:05');
        });
    });

    describe('formatDaySeparator', () => {
        it('« Aujourd’hui » et « Hier »', () => {
            expect(formatDaySeparator('2026-09-09T00:10:00')).toBe("Aujourd'hui");
            expect(formatDaySeparator('2026-09-08T23:50:00')).toBe('Hier');
        });

        it('date longue en français sinon', () => {
            expect(formatDaySeparator('2026-09-07T09:00:00')).toBe('Lundi 7 septembre 2026');
            expect(formatDaySeparator('2025-12-25T09:00:00')).toBe('Jeudi 25 décembre 2025');
        });
    });

    describe('isSameDay', () => {
        it('compare le jour local', () => {
            expect(isSameDay('2026-09-09T00:00:00', '2026-09-09T23:59:59')).toBe(true);
            expect(isSameDay('2026-09-09T23:59:59', '2026-09-10T00:00:00')).toBe(false);
        });
    });
});
