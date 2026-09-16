/**
 * Airtightness Test LP Step Modal (Step ID: 10)
 * @module features/edit-airtightness
 *
 * Refactored to use StepModalLayout for reduced duplication.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Autocomplete, Box, Chip, TextField, Stack, Grid2, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AirtightnessStep,
    useCreateAirtightnessStep,
    useUpdateAirtightnessStep,
    useDeleteAirtightnessStep,
    type CommonGasDataOptional,
} from '@entities/fsec/steps';
import { useEmbases, getEtalonnageStatus, type Embase } from '@entities/embase';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage, softChipSx } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';
import { EmbaseDetailCard } from '@features/embase/shared';

interface AirtightnessStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: AirtightnessStep | null;
    /** Données communes à utiliser comme valeurs par défaut si le step n'en a pas */
    commonData?: CommonGasDataOptional;
    /** Phase de l'embase à filtrer ('BP' pour cat 1/3-BP, 'HP' pour cat 2/3-HP/4). Default 'BP'. */
    phase?: 'BP' | 'HP';
}

const AirtightnessStepFormSchema = z.object({
    embaseId: z.string().uuid().nullable().optional(),
    leakRateDtri: z.string().nullable().optional(),
    gasType: z.string().nullable().optional(),
    experimentPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    airtightnessTestDuration: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    dateOfFulfilment: z.date({ required_error: 'Date requise' }),
});

type AirtightnessStepForm = z.infer<typeof AirtightnessStepFormSchema>;

const DEFAULT_VALUES: Partial<AirtightnessStepForm> = {
    embaseId: null,
    leakRateDtri: null,
    gasType: null,
    experimentPressure: null,
    airtightnessTestDuration: null,
    operatorUserUuid: '',
    dateOfFulfilment: undefined,
};

