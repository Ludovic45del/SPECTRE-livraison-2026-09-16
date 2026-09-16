/**
 * Indicateurs Campagne Page - KPI et graphiques sur les campagnes.
 *
 * Filtre principal : période (année + semestre). Contrairement aux pages FA et
 * FSEC, le rattachement temporel est direct : la campagne porte elle-même
 * `year`/`semester`. Les volumes FSEC sont déclinés par campagne pour exposer
 * la densité moyenne et le classement des campagnes les plus volumineuses.
 */

import { useMemo } from 'react';
import { Alert, Box, Container, Grid, Skeleton } from '@mui/material';

import { useIndicators } from '@entities/indicators';
import { CAMPAIGN_INSTALLATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '@entities/campaign';
import { IndicatorsToolbar, formatIndicatorsPeriod, useFilterIndicatorsStore } from '@features/indicators';
import { getErrorMessage } from '@shared/lib';

import KpiCard from './components/KpiCard';
import CategoryBarChart, { type CategoryBarEntry } from './components/CategoryBarChart';
import CategoryPieChart, { type CategoryPieEntry } from './components/CategoryPieChart';
import MonthlyLineChart from './components/MonthlyLineChart';

const COLORS = {
    campaign: '#5856D6',
    fsec: '#34C759',
    density: '#007AFF',
    shot: '#30B0C7',
    duration: '#FF9500',
    volume: '#5856D6',
} as const;

function formatDays(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    return `${value.toFixed(1)} j`;
}

function formatRatio(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    return value.toFixed(1);
}

function formatPercent(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    return `${value.toFixed(0)} %`;
}

export default function IndicateursCampagnePage() {
    const year = useFilterIndicatorsStore((s) => s.year);
    const semester = useFilterIndicatorsStore((s) => s.semester);
    const { data, isLoading, error } = useIndicators(year, semester);

    // Libellé de période partagé (format semestriel compact '2027-S1' / '2027-S1/2027-S2').
    const periodLabel = formatIndicatorsPeriod(year, semester);

    const statusEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.campaign.byStatus)
            .map(([id, count]) => {
                const info = CAMPAIGN_STATUSES[Number(id)];
                return {
                    label: info?.label ?? `Statut ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const typeEntries = useMemo<CategoryPieEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.campaign.byType)
            .map(([id, count]) => {
                const info = CAMPAIGN_TYPES[Number(id)];
                return {
                    label: info?.label ?? `Type ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const installationEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.campaign.byInstallation)
            .map(([id, count]) => {
                const info = CAMPAIGN_INSTALLATIONS[Number(id)];
                return {
                    label: info?.label ?? `Installation ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const volumeEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return data.campaign.topByVolume.map((c) => ({
            label: c.name,
            color: COLORS.volume,
            count: c.fsecCount,
        }));
    }, [data]);

    const shotRate = useMemo<number | null>(() => {
        if (!data || data.campaign.totalFsec === 0) return null;
        return (data.campaign.totalFsecShot / data.campaign.totalFsec) * 100;
    }, [data]);

    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <IndicatorsToolbar title="Indicateurs — Campagnes" />
                <Alert severity="error" sx={{ mt: 2 }}>
                    Impossible de charger les indicateurs : {getErrorMessage(error)}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <IndicatorsToolbar title="Indicateurs — Campagnes" />

            {/* --------- KPI cards --------- */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(5, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                }}
            >
                <KpiCard
                    title="Campagnes"
                    value={isLoading ? '…' : (data?.campaign.totalInPeriod ?? 0)}
                    subtitle={periodLabel}
                    color={COLORS.campaign}
                    loading={isLoading}
                />
                <KpiCard
                    title="FSEC rattachées"
                    value={isLoading ? '…' : (data?.campaign.totalFsec ?? 0)}
                    subtitle="toutes campagnes"
                    color={COLORS.fsec}
                    loading={isLoading}
                />
                <KpiCard
                    title="FSEC / campagne"
                    value={isLoading ? '…' : formatRatio(data?.campaign.avgFsecPerCampaign ?? null)}
                    subtitle="densité moyenne"
                    color={COLORS.density}
                    loading={isLoading}
                />
                <KpiCard
                    title="Taux de tir"
                    value={isLoading ? '…' : formatPercent(shotRate)}
                    subtitle="FSEC tirées / créées"
                    color={COLORS.shot}
                    loading={isLoading}
                />
                <KpiCard
                    title="Durée moyenne"
                    value={isLoading ? '…' : formatDays(data?.campaign.avgDurationDays ?? null)}
                    subtitle="début → fin"
                    color={COLORS.duration}
                    loading={isLoading}
                />
            </Box>

            {/* --------- Charts --------- */}
            <Grid container spacing={2}>
                <Grid item xs={12} lg={8}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <MonthlyLineChart
                            title="Campagnes démarrées par mois"
                            series={data?.campaign.startedPerMonth ?? {}}
                            color={COLORS.campaign}
                            valueLabel="Campagnes démarrées"
                        />
                    )}
                </Grid>
                <Grid item xs={12} lg={4}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryPieChart title="Répartition par type" data={typeEntries} />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryBarChart title="Répartition par statut" data={statusEntries} />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryBarChart title="Répartition par installation" data={installationEntries} />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryBarChart title="Top campagnes — volume FSEC" data={volumeEntries} layout="vertical" />
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
