/**
 * Statistics Section - Donut chart of FSEC statuses
 * @module pages/campaign-details/overview/components
 */

import { useMemo, memo } from 'react';
import { Paper, Stack, Skeleton, useTheme } from '@mui/material';
import { FSEC_STATUS_ID, FSEC_STATUSES } from '@entities/fsec';
import { SectionHeader } from './SectionHeader';
import { DonutChart } from './DonutChart';
import { PAPER_BASE_SX } from './styles';

export interface StatisticsSectionProps {
    stats: {
        total: number;
        tirees: number;
        pretes: number;
        fabrication: number;
        hs: number;
        decisionMoe: number;
    };
    isLoading?: boolean;
}

export const StatisticsSection = memo(function StatisticsSection({ stats, isLoading }: StatisticsSectionProps) {
    const theme = useTheme();

    const segments = useMemo(
        () => [
            { label: 'Tirées', value: stats.tirees, color: theme.palette.success.main },
            { label: 'Prêtes', value: stats.pretes, color: theme.palette.info.main },
            { label: 'Fabrication', value: stats.fabrication, color: theme.palette.warning.main },
            { label: 'HS', value: stats.hs, color: theme.palette.error.main },
            {
                label: 'Décision MOE',
                value: stats.decisionMoe,
                color: FSEC_STATUSES[FSEC_STATUS_ID.DECISION_MOE].color,
            },
        ],
        [stats, theme],
    );

    if (isLoading) {
        return (
            <Paper variant="outlined" sx={PAPER_BASE_SX}>
                <SectionHeader title="Statistiques" />
                <Stack spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={180} height={180} />
                    <Skeleton variant="text" width="80%" height={24} />
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX} role="region" aria-label="Statistiques de la campagne">
            <SectionHeader title="Statistiques" />
            <DonutChart segments={segments} total={stats.total} />
        </Paper>
    );
});
