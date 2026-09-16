/**
 * Repressurization Step Modal (Step ID: 14)
 * @module features/edit-repressurization
 *
 * Refactored to use StepModalLayout for reduced duplication.
 */

import { useState, useEffect, useCallback } from 'react';
import { TextField, Stack, Grid2 } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    RepressurizationStep,
    useCreateRepressurizationStep,
    useUpdateRepressurizationStep,
    useDeleteRepressurizationStep,
} from '@entities/fsec/steps';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface RepressurizationStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: RepressurizationStep | null;
}

const RepressurizationStepFormSchema = z.object({
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    gasType: z.string().nullable().optional(),
    startDate: z.date({ required_error: 'Date requise' }),
    estimatedEndDate: z.date().nullable().optional(),
    sensorPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    computedPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
});

type RepressurizationStepForm = z.infer<typeof RepressurizationStepFormSchema>;

const DEFAULT_VALUES: Partial<RepressurizationStepForm> = {
    operatorUserUuid: '',
    gasType: null,
    startDate: undefined,
    estimatedEndDate: null,
    sensorPressure: null,
    computedPressure: null,
};

export function RepressurizationStepModal({ open, onClose, fsecVersionId, step }: RepressurizationStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateRepressurizationStep();
    const updateMutation = useUpdateRepressurizationStep();
    const deleteMutation = useDeleteRepressurizationStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<RepressurizationStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(RepressurizationStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        if (open) {
            reset(
                step
                    ? {
                          operatorUserUuid: step.operatorUserUuid ?? '',
                          gasType: step.gasType,
                          startDate: step.startDate ?? undefined,
                          estimatedEndDate: step.estimatedEndDate,
                          sensorPressure: step.sensorPressure,
                          computedPressure: step.computedPressure,
                      }
                    : DEFAULT_VALUES,
            );
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: RepressurizationStepForm) => {
            if (isPending) return;
            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({ uuid: step.uuid, fsecVersionId, ...data });
                    showNotification('Re-pressurisation mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data });
                    showNotification('Re-pressurisation créée', 'success');
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
            showNotification('Re-pressurisation supprimée', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouvelle re-pressurisation"
            editTitle="Modifier la re-pressurisation"
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
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <DatePicker
                                    {...field}
                                    label="Date de début"
                                    value={value ? dayjs(value) : null}
                                    onChange={(date) => onChange(date?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Date de début' },
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="estimatedEndDate"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <DatePicker
                                    {...field}
                                    label="Date de fin estimée"
                                    value={value ? dayjs(value) : null}
                                    onChange={(date) => onChange(date?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Date de fin estimée' },
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
                            name="sensorPressure"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression du capteur (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Pression du capteur en bar' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="computedPressure"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression calculée (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Pression calculée en bar' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>
            </Stack>
        </StepModalLayout>
    );
}
