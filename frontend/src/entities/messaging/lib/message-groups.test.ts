/**
 * Message Groups Tests — regroupement par jour, ordre conservé.
 * @module entities/messaging/lib
 */

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { MessageSchema } from '../model';
import { groupMessagesByDay } from './message-groups';
import { createMockMessage } from '@test/mocks/messaging-handlers';

const message = (uuidSuffix: string, createdAt: string) =>
    MessageSchema.parse(
        createMockMessage({
            uuid: `aaaaaaaa-aaaa-4aaa-8aaa-${uuidSuffix.padStart(12, '0')}`,
            created_at: createdAt,
            updated_at: createdAt,
        }),
    );

describe('groupMessagesByDay', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 8, 9, 12, 0, 0)); // mardi 9 septembre 2026
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renvoie un tableau vide sans message', () => {
        expect(groupMessagesByDay([])).toEqual([]);
    });

    it('regroupe les messages consécutifs du même jour en conservant l’ordre', () => {
        const m1 = message('1', '2026-09-07T09:00:00');
        const m2 = message('2', '2026-09-07T18:30:00');
        const m3 = message('3', '2026-09-08T08:00:00');
        const m4 = message('4', '2026-09-09T11:00:00');

        const groups = groupMessagesByDay([m1, m2, m3, m4]);

        expect(groups.map((g) => g.dayKey)).toEqual(['2026-09-07', '2026-09-08', '2026-09-09']);
        expect(groups.map((g) => g.label)).toEqual(['Lundi 7 septembre 2026', 'Hier', "Aujourd'hui"]);
        expect(groups[0].messages.map((m) => m.uuid)).toEqual([m1.uuid, m2.uuid]);
        expect(groups[1].messages).toEqual([m3]);
        expect(groups[2].messages).toEqual([m4]);
    });

    it('ne fusionne pas deux séquences non contiguës du même jour (ordre d’entrée respecté)', () => {
        const a = message('1', '2026-09-07T09:00:00');
        const b = message('2', '2026-09-08T09:00:00');
        const c = message('3', '2026-09-07T10:00:00');

        const groups = groupMessagesByDay([a, b, c]);

        expect(groups).toHaveLength(3);
        expect(groups.flatMap((g) => g.messages.map((m) => m.uuid))).toEqual([a.uuid, b.uuid, c.uuid]);
    });
});
