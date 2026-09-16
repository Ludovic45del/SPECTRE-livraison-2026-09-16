/**
 * Activity feed widget.
 * @module features/dashboard/ui/widgets
 */

import { memo } from 'react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { ACTIVITY_FEED_LIMIT } from '@entities/dashboard';
import useDashboardData from '../../hooks/useDashboardData';
import SectionCard from '@widgets/SectionCard';
import ActivityFeedItem from '../components/ActivityFeedItem';

export default memo(function ActivityWidget() {
    const { isLoading, recentActivity } = useDashboardData();

    return (
        <SectionCard
            title="Activité récente"
            action={
                <Typography variant="caption" color="text.disabled">
                    {ACTIVITY_FEED_LIMIT} dernières modifications
                </Typography>
            }
        >
            {isLoading ? (
                <Stack spacing={1}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
                    ))}
                </Stack>
            ) : recentActivity.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.disabled">
                        Aucune activité récente
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={0.5}>
                    {recentActivity.map((item) => (
                        <ActivityFeedItem key={`${item.type}-${item.id}`} item={item} />
                    ))}
                </Stack>
            )}
        </SectionCard>
    );
});
