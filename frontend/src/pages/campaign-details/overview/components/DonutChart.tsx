import { memo, useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { motion } from '@shared/ui/motion';

interface DonutSegment {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    segments: DonutSegment[];
    total: number;
    size?: number;
    strokeWidth?: number;
}

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

export const DonutChart = memo(function DonutChart({ segments, total, size = 180, strokeWidth = 22 }: DonutChartProps) {
    const theme = useTheme();
    const radius = (VIEWBOX - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const arcs = useMemo(() => {
        if (total === 0) return [];

        let offset = 0;
        return segments
            .filter((s) => s.value > 0)
            .map((segment) => {
                const pct = segment.value / total;
                const dashLength = pct * circumference;
                const gap = circumference - dashLength;
                const arc = {
                    ...segment,
                    pct,
                    dashArray: `${dashLength} ${gap}`,
                    dashOffset: -offset,
                };
                offset += dashLength;
                return arc;
            });
    }, [segments, total, circumference]);

    return (
        <Stack spacing={2.5} alignItems="center">
            {/* SVG Donut */}
            <Box position="relative" width={size} height={size}>
                <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width={size} height={size} aria-hidden="true">
                    {/* Background ring */}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={radius}
                        fill="none"
                        stroke={theme.palette.divider}
                        strokeWidth={strokeWidth}
                    />
                    {/* Data arcs */}
                    {arcs.map((arc) => (
                        <circle
                            key={arc.label}
                            cx={CENTER}
                            cy={CENTER}
                            r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={arc.dashArray}
                            strokeDashoffset={arc.dashOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${CENTER} ${CENTER})`}
                            style={{
                                transition: motion.transition(['stroke-dasharray', 'stroke-dashoffset'], 'dramatic'),
                            }}
                        />
                    ))}
                </svg>

                {/* Center label */}
                <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Typography variant="h4" fontWeight="bold" lineHeight={1}>
                        {total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        cibles
                    </Typography>
                </Box>
            </Box>

            {/* Legend */}
            <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1.5}>
                {segments.map((s) => (
                    <Stack key={s.label} direction="row" alignItems="center" spacing={0.5}>
                        <CircleIcon sx={{ fontSize: 10, color: s.color }} />
                        <Typography variant="caption" color="text.secondary">
                            {s.label}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">
                            {s.value}
                        </Typography>
                    </Stack>
                ))}
            </Box>
        </Stack>
    );
});
