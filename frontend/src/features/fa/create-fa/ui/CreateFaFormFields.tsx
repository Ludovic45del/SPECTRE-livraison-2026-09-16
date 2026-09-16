/**
 * Create FA Form Fields
 * @module features/fa/create-fa
 *
 * Form fields for the Phase Ouvert section of a new FA.
 */

import { memo } from 'react';
import { Stack, TextField, Typography, Divider, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Controller, useWatch } from 'react-hook-form';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';

import type { CampaignWithRelations } from '@entities/campaign';
import type { Fsec } from '@entities/fsec';
import { UserSelect } from '@entities/user';
import { FSEC_STEP_LIST, FSEC_STEP_ID } from '@entities/fa';
import type { CreateFaForm } from '../model';
import { CampaignFsecSelector } from './CampaignFsecSelector';

interface CreateFaFormFieldsProps {
    control: Control<CreateFaForm>;
    errors: FieldErrors<CreateFaForm>;
    setValue: UseFormSetValue<CreateFaForm>;
    campaigns: CampaignWithRelations[] | undefined;
    availableFsecs: Fsec[];
    selectedCampaignId: string;
}

export const CreateFaFormFields = memo(function CreateFaFormFields({
    control,
    errors,
    setValue,
    campaigns,
    availableFsecs,
    selectedCampaignId,
}: CreateFaFormFieldsProps) {
    const watchedStepId = useWatch({ control, name: 'fsecStepId' });
    const isAutreStep = watchedStepId === FSEC_STEP_ID.AUTRE;

    return (
        <Stack spacing={3}>
            <CampaignFsecSelector
                control={control}
                errors={errors}
                setValue={setValue}
                campaigns={campaigns}
                availableFsecs={availableFsecs}
                selectedCampaignId={selectedCampaignId}
            />

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" color="text.secondary">
                Informations de l'anomalie
            </Typography>

            <Controller
                name="fsecStepId"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        select
                        value={field.value ?? ''}
                        onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(raw === '' ? null : Number(raw));
                            if (Number(raw) !== FSEC_STEP_ID.AUTRE) {
                                setValue('fsecStepOther', '');
                            }
                        }}
                        label="Étape FSEC"
                        fullWidth
                    >
                        <MenuItem value="">-</MenuItem>
                        {FSEC_STEP_LIST.map((step) => (
                            <MenuItem key={step.id} value={step.id}>
                                {step.label}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            />

            {isAutreStep && (
                <Controller
                    name="fsecStepOther"
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Préciser l'étape"
                            placeholder="Précisez l'étape..."
                            required
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            fullWidth
                        />
                    )}
                />
            )}

            <Controller
                name="discovererUserUuid"
                control={control}
                render={({ field, fieldState }) => (
                    <UserSelect
                        value={field.value || null}
                        onChange={(uuid) => field.onChange(uuid ?? '')}
                        label="Découvreur"
                        required
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                    />
                )}
            />

            <Controller
                name="eventDate"
                control={control}
                render={({ field }) => (
                    <DatePicker
                        label="Date de l'évènement"
                        value={field.value}
                        onChange={(date) => field.onChange(date)}
                        slotProps={{
                            textField: {
                                required: true,
                                error: Boolean(errors.eventDate),
                                helperText: errors.eventDate?.message,
                                fullWidth: true,
                            },
                        }}
                    />
                )}
            />

            <Controller
                name="observation"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Constat"
                        required
                        multiline
                        rows={2}
                        error={Boolean(errors.observation)}
                        helperText={errors.observation?.message}
                        fullWidth
                    />
                )}
            />

            <Controller
                name="locationEquipment"
                control={control}
                render={({ field }) => (
                    <TextField {...field} value={field.value ?? ''} label="Lieu / Équipement" fullWidth />
                )}
            />

            <Controller
                name="quickAnalysis"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Analyse rapide de l'évènement"
                        required
                        multiline
                        rows={2}
                        error={Boolean(errors.quickAnalysis)}
                        helperText={errors.quickAnalysis?.message}
                        fullWidth
                    />
                )}
            />

            <Controller
                name="immediateMeasures"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Mesures immédiates"
                        multiline
                        rows={2}
                        fullWidth
                    />
                )}
            />
        </Stack>
    );
});
