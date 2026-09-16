/**
 * General Info Section - Campaign name, year, semester, type, installation, DTRI, description
 * @module pages/campaign-details/overview/components
 */

import { memo } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    TextField,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material';
import { DataChip } from '@widgets/data-chip';
import { ChipSelect } from '@widgets/chip-select';
import { CampaignWithRelations } from '@entities/campaign';
import { CAMPAIGN_TYPES, CAMPAIGN_INSTALLATIONS } from '@entities/campaign/core/lib';
import EditIcon from '@mui/icons-material/Edit';
import { useCampaignGeneralForm } from '../hooks';
import { SectionHeader } from './SectionHeader';
import { FormActions } from './FormActions';
import { EDIT_BUTTON_SX, PAPER_BASE_SX } from './styles';

const TYPE_OPTIONS = Object.values(CAMPAIGN_TYPES).map((t) => ({
    value: t.id,
    label: t.label,
    color: t.color || '#999',
}));

const INSTALLATION_OPTIONS = Object.values(CAMPAIGN_INSTALLATIONS).map((i) => ({
    value: i.id,
    label: i.label,
    color: i.color || '#999',
}));

export interface GeneralInfoSectionProps {
    campaign: CampaignWithRelations;
}

export const GeneralInfoSection = memo(function GeneralInfoSection({ campaign }: GeneralInfoSectionProps) {
    const { form, errors, isEditing, isSaving, setField, startEditing, cancelEditing, save } =
        useCampaignGeneralForm(campaign);

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX} role="region" aria-label="Informations générales de la campagne">
            {!isEditing && (
                <IconButton
                    size="small"
                    onClick={startEditing}
                    sx={EDIT_BUTTON_SX}
                    aria-label="Modifier les informations générales"
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <SectionHeader title="Informations Générales" />

            {isEditing ? (
                <Box
                    component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Nom"
                                value={form.name}
                                onChange={(e) => setField('name', e.target.value)}
                                size="small"
                                fullWidth
                                required
                                error={!!errors.name}
                                helperText={errors.name}
                                inputProps={{ 'aria-describedby': errors.name ? 'name-error' : undefined }}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <TextField
                                label="Année"
                                type="number"
                                value={form.year}
                                onChange={(e) => setField('year', Number(e.target.value))}
                                size="small"
                                fullWidth
                                required
                                error={!!errors.year}
                                helperText={errors.year}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <FormControl size="small" fullWidth required>
                                <InputLabel>Semestre</InputLabel>
                                <Select
                                    value={form.semester}
                                    onChange={(e) => setField('semester', e.target.value as 'S1' | 'S2')}
                                    label="Semestre"
                                >
                                    <MenuItem value="S1">S1</MenuItem>
                                    <MenuItem value="S2">S2</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.typeId}>
                                <ChipSelect
                                    label="Type"
                                    options={TYPE_OPTIONS}
                                    value={form.typeId ?? ''}
                                    onChange={(e) => setField('typeId', e.target.value as number)}
                                    required
                                />
                                {errors.typeId && <FormHelperText error>{errors.typeId}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.installationId}>
                                <ChipSelect
                                    label="Installation"
                                    options={INSTALLATION_OPTIONS}
                                    value={form.installationId ?? ''}
                                    onChange={(e) => setField('installationId', e.target.value as number)}
                                    required
                                />
                                {errors.installationId && (
                                    <FormHelperText error>{errors.installationId}</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="N° DTRI"
                                type="number"
                                value={form.dtriNumber ?? ''}
                                onChange={(e) => setField('dtriNumber', e.target.value ? Number(e.target.value) : null)}
                                size="small"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                value={form.description}
                                onChange={(e) => setField('description', e.target.value)}
                                multiline
                                rows={2}
                                size="small"
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                    <FormActions onCancel={cancelEditing} isSaving={isSaving} />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Nom
                        </Typography>
                        <Typography variant="body1">{campaign.name}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Année
                        </Typography>
                        <Typography variant="body1">{campaign.year}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Semestre
                        </Typography>
                        <DataChip label={campaign.semester} color="#6B7280" />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Type
                        </Typography>
                        <DataChip label={campaign.type?.label ?? '-'} color={campaign.type?.color ?? '#999'} />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Installation
                        </Typography>
                        <DataChip
                            label={campaign.installation?.label ?? '-'}
                            color={campaign.installation?.color ?? '#999'}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                            N° DTRI
                        </Typography>
                        <Typography variant="body1">{campaign.dtriNumber ?? '-'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Description
                        </Typography>
                        <Typography variant="body1">{campaign.description || '-'}</Typography>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
});
