/**
 * CategoryPieChart - pie chart générique avec légende latérale et libellés.
 * @module pages/indicateurs/components
 */

import { memo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltipCard } from '@shared/ui';

export interface CategoryPieEntry {
    label: string;
    color: string;
    count: number;
}

interface CategoryPieChartProps {
    title: string;
    data: CategoryPieEntry[];
    height?: number;
}

const CategoryPieChart = memo(function CategoryPieChart({ title, data, height = 260 }: CategoryPieChartProps) {
    const total = data.reduce((sum, e) => sum + e.count, 0);

    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {title}
            </Typography>
            {total === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Aucune donnée.
                </Typography>
            ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <Box sx={{ width: { xs: '100%', sm: '55%' }, height }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="count"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="85%"
                                    innerRadius="50%"
                                    paddingAngle={2}
                                    strokeWidth={1}
                                >
                                    {data.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    wrapperStyle={{ outline: 'none' }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload || payload.length === 0) {
                                            return null;
                                        }
                                        const entry = payload[0].payload as CategoryPieEntry;
                                        const pct = total > 0 ? (entry.count / total) * 100 : 0;
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
                                                    {
                                                        label: 'Part',
                                                        value: `${pct.toFixed(1)} %`,
                                                    },
                                                ]}
                                            />
                                        );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                        {data.map((entry) => {
                            const pct = total > 0 ? (entry.count / total) * 100 : 0;
                            return (
                                <Stack key={entry.label} direction="row" alignItems="center" spacing={1}>
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            backgroundColor: entry.color,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {entry.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {entry.count} ({pct.toFixed(0)}%)
                                    </Typography>
                                </Stack>
                            );
                        })}
                    </Stack>
                </Stack>
            )}
        </Paper>
    );
});

export default CategoryPieChart;
