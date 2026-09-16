/**
 * Etalonnage Charts Component
 * @module features/embase/etalonnage-tab
 *
 * Affiche les graphiques d'evolution des mesures d'etalonnage (grille de LineCharts).
 */

import { memo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';
import { ETALONNAGE_FIELD_LABELS, ETALONNAGE_FIELD_COLORS } from '@entities/etalonnage';
import { ChartTooltipCard } from '@shared/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChartDataPoint {
    date: string;
    offset0BarMv: number | null;
    mesurande0BarLie: number | null;
    signalEtendueMv: number | null;
    signalPaMeteociel: number | null;
}

interface EtalonnageChartsProps {
    chartData: ChartDataPoint[];
    metricKeys: Array<keyof typeof ETALONNAGE_FIELD_LABELS>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Single metric chart
// ─────────────────────────────────────────────────────────────────────────────

interface MetricChartProps {
    metricKey: string;
    label: string;
    color: string;
    chartData: ChartDataPoint[];
}

function formatMeasure(value: number): string {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

const MetricChart = memo(function MetricChart({ metricKey, label, color, chartData }: MetricChartProps) {
    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color }}>
                {label}
            </Typography>
            <Box sx={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} tick={{ fill: '#666' }} />
                        <YAxis fontSize={11} tick={{ fill: '#666' }} domain={['auto', 'auto']} />
                        <RechartsTooltip
                            wrapperStyle={{ outline: 'none' }}
                            cursor={{
                                stroke: color,
                                strokeWidth: 1.5,
                                strokeDasharray: '4 4',
                            }}
                            content={({ active, payload, label: dateLabel }) => {
                                if (!active || !payload || payload.length === 0) {
                                    return null;
                                }
                                const value = payload[0]?.value;
                                if (value === null || value === undefined) {
                                    return null;
                                }
                                return (
                                    <ChartTooltipCard
                                        title={String(dateLabel)}
                                        accent={color}
                                        metrics={[
                                            {
                                                label,
                                                value: formatMeasure(Number(value)),
                                                color,
                                                bold: true,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey={metricKey}
                            name={label}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 4, fill: color }}
                            activeDot={{ r: 6 }}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const EtalonnageCharts = memo(function EtalonnageCharts({ chartData, metricKeys }: EtalonnageChartsProps) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
                Évolution des mesures
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 3,
                }}
            >
                {metricKeys.map((key) => (
                    <MetricChart
                        key={key}
                        metricKey={key as string}
                        label={ETALONNAGE_FIELD_LABELS[key]}
                        color={ETALONNAGE_FIELD_COLORS[key]}
                        chartData={chartData}
                    />
                ))}
            </Box>
        </Paper>
    );
});