export function AirtightnessStepModal({
    open,
    onClose,
    fsecVersionId,
    step,
    commonData,
    phase = 'BP',
}: AirtightnessStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateAirtightnessStep();
    const updateMutation = useUpdateAirtightnessStep();
    const deleteMutation = useDeleteAirtightnessStep();
    const { showNotification } = useNotification();

    // En édition, on s'aligne sur la phase du step existant ; sinon on utilise la prop.
    const effectivePhase = step?.phase ?? phase;
    const embaseTypeForPhase = effectivePhase === 'HP' ? 'hp' : 'bp';

    const { data: allEmbases = [] } = useEmbases();
    const filteredEmbases = useMemo(
        () => allEmbases.filter((e: Embase) => e.type === embaseTypeForPhase),
        [allEmbases, embaseTypeForPhase],
    );

    const { control, handleSubmit, reset, watch } = useForm<AirtightnessStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(AirtightnessStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const selectedEmbaseId = watch('embaseId');
    const selectedEmbase = useMemo(
        () => filteredEmbases.find((e: Embase) => e.uuid === selectedEmbaseId) ?? null,
        [filteredEmbases, selectedEmbaseId],
    );

    // Reset uniquement à l'ouverture (pas à chaque changement de référence de commonData,
    // sinon ça écrase ce que l'utilisateur est en train de taper).
    useEffect(() => {
        if (!open) return;
        reset(
            step
                ? {
                      embaseId: step.embaseId ?? null,
                      leakRateDtri: step.leakRateDtri ?? commonData?.leakRateDtri ?? null,
                      gasType: step.gasType ?? commonData?.gasType ?? null,
                      experimentPressure: step.experimentPressure ?? commonData?.experimentPressure ?? null,
                      airtightnessTestDuration:
                          step.airtightnessTestDuration ?? commonData?.airtightnessTestDuration ?? null,
                      operatorUserUuid: step.operatorUserUuid ?? '',
                      dateOfFulfilment: step.dateOfFulfilment ?? undefined,
                  }
                : {
                      ...DEFAULT_VALUES,
                      leakRateDtri: commonData?.leakRateDtri ?? null,
                      gasType: commonData?.gasType ?? null,
                      experimentPressure: commonData?.experimentPressure ?? null,
                      airtightnessTestDuration: commonData?.airtightnessTestDuration ?? null,
                  },
        );
        setShowDeleteConfirm(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, step?.uuid]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: AirtightnessStepForm) => {
            if (isPending) return;
            try {
                if (isEditMode && step) {
                    // Préserve la phase (BP/HP) en édition, sinon le backend la réinitialise à 'BP'.
                    await updateMutation.mutateAsync({
                        uuid: step.uuid,
                        fsecVersionId,
                        ...data,
                        phase: step.phase,
                    });
                    showNotification("Test d'étanchéité mis à jour", 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data, phase: effectivePhase });
                    showNotification("Test d'étanchéité créé", 'success');
                }
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [
            isPending,
            isEditMode,
            step,
            fsecVersionId,
            updateMutation,
            createMutation,
            showNotification,
            onClose,
            effectivePhase,
        ],
    );

    const handleDelete = useCallback(async () => {
        if (!step) return;
        try {
            await deleteMutation.mutateAsync({ uuid: step.uuid, fsecVersionId });
            showNotification("Test d'étanchéité supprimé", 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouveau test d'étanchéité BP"
            editTitle="Modifier le test d'étanchéité BP"
            isEditMode={isEditMode}
            isPending={isPending}
            isDeleting={deleteMutation.isPending}
            showDeleteConfirm={showDeleteConfirm}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
            onHideDeleteConfirm={() => setShowDeleteConfirm(false)}
            onDelete={handleDelete}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="sm"
        >
            <Stack spacing={3}>
                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="dateOfFulfilment"
                            control={control}
                            render={({ field: { value, onChange, ...field }, fieldState }) => (
                                <DatePicker
                                    {...field}
                                    label="Date de réalisation"
                                    value={value ? dayjs(value) : null}
                                    onChange={(date) => onChange(date?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            required: true,
                                            error: Boolean(fieldState.error),
                                            helperText: fieldState.error?.message,
                                            inputProps: { 'aria-label': 'Date de réalisation' },
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="operatorUserUuid"
                            control={control}
                            render={({ field, fieldState }) => (
                                <UserSelect
                                    value={field.value || null}
                                    onChange={(uuid) => field.onChange(uuid ?? '')}
                                    roles={[...SPECTRE_OPERATOR_ROLES]}
                                    label="Opérateur"
                                    required
                                    error={Boolean(fieldState.error)}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Controller
                    name="embaseId"
                    control={control}
                    render={({ field: { onChange } }) => (
                        <Autocomplete
                            options={filteredEmbases}
                            value={selectedEmbase}
                            onChange={(_, newValue) => onChange(newValue?.uuid ?? null)}
                            getOptionLabel={(option: Embase) => option.identifier}
                            isOptionEqualToValue={(option, value) => option.uuid === value.uuid}
                            size="small"
                            renderOption={(props, option) => {
                                const etal = getEtalonnageStatus(option.lastEtalonnageDateV1);
                                return (
                                    <li {...props} key={option.uuid}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40 }}>
                                                {option.identifier}
                                            </Typography>
                                            <Chip label={etal.label} sx={softChipSx(etal.color)} />
                                            {option.localisationActuelle && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Loc: {option.localisationActuelle}
                                                </Typography>
                                            )}
                                        </Box>
                                    </li>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={`Embase ${effectivePhase}`}
                                    placeholder={`Sélectionner une embase ${effectivePhase}`}
                                    inputProps={{
                                        ...params.inputProps,
                                        'aria-label': `Embase ${effectivePhase}`,
                                    }}
                                />
                            )}
                        />
                    )}
                />

                {selectedEmbase && <EmbaseDetailCard embase={selectedEmbase} />}

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="gasType"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Type de gaz"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Type de gaz' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="leakRateDtri"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Taux de fuite DTRI"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Taux de fuite DTRI' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="experimentPressure"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression d'expérimentation (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    error={Boolean(fieldState.error)}
                                    helperText={fieldState.error?.message}
                                    inputProps={{ step: 0.01, 'aria-label': "Pression d'expérimentation en bar" }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="airtightnessTestDuration"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Durée du test (min)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    error={Boolean(fieldState.error)}
                                    helperText={fieldState.error?.message}
                                    inputProps={{ min: 0, 'aria-label': 'Durée du test en minutes' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>
            </Stack>
        </StepModalLayout>
    );
}
