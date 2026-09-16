/**
 * Radar Section Component
 * @module features/embase/comparaison-tab
 *
 * Affiche le graphique radar de comparaison V1/V2.
 */

import { memo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { V1_COLOR, V2_COLOR } from './voie-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RadarDataPoint {
    metric: string;
    V1: number;
    V2: number;
}

interface RadarSectionProps {
    radarData: RadarDataPoint[];
    animated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────────

const dotSx = (color: string) => ({ width: 12, height: 12, borderRadius: '50%', bgcolor: color });

const RadarLegend = memo(function RadarLegend() {
    return (
        <Stack direction="row" spacing={2}>
            <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={dotSx(V1_COLOR)} />
                <Typography variant="caption" fontWeight={600}>
                    Voie V1
                </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={dotSx(V2_COLOR)} />
                <Typography variant="caption" fontWeight={600}>
                    Voie V2
                </Typography>
            </Stack>
        </Stack>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const RadarSection = memo(function RadarSection({ radarData, animated }: RadarSectionProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: 1,
                opacity: animated ? 1 : 0,
                transform: animated ? 'scale(1)' : 'scale(0.92)',
                transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                    Comparaison radar
                </Typography>
                <RadarLegend />
            </Stack>
            <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#e0e0e0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#666' }} />
                    <Radar
                        name="Voie V1"
                        dataKey="V1"
                        stroke={V1_COLOR}
                        fill={V1_COLOR}
                        fillOpacity={0.2}
                        strokeWidth={2}
                    />
                    <Radar
                        name="Voie V2"
                        dataKey="V2"
                        stroke={V2_COLOR}
                        fill={V2_COLOR}
                        fillOpacity={0.15}
                        strokeWidth={2}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </Paper>
    );
});
