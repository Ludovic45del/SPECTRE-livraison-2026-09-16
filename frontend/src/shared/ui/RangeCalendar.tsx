/**
 * RangeCalendar — calendrier mensuel (DateCalendar Community) en mode sélection
 * de plage : 1er clic = début, 2e clic = fin, l'intervalle se surligne.
 *
 * Pas de DateRangeCalendar (Pro/payant, absent du projet) : on s'appuie sur le
 * DateCalendar Community + un slot `day` custom ({@link createRangeDay}) piloté
 * par la machine à états pure {@link useDateRangeSelection}. Un récap texte sous
 * le calendrier compense la perte de la saisie clavier des anciens DatePicker.
 * @module shared/ui
 */
import { useEffect, useMemo, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { type Dayjs } from 'dayjs';
import { useDateRangeSelection, type DateRange } from '../lib/useDateRangeSelection';
import { createRangeDay } from './RangeDay';

export interface RangeCalendarProps {
    /** Plage initiale (seed). Le composant gère ensuite sa propre sélection. */
    value: DateRange;
    /** Notifié à chaque changement de plage (fin nulle = plage incomplète). */
    onChange: (range: DateRange) => void;
    /** Couleur d'accent des extrémités/intervalle. */
    accentColor: string;
    /** Date minimale sélectionnable. */
    minDate?: Dayjs;
}

export function RangeCalendar({ value, onChange, accentColor, minDate }: RangeCalendarProps) {
    const { start, end, phase, handleDayClick } = useDateRangeSelection(value);

    // onChange dans une ref pour ne pas relancer l'effet si le parent passe une
    // fonction inline (identité instable).
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    useEffect(() => {
        onChangeRef.current({ start, end });
    }, [start, end]);

    // Recréé uniquement quand la plage change (≠ à chaque render parent).
    const DayComponent = useMemo(() => createRangeDay({ start, end, accentColor }), [start, end, accentColor]);

    const referenceDate = value.start ?? value.end ?? dayjs();

    const summary =
        start && end
            ? `Du ${start.format('DD/MM/YYYY')} au ${end.format('DD/MM/YYYY')}`
            : start
              ? `Début : ${start.format('DD/MM/YYYY')} — cliquez la date de fin`
              : 'Cliquez la date de début';

    return (
        <Box>
            <DateCalendar
                value={start ?? end ?? null}
                referenceDate={referenceDate}
                minDate={minDate}
                onChange={(day) => {
                    if (day) handleDayClick(day);
                }}
                slots={{ day: DayComponent }}
                sx={{ width: '100%', m: 0, '& .MuiPickersCalendarHeader-root': { mt: 0, mb: 0.5 } }}
            />
            <Typography
                fontSize={12}
                fontWeight={start && end ? 600 : 400}
                color={start && end ? accentColor : 'text.secondary'}
                sx={{ textAlign: 'center', mt: -0.5, mb: 0.5, minHeight: 18 }}
                aria-live="polite"
                data-phase={phase}
            >
                {summary}
            </Typography>
        </Box>
    );
}
