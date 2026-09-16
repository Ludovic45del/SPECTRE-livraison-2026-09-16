/**
 * Indicateurs FA Page - KPI et graphiques sur les Fiches d'Anomalie.
 *
 * Filtre principal : année (défaut = année courante). Toutes les agrégations
 * couvrent les FA créées dans l'année, sauf le stock ouvert (toutes années).
 */

import { useMemo } from 'react';
import { Alert, Box, Container, Grid, Skeleton } from '@mui/material';

import { useIndicators } from '@entities/indicators';
import { FA_CRITICALITIES, FA_STATUSES, FSEC_STEPS } from '@entities/fa';
import { IndicatorsToolbar, formatIndicatorsPeriod, useFilterIndicatorsStore } from '@features/indicators';
import { getErrorMessage } from '@shared/lib';

import KpiCard from './components/KpiCard';
import CategoryBarChart, { type CategoryBarEntry } from './components/CategoryBarChart';
import CategoryPieChart, { type CategoryPieEntry } from './components/CategoryPieChart';
import MonthlyLineChart from './components/MonthlyLineChart';

const COLORS = {
    primary: '#FF9500',
    stock: '#FF3B30',
    delay: '#5856D6',
    lifecycle: '#007AFF',
} as const;

function formatDays(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    return `${value.toFixed(1)} j`;
}

export default function IndicateursFaPage() {
    const year = useFilterIndicatorsStore((s) => s.year);
    const semester = useFilterIndicatorsStore((s) => s.semester);
    const { data, isLoading, error } = useIndicators(year, semester);

    // Libellé de période partagé (format semestriel compact '2027-S1' / '2027-S1/2027-S2').
    const periodLabel = formatIndicatorsPeriod(year, semester);

    const statusEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.fa.byStatus)
            .map(([id, count]) => {
                const info = FA_STATUSES[Number(id)];
                return {
                    label: info?.label ?? `Statut ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const criticalityEntries = useMemo<CategoryPieEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.fa.byCriticality)
            .map(([id, count]) => {
                const info = FA_CRITICALITIES[Number(id)];
                return {
                    label: info?.label ?? `Crit. ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => Number(a.label.replace(/\D/g, '')) - Number(b.label.replace(/\D/g, '')));
    }, [data]);

    const discoveryEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.fa.byDiscoveryStep)
            .map(([id, count]) => ({
                label: FSEC_STEPS[Number(id)] ?? `Étape ${id}`,
                color: '#FF9500',
                count,
            }))
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const delayChartData = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        const items = [
            { label: 'Événement → Ouverture', value: data.fa.avgEventToOpenDays },
            { label: 'Ouverture → Clôture', value: data.fa.avgOpenToClosureDays },
            { label: 'Cycle total (event → clôture)', value: data.fa.avgTotalLifecycleDays },
        ];
        return items
            .filter((i) => i.value !== null)
            .map((i) => ({
                label: i.label,
                color: COLORS.delay,
                count: Number(i.value ?? 0),
            }));
    }, [data]);

    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <IndicatorsToolbar title="Indicateurs — FA" />
                <Alert severity="error" sx={{ mt: 2 }}>
                    Impossible de charger les indicateurs : {getErrorMessage(error)}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <IndicatorsToolbar title="Indicateurs — Fiches d'Anomalie" />

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
                    title="FA créées"
                    value={isLoading ? '…' : (data?.fa.totalCreatedInYear ?? 0)}
                    subtitle={periodLabel}
                    color={COLORS.primary}
                    loading={isLoading}
                />
                <KpiCard
                    title="FA en stock"
                    value={isLoading ? '…' : (data?.fa.openStockAllYears ?? 0)}
                    subtitle="non clôturées (toutes années)"
                    color={COLORS.stock}
                    loading={isLoading}
                />
                <KpiCard
                    title="Cycle total"
                    value={isLoading ? '…' : formatDays(data?.fa.avgTotalLifecycleDays ?? null)}
                    subtitle="événement → clôture"
                    color={COLORS.lifecycle}
                    loading={isLoading}
                />
                <KpiCard
                    title="Événement → ouverture"
                    value={isLoading ? '…' : formatDays(data?.fa.avgEventToOpenDays ?? null)}
                    subtitle="délai moyen"
                    color={COLORS.delay}
                    loading={isLoading}
                />
                <KpiCard
                    title="Ouverture → clôture"
                    value={isLoading ? '…' : formatDays(data?.fa.avgOpenToClosureDays ?? null)}
                    subtitle="délai moyen de traitement"
                    color={COLORS.delay}
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
                            title="FA créées par mois"
                            series={data?.fa.createdPerMonth ?? {}}
                            color={COLORS.primary}
                            valueLabel="FA créées"
                        />
                    )}
                </Grid>
                <Grid item xs={12} lg={4}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryPieChart title="Répartition par criticité" data={criticalityEntries} />
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
                        <CategoryBarChart
                            title="FA — étape FSEC de découverte"
                            data={discoveryEntries}
                            layout="vertical"
                        />
                    )}
                </Grid>
                <Grid item xs={12}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryBarChart title="Délais de traitement (jours, moyenne)" data={delayChartData} />
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
