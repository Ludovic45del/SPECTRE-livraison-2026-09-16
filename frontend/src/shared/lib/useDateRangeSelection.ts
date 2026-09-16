/**
 * useDateRangeSelection — machine à états pure pour la sélection d'une plage de
 * dates par clics successifs sur un calendrier (1er clic = début, 2e = fin).
 *
 * Aucune dépendance UI : 100% testable. Utilisée par {@link RangeCalendar}.
 * @module shared/lib
 */
import { useCallback, useState } from 'react';
import type { Dayjs } from 'dayjs';

export type RangePhase = 'idle' | 'picking-end';

export interface DateRange {
    start: Dayjs | null;
    end: Dayjs | null;
}

export interface DateRangeSelection extends DateRange {
    /** `picking-end` quand un début est posé et qu'on attend la date de fin. */
    phase: RangePhase;
    /** Pose le début (phase idle) ou la fin (phase picking-end, swap si antérieur). */
    handleDayClick: (day: Dayjs) => void;
    /** Réinitialise la sélection (plage vide). */
    reset: () => void;
    /** Force une plage explicite (ex. pré-remplissage d'une période existante). */
    setRange: (range: DateRange) => void;
}

export function useDateRangeSelection(initial?: DateRange): DateRangeSelection {
    const [start, setStart] = useState<Dayjs | null>(initial?.start ?? null);
    const [end, setEnd] = useState<Dayjs | null>(initial?.end ?? null);
    const [phase, setPhase] = useState<RangePhase>('idle');

    const handleDayClick = useCallback(
        (day: Dayjs) => {
            if (phase === 'picking-end' && start) {
                // 2e clic : complète la plage. Si antérieur au début, on permute.
                if (day.isBefore(start, 'day')) {
                    setStart(day);
                    setEnd(start);
                } else {
                    setEnd(day);
                }
                setPhase('idle');
            } else {
                // 1er clic (ou nouveau cycle) : pose le début, attend la fin.
                setStart(day);
                setEnd(null);
                setPhase('picking-end');
            }
        },
        [phase, start],
    );

    const reset = useCallback(() => {
        setStart(null);
        setEnd(null);
        setPhase('idle');
    }, []);

    const setRange = useCallback((range: DateRange) => {
        setStart(range.start);
        setEnd(range.end);
        setPhase('idle');
    }, []);

    return { start, end, phase, handleDayClick, reset, setRange };
}
