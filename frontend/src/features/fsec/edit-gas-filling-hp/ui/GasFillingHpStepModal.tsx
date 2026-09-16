/**
 * Gas Filling HP (High Pressure) Step Modal (Step ID: 9)
 * @module features/edit-gas-filling-hp
 *
 * Refactored to use StepModalLayout for reduced duplication.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TextField, Stack, Grid2, Autocomplete, Typography, Chip, Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    GasFillingHpStep,
    useCreateGasFillingHpStep,
    useUpdateGasFillingHpStep,
    useDeleteGasFillingHpStep,
} from '@entities/fsec/steps';
import { useEmbases, getEtalonnageStatus, type Embase } from '@entities/embase';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';
import { EmbaseDetailCard } from '@features/embase/shared';
import { softChipSx } from '@shared/lib';

interface GasFillingHpStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: GasFillingHpStep | null;
}

const GasFillingHpStepFormSchema = z.object({
    embaseId: z.string().uuid().nullable().optional(),
    leakRateDtri: z.string().nullable().optional(),
    gasType: z.string().nullable().optional(),
    experimentPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    dateOfFulfilment: z.date({ required_error: 'Date requise' }),
    gasContainer: z.number().nullable().optional(),
    observations: z.string().nullable().optional(),
});

type GasFillingHpStepForm = z.infer<typeof GasFillingHpStepFormSchema>;

const DEFAULT_VALUES: Partial<GasFillingHpStepForm> = {
    embaseId: null,
    leakRateDtri: null,
    gasType: null,
    experimentPressure: null,
    operatorUserUuid: '',
    dateOfFulfilment: undefined,
    gasContainer: null,
    observations: null,
};

export function GasFillingHpStepModal({ open, onClose, fsecVersionId, step }: GasFillingHpStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateGasFillingHpStep();
    const updateMutation = useUpdateGasFillingHpStep();
    const deleteMutation = useDeleteGasFillingHpStep();
    const { showNotification } = useNotification();

    const { data: allEmbases = [] } = useEmbases();
    const hpEmbases = useMemo(() => allEmbases.filter((e: Embase) => e.type === 'hp'), [allEmbases]);

    const { control, handleSubmit, reset, watch } = useForm<GasFillingHpStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(GasFillingHpStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const selectedEmbaseId = watch('embaseId');
    const selectedEmbase = useMemo(
        () => hpEmbases.find((e: Embase) => e.uuid === selectedEmbaseId) ?? null,
        [hpEmbases, selectedEmbaseId],
    );

    useEffect(() => {
        if (open) {
            reset(
                step
                    ? {
                          embaseId: step.embaseId,
                          leakRateDtri: step.leakRateDtri,
                          gasType: step.gasType,
                          experimentPressure: step.experimentPressure,
                          operatorUserUuid: step.operatorUserUuid ?? '',
                          dateOfFulfilment: step.dateOfFulfilment ?? undefined,
                          gasContainer: step.gasContainer,
                          observations: step.observations,
                      }
                    : DEFAULT_VALUES,
            );
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: GasFillingHpStepForm) => {
            if (isPending) return;
            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({ uuid: step.uuid, fsecVersionId, ...data });
                    showNotification('Remplissage HP mis à jour', 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data });
                    showNotification('Remplissage HP créé', 'success');
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
            showNotification('Remplissage HP supprimé', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouveau remplissage gaz HP"
            editTitle="Modifier le remplissage gaz HP"
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
                            render={({ field: { value, onChange, ...field } }) => (
                                <DatePicker
                                    {...field}
                                    label="Date de réalisation"
                                    value={value ? dayjs(value) : null}
                                    onChange={(date) => onChange(date?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
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
                            options={hpEmbases}
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
                                            {option.capteurV1 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Capteur: {option.capteurV1}
                                                </Typography>
                                            )}
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
                                    label="Embase"
                                    placeholder="Sélectionner une embase HP"
                                    inputProps={{ ...params.inputProps, 'aria-label': 'Embase' }}
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

                <Controller
                    name="experimentPressure"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                            label="Pression d'expérimentation (bar)"
                            type="number"
                            size="small"
                            fullWidth
                            inputProps={{ step: 0.01, 'aria-label': "Pression d'expérimentation en bar" }}
                        />
                    )}
                />

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
