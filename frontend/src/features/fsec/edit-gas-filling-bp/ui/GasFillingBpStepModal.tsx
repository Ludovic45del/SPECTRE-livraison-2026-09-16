/**
 * Gas Filling BP (Low Pressure) Step Modal (Step ID: 11)
 * @module features/edit-gas-filling-bp
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
    GasFillingBpStep,
    useCreateGasFillingBpStep,
    useUpdateGasFillingBpStep,
    useDeleteGasFillingBpStep,
    type CommonGasDataOptional,
} from '@entities/fsec/steps';
import { useEmbases, getEtalonnageStatus, type Embase } from '@entities/embase';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage, softChipSx } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';
import { EmbaseDetailCard } from '@features/embase/shared';

interface GasFillingBpStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: GasFillingBpStep | null;
    /** Données communes à utiliser comme valeurs par défaut si le step n'en a pas */
    commonData?: CommonGasDataOptional;
}

const GasFillingBpStepFormSchema = z.object({
    embaseId: z.string().uuid().nullable().optional(),
    leakRateDtri: z.string().nullable().optional(),
    gasType: z.string().nullable().optional(),
    experimentPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    leakTestDuration: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    dateOfFulfilment: z.date({ required_error: 'Date requise' }),
    gasBase: z.number().nullable().optional(),
    gasContainer: z.number().nullable().optional(),
    observations: z.string().nullable().optional(),
});

type GasFillingBpStepForm = z.infer<typeof GasFillingBpStepFormSchema>;

const DEFAULT_VALUES: Partial<GasFillingBpStepForm> = {
    embaseId: null,
    leakRateDtri: null,
    gasType: null,
    experimentPressure: null,
    leakTestDuration: null,
    operatorUserUuid: '',
    dateOfFulfilment: undefined,
    gasBase: null,
    gasContainer: null,
    observations: null,
};

export function GasFillingBpStepModal({ open, onClose, fsecVersionId, step, commonData }: GasFillingBpStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateGasFillingBpStep();
    const updateMutation = useUpdateGasFillingBpStep();
    const deleteMutation = useDeleteGasFillingBpStep();
    const { showNotification } = useNotification();

    const { data: allEmbases = [] } = useEmbases();
    const bpEmbases = useMemo(() => allEmbases.filter((e: Embase) => e.type === 'bp'), [allEmbases]);

    const { control, handleSubmit, reset, watch } = useForm<GasFillingBpStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(GasFillingBpStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const selectedEmbaseId = watch('embaseId');
    const selectedEmbase = useMemo(
        () => bpEmbases.find((e: Embase) => e.uuid === selectedEmbaseId) ?? null,
        [bpEmbases, selectedEmbaseId],
    );

    // Reset uniquement à l'ouverture (sinon les nouvelles refs de commonData écrasent
    // ce que l'utilisateur tape).
    useEffect(() => {
        if (!open) return;
        reset(
            step
                ? {
                      embaseId: step.embaseId ?? null,
                      leakRateDtri: step.leakRateDtri ?? commonData?.leakRateDtri ?? null,
                      gasType: step.gasType ?? commonData?.gasType ?? null,
                      experimentPressure: step.experimentPressure ?? commonData?.experimentPressure ?? null,
                      leakTestDuration: step.leakTestDuration ?? commonData?.leakTestDuration ?? null,
                      operatorUserUuid: step.operatorUserUuid ?? '',
                      dateOfFulfilment: step.dateOfFulfilment ?? undefined,
                      gasBase: step.gasBase,
                      gasContainer: step.gasContainer,
                      observations: step.observations,
                  }
                : {
                      ...DEFAULT_VALUES,
                      leakRateDtri: commonData?.leakRateDtri ?? null,
                      gasType: commonData?.gasType ?? null,
                      experimentPressure: commonData?.experimentPressure ?? null,
                      leakTestDuration: commonData?.leakTestDuration ?? null,
                  },
        );
        setShowDeleteConfirm(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, step?.uuid]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: GasFillingBpStepForm) => {
            if (isPending) return;
            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({ uuid: step.uuid, fsecVersionId, ...data });
                    showNotification('Remplissage BP mis à jour', 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data });
                    showNotification('Remplissage BP créé', 'success');
                }
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [isPending, isEditMode, step, fsecVersionId, updateMutation, createMutation, showNotification, onClose],
    );

    const handleDelete = useCallback(async () => {
        if (!step) return;
        try {
            await deleteMutation.mutateAsync({ uuid: step.uuid, fsecVersionId });
            showNotification('Remplissage BP supprimé', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouveau remplissage gaz BP"
            editTitle="Modifier le remplissage gaz BP"
            isEditMode={isEditMode}
            isPending={isPending}
            isDeleting={deleteMutation.isPending}
            showDeleteConfirm={showDeleteConfirm}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
            onHideDeleteConfirm={() => setShowDeleteConfirm(false)}
            onDelete={handleDelete}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="md"
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
                            options={bpEmbases}
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
                                    label="Embase BP"
                                    placeholder="Sélectionner une embase BP"
                                    inputProps={{ ...params.inputProps, 'aria-label': 'Embase BP' }}
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
                            name="leakTestDuration"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Durée du test de fuite (min)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    error={Boolean(fieldState.error)}
                                    helperText={fieldState.error?.message}
                                    inputProps={{ min: 0, 'aria-label': 'Durée du test de fuite en minutes' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="gasBase"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))
                                    }
                                    label="Base de gaz"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Base de gaz' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="gasContainer"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))
                                    }
                                    label="Conteneur de gaz"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Conteneur de gaz' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Controller
                    name="observations"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Observations"
                            multiline
                            rows={3}
                            size="small"
                            fullWidth
                            inputProps={{ 'aria-label': 'Observations' }}
                        />
                    )}
                />
            </Stack>
        </StepModalLayout>
    );
}
