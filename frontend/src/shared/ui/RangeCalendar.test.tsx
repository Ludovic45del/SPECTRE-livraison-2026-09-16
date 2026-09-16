/**
 * Tests d'intégration de RangeCalendar (sélection de plage par clics).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { setup } from '@test/test-utils';
import { RangeCalendar } from './RangeCalendar';
import type { DateRange } from '../lib/useDateRangeSelection';

/** Clique le bouton-jour dont le numéro est `n` (les jours hors mois ne sont pas rendus). */
async function clickDay(user: ReturnType<typeof setup>['user'], n: number) {
    const btn = screen.getAllByRole('gridcell').find((b) => b.textContent === String(n));
    expect(btn, `bouton jour ${n} introuvable`).toBeTruthy();
    await user.click(btn!);
}

/** Seed sur un jour de mai 2026 → le calendrier affiche mai 2026 de façon déterministe. */
const seed: DateRange = { start: dayjs('2026-05-15'), end: dayjs('2026-05-15') };
const iso = (d: DateRange) => ({
    start: d.start?.format('YYYY-MM-DD') ?? null,
    end: d.end?.format('YYYY-MM-DD') ?? null,
});

describe('RangeCalendar', () => {
    it('first click sets start, second click sets end', async () => {
        const onChange = vi.fn();
        const { user } = setup(<RangeCalendar value={seed} onChange={onChange} accentColor="#007AFF" />);

        await clickDay(user, 7);
        expect(iso(onChange.mock.lastCall![0])).toEqual({ start: '2026-05-07', end: null });

        await clickDay(user, 9);
        expect(iso(onChange.mock.lastCall![0])).toEqual({ start: '2026-05-07', end: '2026-05-09' });
    });

    it('swaps when the second click precedes the first', async () => {
        const onChange = vi.fn();
        const { user } = setup(<RangeCalendar value={seed} onChange={onChange} accentColor="#007AFF" />);

        await clickDay(user, 20);
        await clickDay(user, 10);
        expect(iso(onChange.mock.lastCall![0])).toEqual({ start: '2026-05-10', end: '2026-05-20' });
    });

    it('shows a textual summary of the selected range', async () => {
        const { user } = setup(<RangeCalendar value={seed} onChange={vi.fn()} accentColor="#007AFF" />);
        await clickDay(user, 7);
        expect(screen.getByText(/cliquez la date de fin/i)).toBeInTheDocument();
        await clickDay(user, 9);
        expect(screen.getByText('Du 07/05/2026 au 09/05/2026')).toBeInTheDocument();
    });
});
