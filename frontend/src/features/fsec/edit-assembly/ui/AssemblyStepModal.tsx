/**
 * Assembly Step Modal
 * @module features/edit-assembly
 *
 * Fields from backend:
 * - fsec_version_id (required)
 * - operator / operator_user_uuid (Assembleur)
 * - start_date
 * - end_date
 * - comments
 * - machine_uuids (machines B1, multi-select)
 */

import { useState, useEffect, useCallback } from 'react';
import { TextField, Stack, Grid2 } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AssemblyStep,
    useCreateAssemblyStep,
    useUpdateAssemblyStep,
    useDeleteAssemblyStep,
} from '@entities/fsec/steps';
import { UserMultiSelect, SPECTRE_OPERATOR_ROLES } from '@entities/user';
import { MachineMultiSelect } from '@entities/material';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface AssemblyStepModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: AssemblyStep | null;
}

const AssemblyStepFormSchema = z.object({
    operatorUserUuids: z.array(z.string().uuid()).min(1, 'Au moins un assembleur requis'),
    startDate: z.date({ required_error: 'Date requise' }),
    endDate: z.date().nullable().optional(),
    comments: z.string().nullable().optional(),
    machineUuids: z.array(z.string().uuid()),
});

type AssemblyStepForm = z.infer<typeof AssemblyStepFormSchema>;

export function AssemblyStepModal({ open, onClose, fsecVersionId, step }: AssemblyStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateAssemblyStep();
    const updateMutation = useUpdateAssemblyStep();
    const deleteMutation = useDeleteAssemblyStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<AssemblyStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(AssemblyStepFormSchema),
        defaultValues: {
            operatorUserUuids: [],
            startDate: undefined,
            endDate: null,
            comments: '',
            machineUuids: [],
        },
    });

    useEffect(() => {
        if (open) {
            if (step) {
                reset({
                    // Fallback sur le singulier legacy si la liste n'est pas encore peuplée.
                    operatorUserUuids: step.operatorUserUuids?.length
                        ? step.operatorUserUuids
                        : step.operatorUserUuid
                          ? [step.operatorUserUuid]
                          : [],
                    startDate: step.startDate ?? undefined,
                    endDate: step.endDate,
                    comments: step.comments ?? '',
                    machineUuids: step.machineUuids ?? [],
                });
            } else {
                reset({
                    operatorUserUuids: [],
                    startDate: undefined,
                    endDate: null,
                    comments: '',
                    machineUuids: [],
                });
            }
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: AssemblyStepForm) => {
            if (isPending) return;

            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({
                        uuid: step.uuid,
                        fsecVersionId,
                        operatorUserUuids: data.operatorUserUuids,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        comments: data.comments,
                        machineUuids: data.machineUuids,
                    });
                    showNotification('Assemblage mis à jour', 'success');
                } else {
                    await createMutation.mutateAsync({
                        fsecVersionId,
                        operatorUserUuids: data.operatorUserUuids,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        comments: data.comments,
                        machineUuids: data.machineUuids,
                    });
                    showNotification('Assemblage créé', 'success');
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
            showNotification('Assemblage supprimé', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, fsecVersionId, deleteMutation, showNotification, onClose]);

    const handleShowDeleteConfirm = useCallback(() => setShowDeleteConfirm(true), []);
    const handleHideDeleteConfirm = useCallback(() => setShowDeleteConfirm(false), []);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouvel assemblage"
            editTitle="Modifier l'assemblage"
            isEditMode={isEditMode}
            isPending={isPending}
            isDeleting={deleteMutation.isPending}
            showDeleteConfirm={showDeleteConfirm}
            onShowDeleteConfirm={handleShowDeleteConfirm}
            onHideDeleteConfirm={handleHideDeleteConfirm}
            onDelete={handleDelete}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="sm"
            modalId="assembly-step-modal"
        >
            <Stack spacing={3}>
                {/* Dates */}
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
                            name="endDate"
                            control={control}
                            render={({ field: { value, onChange, ...field } }) => (
                                <DatePicker
                                    {...field}
                                    label="Date de fin"
                                    value={value ? dayjs(value) : null}
                                    onChange={(date) => onChange(date?.toDate() || null)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Date de fin' },
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                {/* Assembleurs (une étape peut être réalisée à plusieurs) */}
                <Controller
                    name="operatorUserUuids"
                    control={control}
                    render={({ field, fieldState }) => (
                        <UserMultiSelect
                            value={field.value ?? []}
                            onChange={field.onChange}
                            roles={[...SPECTRE_OPERATOR_ROLES]}
                            label="Assembleurs"
                            required
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />

                {/* Machines B1 */}
                <Controller
                    name="machineUuids"
                    control={control}
                    render={({ field, fieldState }) => (
                        <MachineMultiSelect
                            value={field.value ?? []}
                            onChange={field.onChange}
                            roomCode="B1"
                            label="Machines B1"
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />

                {/* Comments */}
                <Controller
                    name="comments"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Commentaires"
                            multiline
                            rows={3}
                            size="small"
                            fullWidth
                            inputProps={{ 'aria-label': "Commentaires sur l'assemblage" }}
                        />
                    )}
                />
            </Stack>
        </StepModalLayout>
    );
}
