/**
 * Indicateurs FSEC Page - KPI, délais entre étapes, charts FSEC.
 *
 * Filtre principal : année (défaut = année courante).
 *
 * Limitation : le statut "Disponible" (FSEC status 5) n'a pas de date dédiée
 * dans le modèle ; il n'apparaît pas dans les transitions datées.
 */

import { useMemo } from 'react';
import { Alert, Box, Container, Grid, Skeleton, Stack } from '@mui/material';

import { useIndicators } from '@entities/indicators';
import { FSEC_CATEGORIES, FSEC_STATUSES } from '@entities/fsec';
import { IndicatorsToolbar, formatIndicatorsPeriod, useFilterIndicatorsStore } from '@features/indicators';
import { getErrorMessage } from '@shared/lib';

import KpiCard from './components/KpiCard';
import StepDurationsChart from './components/StepDurationsChart';
import CategoryBarChart, { type CategoryBarEntry } from './components/CategoryBarChart';
import CategoryPieChart, { type CategoryPieEntry } from './components/CategoryPieChart';
import MonthlyLineChart from './components/MonthlyLineChart';

const COLORS = {
    fsec: '#5856D6',
    shot: '#34C759',
    cycle: '#007AFF',
    median: '#5AC8FA',
} as const;

function formatDays(value: number | null): string {
    if (value === null || Number.isNaN(value)) return '—';
    return `${value.toFixed(1)} j`;
}

export default function IndicateursFsecPage() {
    const year = useFilterIndicatorsStore((s) => s.year);
    const semester = useFilterIndicatorsStore((s) => s.semester);
    const { data, isLoading, error } = useIndicators(year, semester);

    // Libellé de période partagé (format semestriel compact '2027-S1' / '2027-S1/2027-S2').
    const periodLabel = formatIndicatorsPeriod(year, semester);

    const generalDurations = useMemo(() => data?.stepDurations.filter((d) => !d.isGas) ?? [], [data]);
    const gasDurations = useMemo(() => data?.stepDurations.filter((d) => d.isGas) ?? [], [data]);

    const statusEntries = useMemo<CategoryBarEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.fsec.byStatus)
            .map(([id, count]) => {
                const info = FSEC_STATUSES[Number(id)];
                return {
                    label: info?.label ?? `Statut ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const categoryEntries = useMemo<CategoryPieEntry[]>(() => {
        if (!data) return [];
        return Object.entries(data.fsec.byCategory)
            .map(([id, count]) => {
                const info = FSEC_CATEGORIES[Number(id)];
                return {
                    label: info?.label ?? `Cat. ${id}`,
                    color: info?.color ?? '#666',
                    count,
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data]);

    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <IndicatorsToolbar title="Indicateurs — FSEC" />
                <Alert severity="error" sx={{ mt: 2 }}>
                    Impossible de charger les indicateurs : {getErrorMessage(error)}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <IndicatorsToolbar title="Indicateurs — FSEC" />

            {/* --------- KPI cards --------- */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                    mb: 3,
                }}
            >
                <KpiCard
                    title="FSEC créées"
                    value={isLoading ? '…' : (data?.fsec.totalCreatedInYear ?? 0)}
                    subtitle={periodLabel}
                    color={COLORS.fsec}
                    loading={isLoading}
                />
                <KpiCard
                    title="FSEC tirées"
                    value={isLoading ? '…' : (data?.fsec.totalShotInYear ?? 0)}
                    subtitle={periodLabel}
                    color={COLORS.shot}
                    loading={isLoading}
                />
                <KpiCard
                    title="Cycle time moyen"
                    value={isLoading ? '…' : formatDays(data?.fsec.avgCycleTimeDays ?? null)}
                    subtitle="création → tirée"
                    color={COLORS.cycle}
                    loading={isLoading}
                />
                <KpiCard
                    title="Cycle time médian"
                    value={isLoading ? '…' : formatDays(data?.fsec.medianCycleTimeDays ?? null)}
                    subtitle="création → tirée"
                    color={COLORS.median}
                    loading={isLoading}
                />
            </Box>

            {/* --------- Délais entre étapes --------- */}
            <Stack spacing={2} sx={{ mb: 3 }}>
                {isLoading ? (
                    <Skeleton variant="rounded" height={320} />
                ) : (
                    <StepDurationsChart
                        title="Délais entre étapes — workflow général"
                        durations={generalDurations}
                        bottleneckKey={data?.bottleneckStepKey ?? null}
                    />
                )}
                {isLoading ? (
                    <Skeleton variant="rounded" height={320} />
                ) : (
                    <StepDurationsChart
                        title="Délais entre étapes — chaîne gaz"
                        durations={gasDurations}
                        bottleneckKey={data?.bottleneckStepKey ?? null}
                        emptyMessage="Aucune FSEC gaz tirée dans cette année."
                    />
                )}
            </Stack>

            {/* --------- Charts --------- */}
            <Grid container spacing={2}>
                <Grid item xs={12} lg={8}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <MonthlyLineChart
                            title="FSEC tirées par mois"
                            series={data?.fsec.shotPerMonth ?? {}}
                            color={COLORS.shot}
                            valueLabel="FSEC tirées"
                        />
                    )}
                </Grid>
                <Grid item xs={12} lg={4}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryPieChart title="Répartition par catégorie" data={categoryEntries} />
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    {isLoading ? (
                        <Skeleton variant="rounded" height={300} />
                    ) : (
                        <CategoryBarChart title="Répartition par statut" data={statusEntries} layout="vertical" />
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
