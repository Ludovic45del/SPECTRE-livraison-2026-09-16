/**
 * RangeDay — slot `day` d'un DateCalendar surlignant une plage [start..end].
 *
 * Factory (comme `createAvailabilityDay`) car MUI v8 ne permet plus d'étendre
 * `PickersDayProps`. Couche volontairement DISTINCTE de `createAvailabilityDay`
 * (dispo) : on ne fusionne pas les deux pour ne pas casser leur mémoïsation.
 * @module shared/ui
 */
import { alpha } from '@mui/material/styles';
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import type { Dayjs } from 'dayjs';
import type { DateRange } from '../lib/useDateRangeSelection';

interface RangeDayConfig extends DateRange {
    /** Couleur d'accent (extrémités pleines + intervalle en alpha). */
    accentColor: string;
}

/**
 * Crée un composant jour lié à la plage donnée. À passer à
 * `<DateCalendar slots={{ day: createRangeDay(...) }} />`.
 */
export function createRangeDay({ start, end, accentColor }: RangeDayConfig) {
    return function RangeDay(props: PickersDayProps) {
        const day = props.day as Dayjs;
        const { outsideCurrentMonth } = props;

        const isStart = !!start && day.isSame(start, 'day');
        const isEnd = !!end && day.isSame(end, 'day');
        const inRange = !!start && !!end && day.isAfter(start, 'day') && day.isBefore(end, 'day');
        const isEdge = isStart || isEnd;
        const isSingle = isStart && isEnd;

        return (
            <PickersDay
                {...props}
                selected={isEdge}
                sx={{
                    ...(inRange &&
                        !outsideCurrentMonth && {
                            bgcolor: alpha(accentColor, 0.16),
                            borderRadius: 0,
                            '&:hover, &:focus': { bgcolor: alpha(accentColor, 0.24) },
                        }),
                    ...(isEdge && {
                        bgcolor: accentColor,
                        color: '#fff',
                        '&:hover, &:focus': { bgcolor: accentColor, filter: 'brightness(0.92)' },
                        borderRadius: isSingle ? '50%' : isStart ? '50% 0 0 50%' : '0 50% 50% 0',
                    }),
                }}
            />
        );
    };
}
