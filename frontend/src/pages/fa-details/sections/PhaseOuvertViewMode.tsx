/**
 * Phase Ouvert View Mode Sub-Component
 * @module pages/fa-details/sections
 *
 * Read-only display of Phase 1 (Ouvert) fields
 */

import { memo } from 'react';
import { Box, Paper, Typography, Stack, Grid } from '@mui/material';
import { Fa, getFsecStepLabel, FSEC_STEP_ID } from '@entities/fa';
import { UserChip } from '@entities/user';
import { formatDateShort } from '@shared/lib';

// ============================================================================
// Types
// ============================================================================

interface ViewModeProps {
    fa: Fa;
}

// ============================================================================
// Component
// ============================================================================

export const PhaseOuvertViewMode = memo(function PhaseOuvertViewMode({ fa }: ViewModeProps) {
    return (
        <Stack spacing={2}>
            <Grid container spacing={2}>
                <Grid item xs={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Étape FSEC
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {fa.fsecStepId === FSEC_STEP_ID.AUTRE && fa.fsecStepOther
                            ? `Autre: ${fa.fsecStepOther}`
                            : getFsecStepLabel(fa.fsecStepId ?? null)}
                    </Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Date de l'évènement
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {formatDateShort(fa.eventDate)}
                    </Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Date d'ouverture
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {fa.iecValidationOpenDate ? formatDateShort(fa.iecValidationOpenDate) : '-'}
                    </Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Découvreur
                    </Typography>
                    <UserChip userUuid={fa.discovererUserUuid} fallbackText={fa.discoverer} />
                </Grid>
            </Grid>

            <Box>
                <Typography variant="subtitle2" color="text.secondary">
                    Lieu / Équipement
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                    {fa.locationEquipment || '-'}
                </Typography>
            </Box>

            <Box>
                <Typography variant="subtitle2" color="text.secondary">
                    Constat
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {fa.observation || '-'}
                    </Typography>
                </Paper>
            </Box>

            <Box>
                <Typography variant="subtitle2" color="text.secondary">
                    Analyse rapide
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {fa.quickAnalysis || '-'}
                    </Typography>
                </Paper>
            </Box>

            {fa.immediateMeasures && (
                <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Mesures immédiates
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {fa.immediateMeasures}
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Stack>
    );
});
