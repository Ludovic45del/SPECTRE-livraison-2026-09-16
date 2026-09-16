/**
 * CategoryBarChart - bar chart vertical générique pour une ventilation par catégorie.
 * @module pages/indicateurs/components
 */

import { memo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltipCard } from '@shared/ui';

export interface CategoryBarEntry {
    label: string;
    color: string;
    count: number;
}

interface CategoryBarChartProps {
    title: string;
    data: CategoryBarEntry[];
    height?: number;
    /** Si vrai, l'axe horizontal et vertical sont inversés (catégories sur Y). */
    layout?: 'vertical' | 'horizontal';
}

const CategoryBarChart = memo(function CategoryBarChart({
    title,
    data,
    height = 260,
    layout = 'horizontal',
}: CategoryBarChartProps) {
    const isVertical = layout === 'vertical';

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {title}
            </Typography>
            {data.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Aucune donnée.
                </Typography>
            ) : (
                <Box sx={{ width: '100%', height }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={data}
                            layout={isVertical ? 'vertical' : 'horizontal'}
                            margin={{ top: 8, right: 16, bottom: 0, left: isVertical ? 50 : -16 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            {isVertical ? (
                                <>
                                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                                    <YAxis dataKey="label" type="category" fontSize={11} width={120} />
                                </>
                            ) : (
                                <>
                                    <XAxis
                                        dataKey="label"
                                        fontSize={11}
                                        angle={-25}
                                        textAnchor="end"
                                        interval={0}
                                        height={60}
                                    />
                                    <YAxis fontSize={11} allowDecimals={false} />
                                </>
                            )}
                            <Tooltip
                                cursor={{ fill: 'rgba(128, 128, 128, 0.1)', radius: 4 }}
                                wrapperStyle={{ outline: 'none' }}
                                content={({ active, payload }) => {
                                    if (!active || !payload || payload.length === 0) {
                                        return null;
                                    }
                                    const entry = payload[0].payload as CategoryBarEntry;
                                    return (
                                        <ChartTooltipCard
                                            title={entry.label}
                                            accent={entry.color}
                                            metrics={[
                                                {
                                                    label: 'Effectif',
                                                    value: `${entry.count}`,
                                                    bold: true,
                                                },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Bar dataKey="count" radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
                                {data.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Paper>
    );
});

export default CategoryBarChart;
