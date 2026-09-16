/**
 * Phase En Cours View Mode Sub-Component
 * @module pages/fa-details/sections
 *
 * Read-only display of Phase 2 (En cours) fields
 */

import { memo } from 'react';
import { Box, Paper, Typography, Stack, Grid } from '@mui/material';
import { Fa } from '@entities/fa';
import { DataChip } from '@widgets/data-chip';

// ============================================================================
// Types
// ============================================================================

interface ViewModeProps {
    fa: Fa;
    typeInfo: { label: string; color: string };
    criticalityInfo: { label: string; color: string };
}

// ============================================================================
// Component
// ============================================================================

export const PhaseEnCoursViewMode = memo(function PhaseEnCoursViewMode({
    fa,
    typeInfo,
    criticalityInfo,
}: ViewModeProps) {
    return (
        <Stack spacing={2}>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Type (5M)
                    </Typography>
                    {fa.typeId !== null && fa.typeId !== undefined ? (
                        <DataChip label={typeInfo.label} color={typeInfo.color} />
                    ) : (
                        <Typography variant="body1" fontWeight="medium">
                            -
                        </Typography>
                    )}
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Criticité
                    </Typography>
                    {fa.criticalityId !== null && fa.criticalityId !== undefined ? (
                        <DataChip label={criticalityInfo.label} color={criticalityInfo.color} />
                    ) : (
                        <Typography variant="body1" fontWeight="medium">
                            -
                        </Typography>
                    )}
                </Grid>
            </Grid>

            <Box>
                <Typography variant="subtitle2" color="text.secondary">
                    Cause identifiée
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {fa.cause || '-'}
                    </Typography>
                </Paper>
            </Box>

            <Box>
                <Typography variant="subtitle2" color="text.secondary">
                    Impact sur l'expérience
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {fa.experienceImpact || '-'}
                    </Typography>
                </Paper>
            </Box>
        </Stack>
    );
});
