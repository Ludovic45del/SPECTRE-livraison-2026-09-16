/**
 * KPIs widget — 4 metric cards in a grid.
 * @module features/dashboard/ui/widgets
 */

import { memo, useMemo } from 'react';
import { Box } from '@mui/material';

import { BRAND_COLORS } from '@entities/dashboard';
import useDashboardData from '../../hooks/useDashboardData';
import KpiCard from '../components/KpiCard';

export default memo(function KpisWidget() {
    const { isLoading, kpis } = useDashboardData();

    const kpiItems = useMemo(
        () => [
            {
                title: 'Campagnes actives',
                value: kpis.activeCampaigns,
                subtitle: 'en cours',
                color: BRAND_COLORS.campaign,
            },
            {
                title: 'FSECs',
                value: kpis.totalFsecs,
                subtitle: 'total',
                color: BRAND_COLORS.fsec,
            },
            {
                title: 'FAs ouvertes',
                value: kpis.openFas,
                subtitle: `sur ${kpis.totalFas} au total`,
                color: BRAND_COLORS.fa,
            },
            {
                title: 'Taux résolution',
                value: `${kpis.resolutionRate}%`,
                subtitle: 'FAs clôturées',
                color: BRAND_COLORS.success,
            },
        ],
        [kpis],
    );

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 2,
                height: '100%',
            }}
        >
            {kpiItems.map((kpi) => (
                <KpiCard key={kpi.title} {...kpi} loading={isLoading} />
            ))}
        </Box>
    );
});
