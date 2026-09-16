/**
 * Team Section - MOE, RCE, IEC members
 * @module pages/campaign-details/overview/components
 *
 * MOE est saisi en texte libre (intervenant extérieur au labo).
 * RCE et IEC sont sélectionnés via UserSelect (FK vers UserProfile).
 */

import { memo } from 'react';
import { Box, Grid, Paper, Typography, IconButton } from '@mui/material';
import { CampaignWithRelations } from '@entities/campaign';
import { getMemberByRole } from '@entities/campaign/team';
import { UserChip } from '@entities/user';
import { TeamMemberInput } from '@widgets/team-member-input';
import EditIcon from '@mui/icons-material/Edit';
import { useCampaignTeamForm } from '../hooks';
import { SectionHeader } from './SectionHeader';
import { FormActions } from './FormActions';
import { EDIT_BUTTON_SX, PAPER_BASE_SX } from './styles';

export interface TeamSectionProps {
    campaign: CampaignWithRelations;
}

export const TeamSection = memo(function TeamSection({ campaign }: TeamSectionProps) {
    const { form, isEditing, isSaving, teamMembers, setField, startEditing, cancelEditing, save } =
        useCampaignTeamForm(campaign);

    const moeMember = getMemberByRole(teamMembers, 'MOE');
    const rceMember = getMemberByRole(teamMembers, 'RCE');
    const iecMember = getMemberByRole(teamMembers, 'IEC');

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX} role="region" aria-label="Équipe de la campagne">
            {!isEditing && (
                <IconButton size="small" onClick={startEditing} sx={EDIT_BUTTON_SX} aria-label="Modifier l'équipe">
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <SectionHeader title="Équipe" />

            {isEditing ? (
                <Box
                    component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TeamMemberInput
                                roleLabel="MOE"
                                value={{ name: form.moeName, userUuid: null }}
                                onChange={(v) => setField('moeName', v.name ?? '')}
                                label="MOE"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TeamMemberInput
                                roleLabel="RCE"
                                value={{ name: null, userUuid: form.rceUserUuid || null }}
                                onChange={(v) => setField('rceUserUuid', v.userUuid ?? '')}
                                label="RCE"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TeamMemberInput
                                roleLabel="IEC"
                                value={{ name: null, userUuid: form.iecUserUuid || null }}
                                onChange={(v) => setField('iecUserUuid', v.userUuid ?? '')}
                                label="IEC"
                            />
                        </Grid>
                    </Grid>
                    <FormActions onCancel={cancelEditing} isSaving={isSaving} />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            MOE
                        </Typography>
                        <UserChip fallbackText={moeMember?.name} />
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            RCE
                        </Typography>
                        <UserChip userUuid={rceMember?.userUuid} fallbackText={rceMember?.name} />
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            IEC
                        </Typography>
                        <UserChip userUuid={iecMember?.userUuid} fallbackText={iecMember?.name} />
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
});
