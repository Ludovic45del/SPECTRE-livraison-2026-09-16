/**
 * Pictures Session Modal
 * @module features/edit-pictures
 *
 * Edits the PicturesStep (session photo) with:
 * - operator
 * - date
 * - comments
 */

import { useState, useEffect, useCallback } from 'react';
import { TextField, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    PicturesStep,
    useCreatePicturesStep,
    useUpdatePicturesStep,
    useDeletePicturesStep,
} from '@entities/fsec/steps';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface PicturesSessionModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    step?: PicturesStep | null;
}

const PicturesSessionFormSchema = z.object({
    operatorUserUuid: z.string().uuid('Opérateur requis'),
    date: z.date({ required_error: 'Date requise' }),
    comments: z.string().nullable().optional(),
});

type PicturesSessionForm = z.infer<typeof PicturesSessionFormSchema>;

export function PicturesSessionModal({ open, onClose, fsecVersionId, step }: PicturesSessionModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreatePicturesStep();
    const updateMutation = useUpdatePicturesStep();
    const deleteMutation = useDeletePicturesStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<PicturesSessionForm>({
        mode: 'onBlur',
        resolver: zodResolver(PicturesSessionFormSchema),
        defaultValues: {
            operatorUserUuid: '',
            date: undefined,
            comments: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (step) {
                reset({
                    operatorUserUuid: step.operatorUserUuid ?? '',
                    date: step.date ?? undefined,
                    comments: step.comments ?? '',
                });
            } else {
                reset({
                    operatorUserUuid: '',
                    date: undefined,
                    comments: '',
                });
            }
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: PicturesSessionForm) => {
            if (isPending) return;

            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({
                        uuid: step.uuid,
                        fsecVersionId,
                        operatorUserUuid: data.operatorUserUuid,
                        date: data.date,
                        comments: data.comments,
                    });
                    showNotification('Session photo mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync({
                        fsecVersionId,
                        operatorUserUuid: data.operatorUserUuid,
                        date: data.date,
                        comments: data.comments,
                    });
                    showNotification('Session photo créée', 'success');
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
            showNotification('Session photo supprimée', 'success');
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
            title="Nouvelle session photo"
            editTitle="Modifier la session photo"
            isEditMode={isEditMode}
            isPending={isPending}
            isDeleting={deleteMutation.isPending}
            showDeleteConfirm={showDeleteConfirm}
            onShowDeleteConfirm={handleShowDeleteConfirm}
            onHideDeleteConfirm={handleHideDeleteConfirm}
            onDelete={handleDelete}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="sm"
            modalId="pictures-session-modal"
        >
            <Stack spacing={3}>
                {/* Opérateur (dropdown — tous les users actifs y compris stagiaire/alternant) */}
                <Controller
                    name="operatorUserUuid"
                    control={control}
                    render={({ field, fieldState }) => (
                        <UserSelect
                            value={field.value || null}
                            onChange={(uuid) => field.onChange(uuid ?? '')}
                            label="Opérateur"
                            required
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />

                {/* Date */}
                <Controller
                    name="date"
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
                                    inputProps: { 'aria-label': 'Date de réalisation de la session photo' },
                                },
                            }}
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
                            inputProps={{ 'aria-label': 'Commentaires sur la session photo' }}
                        />
                    )}
                />
            </Stack>
        </StepModalLayout>
    );
}
