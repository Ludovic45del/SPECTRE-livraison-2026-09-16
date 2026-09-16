/**
 * Pure SVG donut chart + its legend.
 * @module pages/home/components/DonutChart
 */

import { Box, Stack, Typography, useTheme } from '@mui/material';
import type { DonutSegment } from '../constants';

// ============================================================================
// DonutChart
// ============================================================================

export function DonutChart({
    segments,
    size = 120,
    thickness = 16,
}: {
    readonly segments: readonly DonutSegment[];
    readonly size?: number;
    readonly thickness?: number;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    if (total === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: size }}>
                <Typography variant="body2" color="text.disabled">
                    Aucune donnée
                </Typography>
            </Box>
        );
    }

    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const visibleSegments = segments.filter((s) => s.value > 0);
    const gapLen = visibleSegments.length > 1 ? (4 / 360) * circumference : 0;
    let accumulatedOffset = 0;

    return (
        <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-label="Répartition par statut"
            >
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                    strokeWidth={thickness}
                />
                {/* Data segments */}
                {visibleSegments.map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLen = Math.max(circumference * pct - gapLen, 2);
                    const dashOffset = -(accumulatedOffset + gapLen / 2);
                    accumulatedOffset += circumference * pct;

                    return (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={thickness}
                            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            style={{
                                transform: 'rotate(-90deg)',
                                transformOrigin: '50% 50%',
                                transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease',
                                filter: `drop-shadow(0 0 4px ${seg.color}40)`,
                            }}
                        />
                    );
                })}
            </svg>
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>{total}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                    total
                </Typography>
            </Box>
        </Box>
    );
}

// ============================================================================
// DonutLegend
// ============================================================================

export function DonutLegend({ segments }: { readonly segments: readonly DonutSegment[] }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    return (
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            {segments.map((seg, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                            {seg.label}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        {seg.value}
                        {total > 0 && (
                            <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: 'text.disabled', ml: 0.5, fontWeight: 400 }}
                            >
                                {Math.round((seg.value / total) * 100)}%
                            </Typography>
                        )}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}
