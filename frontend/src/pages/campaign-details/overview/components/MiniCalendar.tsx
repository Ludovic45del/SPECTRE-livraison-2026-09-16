import { memo, useMemo } from 'react';
import { Box, Stack, Typography, useTheme, alpha } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CELL = 26;

interface MiniCalendarProps {
    startDate: string | Date | null;
    endDate: string | Date | null;
}

// ── Single month grid ────────────────────────────────────────────────────────

interface MonthGridProps {
    month: Dayjs;
    start: Dayjs | null;
    end: Dayjs | null;
}

const MonthGrid = memo(function MonthGrid({ month, start, end }: MonthGridProps) {
    const theme = useTheme();
    const firstDay = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const startOffset = (firstDay.day() + 6) % 7;

    const cells = useMemo(() => {
        const result: (number | null)[] = [];
        for (let i = 0; i < startOffset; i++) result.push(null);
        for (let d = 1; d <= daysInMonth; d++) result.push(d);
        return result;
    }, [startOffset, daysInMonth]);

    const getStatus = (day: number) => {
        const date = month.date(day);
        const isStart = start && date.isSame(start, 'day');
        const isEnd = end && date.isSame(end, 'day');
        const inRange = start && end && date.isAfter(start, 'day') && date.isBefore(end, 'day');
        return { isStart, isEnd, inRange };
    };

    return (
        <Box>
            <Typography
                variant="caption"
                fontWeight="bold"
                textTransform="capitalize"
                textAlign="center"
                display="block"
                mb={0.25}
            >
                {month.format('MMM YYYY')}
            </Typography>

            <Box display="grid" gridTemplateColumns={`repeat(7, ${CELL}px)`} justifyContent="center">
                {WEEKDAYS.map((wd, i) => (
                    <Typography
                        key={i}
                        variant="caption"
                        color="text.disabled"
                        textAlign="center"
                        lineHeight={`${CELL}px`}
                        fontSize="0.65rem"
                    >
                        {wd}
                    </Typography>
                ))}
            </Box>

            <Box display="grid" gridTemplateColumns={`repeat(7, ${CELL}px)`} justifyContent="center">
                {cells.map((day, i) => {
                    if (day === null) return <Box key={`e-${i}`} />;

                    const { isStart, isEnd, inRange } = getStatus(day);
                    const isToday = month.date(day).isSame(dayjs(), 'day');

                    let bgcolor = 'transparent';
                    let color = theme.palette.text.primary;
                    let fontWeight = 400;
                    let borderRadius = '50%';

                    if (isStart || isEnd) {
                        bgcolor = isStart ? theme.palette.primary.main : theme.palette.secondary.main;
                        color = theme.palette.primary.contrastText;
                        fontWeight = 700;
                    } else if (inRange) {
                        bgcolor = alpha(theme.palette.primary.main, 0.1);
                        borderRadius = '4px';
                    }

                    if (isToday && !isStart && !isEnd) {
                        fontWeight = 700;
                    }

                    return (
                        <Box
                            key={day}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            width={CELL}
                            height={CELL}
                            sx={{
                                bgcolor,
                                borderRadius,
                                ...(isToday &&
                                    !isStart &&
                                    !isEnd && {
                                        border: `1.5px solid ${theme.palette.primary.main}`,
                                    }),
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color, fontWeight, lineHeight: 1, fontSize: '0.65rem' }}
                            >
                                {day}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
});

// ── Main component ───────────────────────────────────────────────────────────

export const MiniCalendar = memo(function MiniCalendar({ startDate, endDate }: MiniCalendarProps) {
    const theme = useTheme();
    const start = startDate ? dayjs(startDate) : null;
    const end = endDate ? dayjs(endDate) : null;

    // Only show first and last month (max 2 grids)
    const months = useMemo(() => {
        if (!start && !end) return [];

        const first = start ?? end!;
        const last = end ?? start!;

        const firstMonth = first.startOf('month');
        const lastMonth = last.startOf('month');

        if (firstMonth.isSame(lastMonth, 'month')) return [firstMonth];
        return [firstMonth, lastMonth];
    }, [start, end]);

    const skippedCount = useMemo(() => {
        if (!start || !end) return 0;
        const diff = end.startOf('month').diff(start.startOf('month'), 'month');
        return Math.max(0, diff - 1);
    }, [start, end]);

    if (months.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                Aucune date renseignée
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5} alignItems="center">
            {/* Month grids – side by side when 2 months */}
            <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="center" flexWrap="wrap">
                <MonthGrid month={months[0]} start={start} end={end} />

                {skippedCount > 0 && (
                    <Stack alignItems="center" justifyContent="center" alignSelf="center">
                        <MoreHorizIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled" fontSize="0.65rem">
                            {skippedCount} mois
                        </Typography>
                    </Stack>
                )}

                {months.length > 1 && <MonthGrid month={months[1]} start={start} end={end} />}
            </Stack>

            {/* Legend */}
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                {start && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <FiberManualRecordIcon sx={{ fontSize: 8, color: theme.palette.primary.main }} />
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                            Début : {start.format('DD MMM YYYY')}
                        </Typography>
                    </Stack>
                )}
                {end && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <FiberManualRecordIcon sx={{ fontSize: 8, color: theme.palette.secondary.main }} />
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                            Fin : {end.format('DD MMM YYYY')}
                        </Typography>
                    </Stack>
                )}
            </Stack>
        </Stack>
    );
});
