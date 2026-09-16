/**
 * FA KPI Summary Bar
 * @module pages/fas
 *
 * Displays status counts, criticality distribution, and resolution rate
 */

import { useMemo, memo } from 'react';
import { Box, Paper, Typography, Stack, Divider } from '@mui/material';
import { type Fa, FA_STATUSES, FA_CRITICALITIES, FA_TYPES } from '@entities/fa';
import { DataChip } from '@widgets/data-chip';

// ============================================================================
// Types
// ============================================================================

interface FaKpiBarProps {
    fas: Fa[];
}

// ============================================================================
// Component
// ============================================================================

export const FaKpiBar = memo(function FaKpiBar({ fas }: FaKpiBarProps) {
    const { statusCounts, criticalityCounts, typeCounts, resolutionRate } = useMemo(() => {
        const sc = { 0: 0, 1: 0, 2: 0 } as Record<number, number>;
        const cc = { 0: 0, 1: 0, 2: 0, 3: 0 } as Record<number, number>;
        const tc = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;

        for (const fa of fas) {
            if (fa.statusId != null && sc[fa.statusId] !== undefined) sc[fa.statusId]++;
            if (fa.criticalityId != null && cc[fa.criticalityId] !== undefined) cc[fa.criticalityId]++;
            if (fa.typeId != null && tc[fa.typeId] !== undefined) tc[fa.typeId]++;
        }

        const total = fas.length;
        const rate = total > 0 ? Math.round((sc[2] / total) * 100) : 0;

        return { statusCounts: sc, criticalityCounts: cc, typeCounts: tc, resolutionRate: rate };
    }, [fas]);

    return (
        <Paper
            variant="outlined"
            sx={{
                px: 3,
                py: 1.5,
                mb: 3,
                borderRadius: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
            }}
        >
            {/* Status counts */}
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
                    Statuts
                </Typography>
                {([0, 1, 2] as const).map((id) => (
                    <DataChip
                        key={id}
                        label={`${FA_STATUSES[id].label}: ${statusCounts[id]}`}
                        color={FA_STATUSES[id].color}
                    />
                ))}
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Criticality counts */}
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
                    Criticité
                </Typography>
                {([0, 1, 2, 3] as const).map((id) => (
                    <Box
                        key={id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}
                    >
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: FA_CRITICALITIES[id].color,
                                flexShrink: 0,
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {criticalityCounts[id]}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Type 5M counts */}
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
                    Type 5M
                </Typography>
                {([0, 1, 2, 3, 4] as const).map((id) => (
                    <Box
                        key={id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}
                    >
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: FA_TYPES[id].color,
                                flexShrink: 0,
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {typeCounts[id]}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            <Divider orientation="vertical" flexItem />

            {/* Resolution rate */}
            <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Résolution
                </Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">
                    {resolutionRate}%
                </Typography>
            </Stack>
        </Paper>
    );
});
