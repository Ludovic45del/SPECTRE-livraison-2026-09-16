import { memo, useMemo } from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { V1_COLOR, V2_COLOR } from './voie-colors';

export interface ComparisonMetric {
    label: string;
    v1: number | null;
    v2: number | null;
    unit: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface BarRowProps {
    voieLabel: string;
    voieColor: string;
    bgColor: string;
    value: number | null;
    barSx: SxProps<Theme>;
    mt?: number;
}

const BarRow = memo(function BarRow({ voieLabel, voieColor, bgColor, value, barSx, mt }: BarRowProps) {
    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={mt ? { mt } : undefined}>
            <Typography variant="caption" sx={{ minWidth: 24, fontWeight: 700, color: voieColor }}>
                {voieLabel}
            </Typography>
            <Box
                sx={{
                    flex: 1,
                    bgcolor: bgColor,
                    borderRadius: 1,
                    height: 28,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <Box sx={barSx}>
                    <Typography
                        variant="caption"
                        sx={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.7rem' }}
                    >
                        {value != null ? value : '-'}
                    </Typography>
                </Box>
            </Box>
        </Stack>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const ComparisonBar = memo(function ComparisonBar({
    metric,
    animated,
    index,
}: {
    metric: ComparisonMetric;
    animated: boolean;
    index: number;
}) {
    const v1 = Math.abs(metric.v1 ?? 0);
    const v2 = Math.abs(metric.v2 ?? 0);
    const maxVal = Math.max(v1, v2, 0.001);
    const v1Pct = (v1 / maxVal) * 100;
    const v2Pct = (v2 / maxVal) * 100;
    const delay = index * 0.12;
    const hasValue = metric.v1 != null || metric.v2 != null;

    const barSxBase = (color: string, pct: number, extraDelay: number) => ({
        position: 'absolute' as const,
        top: 0,
        left: 0,
        height: '100%',
        bgcolor: color,
        borderRadius: 1,
        width: animated ? `${Math.max(pct, 8)}%` : '0%',
        transition: `width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay + extraDelay}s`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        px: 1.5,
        minWidth: hasValue ? 50 : 0,
    });

    const v1BarSx = useMemo(() => barSxBase(V1_COLOR, v1Pct, 0), [animated, v1Pct, delay, hasValue]);
    const v2BarSx = useMemo(() => barSxBase(V2_COLOR, v2Pct, 0.1), [animated, v2Pct, delay, hasValue]);

    return (
        <Box
            sx={{
                mb: 2.5,
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(10px)',
                transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                    {metric.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {metric.unit}
                </Typography>
            </Stack>
            <BarRow voieLabel="V1" voieColor={V1_COLOR} bgColor="#e3f2fd" value={metric.v1} barSx={v1BarSx} />
            <BarRow voieLabel="V2" voieColor={V2_COLOR} bgColor="#f3e5f5" value={metric.v2} barSx={v2BarSx} mt={0.5} />
        </Box>
    );
});
