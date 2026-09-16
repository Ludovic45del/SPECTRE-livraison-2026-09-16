/**
 * WeeklyPlanningPreview — Vue journalière de la semaine courante sur la page d'accueil.
 * Thin wrapper around WeekDayGrid.
 */
import { memo, useCallback } from 'react';
import { Box, ButtonBase, Skeleton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import {
    useCampaignSteps,
    useLabEvents,
    useMemberPeriods,
    useWeekStates,
} from '@entities/planning/core/api/planning.queries';
// FSD exception: cross-feature import (R-ARCH-03).
// WeekDayGrid depends on @entities hooks internally, preventing promotion to @widgets.
import { WeekDayGrid } from '@features/planning';
import { motion } from '@shared/ui/motion';

function getWeekLabel(weekNum: number, year: number): string {
    const monday = dayjs(`${year}-01-04`).isoWeek(weekNum).startOf('isoWeek');
    const friday = monday.add(4, 'day');
    return `S${weekNum} — ${monday.format('D MMM')} au ${friday.format('D MMM YYYY')}`;
}

export default memo(function WeeklyPlanningPreview() {
    const navigate = useNavigate();

    const currentYear = dayjs().isoWeekYear();
    const currentWeekNum = dayjs().isoWeek();
    const weekLabel = getWeekLabel(currentWeekNum, currentYear);

    // Loading state from queries used by WeekDayGrid
    const { isLoading: wsLoading } = useWeekStates(currentYear);
    const { isLoading: mpLoading } = useMemberPeriods(currentYear);
    const { isLoading: csLoading } = useCampaignSteps(currentYear);
    const { isLoading: leLoading } = useLabEvents();
    const isLoading = wsLoading || mpLoading || csLoading || leLoading;
    const handleClick = useCallback(() => navigate('/planning'), [navigate]);

    return (
        <ButtonBase
            onClick={handleClick}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                width: '100%',
                height: '100%',
                textAlign: 'left',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                transition: `all ${motion.base}`,
                '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(0, 122, 255, 0.02)',
                },
            }}
        >
            <Box sx={{ p: 2.5, width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        Planning de la semaine
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 'auto' }}>
                        {weekLabel}
                    </Typography>
                </Box>

                {isLoading ? (
                    <Stack spacing={1}>
                        <Skeleton variant="rectangular" sx={{ borderRadius: 2, minHeight: 180 }} />
                    </Stack>
                ) : (
                    <Box sx={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                        <WeekDayGrid weekNum={currentWeekNum} year={currentYear} />
                    </Box>
                )}
            </Box>
        </ButtonBase>
    );
});
