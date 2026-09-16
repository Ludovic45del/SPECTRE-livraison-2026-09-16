/**
 * WeekRecapPopover — Dialog récap d'une semaine (clic sur header semaine).
 * Thin wrapper around WeekDayGrid.
 */
import { Box, Chip, Dialog, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { WeekDayGrid, getWeekLabel, useWeekStateForWeek } from './WeekDayGrid';

interface WeekRecapPopoverProps {
    weekNum: number;
    year: number;
    onClose: () => void;
}

export function WeekRecapPopover({ weekNum, year, onClose }: WeekRecapPopoverProps) {
    const weekState = useWeekStateForWeek(weekNum, year);

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, px: 2 }}
            >
                <Box>
                    <Typography fontSize={15} fontWeight={700}>
                        {getWeekLabel(weekNum, year)}
                    </Typography>
                    {weekState && (
                        <Chip
                            label={weekState === 'fermeture' ? 'Fermeture' : 'Vacances'}
                            color={weekState === 'fermeture' ? 'error' : 'warning'}
                            sx={{ mt: 0.5 }}
                        />
                    )}
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: 2, pb: 2, overflowX: 'auto' }}>
                <WeekDayGrid weekNum={weekNum} year={year} />
            </Box>
        </Dialog>
    );
}
