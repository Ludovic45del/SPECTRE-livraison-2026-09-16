/**
 * StepDurationsChart - bar chart horizontal des délais entre étapes.
 *
 * Chaque transition est représentée par une barre = moyenne en jours, encadrée
 * d'une `ErrorBar` qui couvre [min, max]. La transition goulot d'étranglement
 * reçoit une couleur dédiée.
 * @module pages/indicateurs/components
 */

import { memo, useMemo } from 'react';
import { Alert, Box, Chip, Paper, Stack, Typography, useTheme } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StepDuration } from '@entities/indicators';
import { ChartTooltipCard } from '@shared/ui';

interface StepDurationsChartProps {
    title: string;
    durations: StepDuration[];
    bottleneckKey: string | null;
    emptyMessage?: string;
}

interface ChartRow {
    key: string;
    label: string;
    count: number;
    avg: number;
    median: number | null;
    min: number;
    max: number;
    errorRange: [number, number];
    isBottleneck: boolean;
}

const BOTTLENECK_COLOR = '#FF9500';
const BAR_COLOR = '#5856D6';

const StepDurationsChart = memo(function StepDurationsChart({
    title,
    durations,
    bottleneckKey,
    emptyMessage = 'Aucune donnée disponible pour la période sélectionnée.',
}: StepDurationsChartProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const { rows, missingCount } = useMemo(() => {
        const result: ChartRow[] = [];
        let missing = 0;
        for (const d of durations) {
            if (d.avgDays === null || d.minDays === null || d.maxDays === null) {
                missing += 1;
                continue;
            }
            const avg = d.avgDays;
            const min = d.minDays;
            const max = d.maxDays;
            result.push({
                key: d.key,
                label: d.label,
                count: d.count,
                avg,
                median: d.medianDays,
                min,
                max,
                // ErrorBar attend [écart_bas, écart_haut] depuis la valeur centrale.
                errorRange: [Math.max(0, avg - min), Math.max(0, max - avg)],
                isBottleneck: bottleneckKey === d.key,
            });
        }
        return { rows: result, missingCount: missing };
    }, [durations, bottleneckKey]);

    // Hauteur dynamique : on garde ~52 px par ligne pour la lisibilité des labels.
    const chartHeight = Math.max(160, rows.length * 52 + 40);

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack
                direction="row"
                alignItems="baseline"
                justifyContent="space-between"
                sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}
            >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Sur FSEC tirées dans l'année — barre&nbsp;= moyenne, marges&nbsp;= [min, max].
                </Typography>
            </Stack>

            {rows.length === 0 ? (
                <Alert severity="info" variant="outlined">
                    {emptyMessage}
                </Alert>
            ) : (
                <>
                    <Box sx={{ width: '100%', height: chartHeight }}>
                        <ResponsiveContainer>
                            <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis
                                    type="number"
                                    fontSize={11}
                                    label={{
                                        value: 'jours',
                                        position: 'insideBottom',
                                        offset: -2,
                                        style: { fontSize: 11, fill: theme.palette.text.secondary },
                                    }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    fontSize={11}
                                    width={210}
                                    tick={{
                                        fill: theme.palette.text.primary,
                                    }}
                                />
                                <Tooltip
                                    cursor={{
                                        fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    }}
                                    wrapperStyle={{ outline: 'none' }}
                                    content={<StepTooltip />}
                                />
                                <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={20}>
                                    {rows.map((row) => (
                                        <Cell key={row.key} fill={row.isBottleneck ? BOTTLENECK_COLOR : BAR_COLOR} />
                                    ))}
                                    <ErrorBar
                                        dataKey="errorRange"
                                        width={6}
                                        strokeWidth={1.5}
                                        stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'}
                                        direction="x"
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Legend color={BAR_COLOR} label="Moyenne" />
                        <Legend color={BOTTLENECK_COLOR} label="Goulot d'étranglement" />
                        {missingCount > 0 ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`${missingCount} transition${missingCount > 1 ? 's' : ''} sans donnée`}
                            />
                        ) : null}
                    </Stack>
                </>
            )}
        </Paper>
    );
});

interface LegendProps {
    color: string;
    label: string;
}

function Legend({ color, label }: LegendProps) {
    return (
        <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 0.5,
                    backgroundColor: color,
                }}
            />
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
        </Stack>
    );
}

interface TooltipPayload {
    payload: ChartRow;
}

function StepTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0].payload;
    return (
        <ChartTooltipCard
            title={row.label}
            accent={row.isBottleneck ? BOTTLENECK_COLOR : BAR_COLOR}
            metrics={[
                { label: 'N', value: `${row.count}` },
                { label: 'Moyenne', value: `${row.avg.toFixed(1)} j`, bold: true },
                {
                    label: 'Médiane',
                    value: row.median !== null ? `${row.median.toFixed(1)} j` : '—',
                },
                { label: 'Min', value: `${row.min.toFixed(1)} j` },
                { label: 'Max', value: `${row.max.toFixed(1)} j` },
            ]}
            footer={row.isBottleneck ? <Chip size="small" color="warning" variant="outlined" label="Goulot" /> : null}
        />
    );
}

export default StepDurationsChart;
