/**
 * Permeation Step Modal (Step ID: 12)
 * @module features/edit-permeation
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
    PermeationStep,
    useCreatePermeationStep,
    useUpdatePermeationStep,
    useDeletePermeationStep,
    type CommonGasDataOptional,
} from '@entities/fsec/steps';
import { UserSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface PermeationStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: PermeationStep | null;
    /** Données communes HP utilisées pour pré-remplir gasType / targetPressure si le step n'en a pas. */
    commonData?: CommonGasDataOptional;
}

const PermeationStepFormSchema = z.object({
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    startDate: z.date({ required_error: 'Date requise' }),
    estimatedEndDate: z.date().nullable().optional(),
    sensorPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
    computedShotPressure: z.number().finite().min(0, 'Doit être positif').nullable().optional(),
});

type PermeationStepForm = z.infer<typeof PermeationStepFormSchema>;

const DEFAULT_VALUES: Partial<PermeationStepForm> = {
    operatorUserUuid: '',
    startDate: undefined,
    estimatedEndDate: null,
    sensorPressure: null,
    computedShotPressure: null,
};

export function PermeationStepModal({ open, onClose, fsecVersionId, step, commonData }: PermeationStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreatePermeationStep();
    const updateMutation = useUpdatePermeationStep();
    const deleteMutation = useDeletePermeationStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<PermeationStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(PermeationStepFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        if (open) {
            reset(
                step
                    ? {
                          operatorUserUuid: step.operatorUserUuid ?? '',
                          startDate: step.startDate ?? undefined,
                          estimatedEndDate: step.estimatedEndDate,
                          sensorPressure: step.sensorPressure,
                          computedShotPressure: step.computedShotPressure,
                      }
                    : DEFAULT_VALUES,
            );
            setShowDeleteConfirm(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, step?.uuid]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: PermeationStepForm) => {
            if (isPending) return;
            try {
                // gasType + targetPressure proviennent désormais des données communes HP
                // (édités via la modale "Données communes" — évite la redondance).
                const sharedFromCommonData = {
                    gasType: commonData?.gasType ?? null,
                    targetPressure: commonData?.experimentPressure ?? null,
                };
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({
                        uuid: step.uuid,
                        fsecVersionId,
                        ...data,
                        ...sharedFromCommonData,
                    });
                    showNotification('Perméation mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync({ fsecVersionId, ...data, ...sharedFromCommonData });
                    showNotification('Perméation créée', 'success');
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
            commonData,
        ],
    );

    const handleDelete = useCallback(async () => {
        if (!step) return;
        try {
            await deleteMutation.mutateAsync({ uuid: step.uuid, fsecVersionId });
            showNotification('Perméation supprimée', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, deleteMutation, fsecVersionId, showNotification, onClose]);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouvelle perméation"
            editTitle="Modifier la perméation"
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
                            name="computedShotPressure"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression de tir calculée (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': 'Pression de tir calculée en bar' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>
            </Stack>
        </StepModalLayout>
    );
}
