/**
 * Depressurization Step Modal (Step ID: 13)
 * @module features/edit-depressurization
 *
 * Refactored to use StepModalLayout for reduced duplication.
 */

import { useState, useEffect, useCallback } from 'react';
import { TextField, Stack, Grid2 } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    DepressurizationStep,
    useCreateDepressurizationStep,
    useUpdateDepressurizationStep,
    useDeleteDepressurizationStep,
} from '@entities/fsec/steps';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface DepressurizationStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: DepressurizationStep | null;
}

const DepressurizationStepFormSchema = z.object({
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    dateOfFulfilment: z.date({ required_error: 'Date requise' }),
    pressureGauge: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    enclosurePressureMeasured: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    startTime: z.date().nullable().optional(),
    endTime: z.date().nullable().optional(),
    observations: z.string().nullable().optional(),
    depressurizationTimeBeforeFiring: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    computedPressureBeforeFiring: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
});

type DepressurizationStepForm = z.infer<typeof DepressurizationStepFormSchema>;

const DEFAULT_VALUES: Partial<DepressurizationStepForm> = {
    operatorUserUuid: '',
    dateOfFulfilment: undefined,
    pressureGauge: null,
    enclosurePressureMeasured: null,
    startTime: null,
    endTime: null,
    observations: null,
    depressurizationTimeBeforeFiring: null,
    computedPressureBeforeFiring: null,
};

export function DepressurizationStepModal({ open, onClose, fsecVersionId, step }: DepressurizationStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateDepressurizationStep();
    const updateMutation = useUpdateDepressurizationStep();
    const deleteMutation = useDeleteDepressurizationStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<DepressurizationStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(DepressurizationStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        if (open) {
            reset(
                step
                    ? {
                          operatorUserUuid: step.operatorUserUuid ?? '',
                          dateOfFulfilment: step.dateOfFulfilment ?? undefined,
                          pressureGauge: step.pressureGauge,
                          enclosurePressureMeasured: step.enclosurePressureMeasured,
                          startTime: step.startTime,
                          endTime: step.endTime,
                          observations: step.observations,
                          depressurizationTimeBeforeFiring: step.depressurizationTimeBeforeFiring,
                          computedPressureBeforeFiring: step.computedPressureBeforeFiring,
                      }
                    : DEFAULT_VALUES,
            );
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: DepressurizationStepForm) => {
            if (isPending) return;
            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({ uuid: step.uuid, fsecVersionId, ...data });
                    showNotification('Dépressurisation mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data });
                    showNotification('Dépressurisation créée', 'success');
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
            showNotification('Dépressurisation supprimée', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouvelle dépressurisation"
            editTitle="Modifier la dépressurisation"
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

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="startTime"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <TimePicker
                                    {...field}
                                    label="Heure de début"
                                    value={value ? dayjs(value) : null}
                                    onChange={(time) => onChange(time?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Heure de début' },
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="endTime"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <TimePicker
                                    {...field}
                                    label="Heure de fin"
                                    value={value ? dayjs(value) : null}
                                    onChange={(time) => onChange(time?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Heure de fin' },
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="pressureGauge"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Jauge de pression"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Jauge de pression' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="enclosurePressureMeasured"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression enceinte mesurée (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Pression enceinte mesurée en bar' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="depressurizationTimeBeforeFiring"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Temps dépressurisation avant tir (min)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Temps dépressurisation avant tir en minutes' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="computedPressureBeforeFiring"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression calculée avant tir (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Pression calculée avant tir en bar' }}
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
