/**
 * Phase En Cours Edit Mode Sub-Component
 * @module pages/fa-details/sections
 *
 * Form for editing Phase 2 (En cours) fields
 */

import { memo } from 'react';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { FA_TYPE_LIST, FA_CRITICALITY_LIST } from '@entities/fa';
import { ColorDot } from '@shared/ui';
import { FormActions } from '@pages/campaign-details/overview/components/FormActions';

// ============================================================================
// Types
// ============================================================================

export interface PhaseEnCoursForm {
    cause: string;
    typeId: number | null;
    experienceImpact: string;
    criticalityId: number | null;
}

interface EditModeProps {
    form: PhaseEnCoursForm;
    setForm: React.Dispatch<React.SetStateAction<PhaseEnCoursForm>>;
    onCancel: () => void;
    onSave: () => void;
    isPending: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PhaseEnCoursEditMode = memo(function PhaseEnCoursEditMode({
    form,
    setForm,
    onCancel,
    onSave,
    isPending,
}: EditModeProps) {
    return (
        <Box
            component="form"
            role="form"
            aria-label="Formulaire d'édition Phase 2"
            onSubmit={(e) => {
                e.preventDefault();
                onSave();
            }}
        >
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="type-5m-label">Type (5M)</InputLabel>
                        <Select
                            labelId="type-5m-label"
                            value={form.typeId ?? ''}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    typeId: e.target.value === '' ? null : Number(e.target.value),
                                }))
                            }
                            label="Type (5M)"
                            inputProps={{ 'aria-describedby': 'type-5m-help' }}
                        >
                            <MenuItem value="">-</MenuItem>
                            {FA_TYPE_LIST.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ColorDot color={t.color} aria-hidden="true" />
                                        {t.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="criticality-label">Criticité</InputLabel>
                        <Select
                            labelId="criticality-label"
                            value={form.criticalityId ?? ''}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    criticalityId: e.target.value === '' ? null : Number(e.target.value),
                                }))
                            }
                            label="Criticité"
                            inputProps={{ 'aria-describedby': 'criticality-help' }}
                        >
                            <MenuItem value="">-</MenuItem>
                            {FA_CRITICALITY_LIST.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ColorDot color={c.color} aria-hidden="true" />
                                        {c.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Cause identifiée"
                        value={form.cause}
                        onChange={(e) => setForm((prev) => ({ ...prev, cause: e.target.value }))}
                        multiline
                        rows={3}
                        size="small"
                        fullWidth
                        inputProps={{ 'aria-label': "Cause identifiée de l'anomalie" }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Impact sur l'expérience"
                        value={form.experienceImpact}
                        onChange={(e) => setForm((prev) => ({ ...prev, experienceImpact: e.target.value }))}
                        multiline
                        rows={3}
                        size="small"
                        fullWidth
                        inputProps={{ 'aria-label': "Impact de l'anomalie sur l'expérience" }}
                    />
                </Grid>
            </Grid>
            <FormActions onCancel={onCancel} isSaving={isPending} />
        </Box>
    );
});
