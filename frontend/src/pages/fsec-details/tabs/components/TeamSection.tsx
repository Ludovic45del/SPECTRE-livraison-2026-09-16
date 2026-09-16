/**
 * Team Section for FSEC Overview Tab
 * @module pages/fsec-details/tabs/components
 *
 * Displays the project team inherited from the campaign (read-only).
 */

import { Divider, Grid, Paper, Typography } from '@mui/material';
import { CampaignTeamMember } from '@entities/campaign/team';
import { UserChip } from '@entities/user';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TeamSectionProps {
    campaignTeam?: CampaignTeamMember[];
    paperSx: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeamSection({ campaignTeam, paperSx }: TeamSectionProps) {
    // Get team members by role from campaign (0=MOE, 1=RCE, 2=IEC)
    const moe = campaignTeam?.find((m) => m.role?.id === 0);
    const rce = campaignTeam?.find((m) => m.role?.id === 1);
    const iec = campaignTeam?.find((m) => m.role?.id === 2);

    return (
        <Paper variant="outlined" sx={paperSx}>
            <Typography variant="h6" mb={2}>
                Équipe Projet{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                    (héritée de la campagne)
                </Typography>
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
                <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                        RCE
                    </Typography>
                    <UserChip userUuid={rce?.userUuid} fallbackText={rce?.name} />
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                        MOE
                    </Typography>
                    <UserChip fallbackText={moe?.name} />
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                        IEC
                    </Typography>
                    <UserChip userUuid={iec?.userUuid} fallbackText={iec?.name} />
                </Grid>
            </Grid>
        </Paper>
    );
}
