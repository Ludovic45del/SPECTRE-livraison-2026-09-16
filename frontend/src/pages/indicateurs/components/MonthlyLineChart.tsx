/**
 * MonthlyLineChart - line chart générique pour une série mensuelle.
 * @module pages/indicateurs/components
 */

import { memo, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipCard } from '@shared/ui';
import { toMonthlyChartData } from '../lib/monthly-chart';

interface TooltipEntry {
    value?: number | string;
}

interface MonthlyLineChartProps {
    title: string;
    /** Clés "YYYY-MM" → count. */
    series: Record<string, number>;
    color?: string;
    valueLabel?: string;
    height?: number;
}

const MonthlyLineChart = memo(function MonthlyLineChart({
    title,
    series,
    color = '#5856D6',
    valueLabel = 'Valeur',
    height = 260,
}: MonthlyLineChartProps) {
    const data = useMemo(() => toMonthlyChartData(series), [series]);

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {title}
            </Typography>
            <Box sx={{ width: '100%', height }}>
                <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} allowDecimals={false} />
                        <Tooltip
                            cursor={{
                                stroke: color,
                                strokeWidth: 1.5,
                                strokeDasharray: '4 4',
                            }}
                            wrapperStyle={{ outline: 'none' }}
                            content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0) {
                                    return null;
                                }
                                const value = (payload[0] as TooltipEntry).value ?? 0;
                                return (
                                    <ChartTooltipCard
                                        title={String(label)}
                                        accent={color}
                                        metrics={[
                                            {
                                                label: valueLabel,
                                                value: `${value}`,
                                                bold: true,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{
                                r: 6,
                                strokeWidth: 3,
                                stroke: '#fff',
                                fill: color,
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
});

export default MonthlyLineChart;
