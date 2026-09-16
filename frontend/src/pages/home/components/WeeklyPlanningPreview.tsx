/**
 * WeeklyPlanningPreview — Vue journalière de la semaine courante sur la page d'accueil.
 * Thin wrapper around WeekDayGrid.
 */
import { Box, Button, Skeleton, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import {
    useCampaignSteps,
    useLabEvents,
    useMemberPeriods,
    useWeekStates,
} from '@entities/planning/core/api/planning.queries';
import { WeekDayGrid, getWeekLabel } from '@features/planning/ui/WeekDayGrid';
import SectionCard from './SectionCard';

export default function WeeklyPlanningPreview() {
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

    return (
        <SectionCard
            title="Planning de la semaine"
            action={
                <Button
                    size="small"
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    onClick={() => navigate('/planning')}
                    sx={{ textTransform: 'none', fontSize: 12, flexShrink: 0 }}
                >
                    {weekLabel} — Planning complet
                </Button>
            }
        >
            {isLoading ? (
                <Stack spacing={1}>
                    <Skeleton variant="rectangular" sx={{ borderRadius: 2, minHeight: 180 }} />
                </Stack>
            ) : (
                <Box sx={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    <WeekDayGrid weekNum={currentWeekNum} year={currentYear} />
                </Box>
            )}
        </SectionCard>
    );
}
