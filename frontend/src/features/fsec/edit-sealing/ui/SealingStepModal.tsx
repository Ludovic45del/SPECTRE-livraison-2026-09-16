/**
 * Sealing Step Modal
 * @module features/edit-sealing
 *
 * Fields from backend:
 * - metrology_step_id (required) - 1:1 link to MetrologyStep
 * - date
 * - metrologist_name
 * - rack_id (referential)
 * - interface_io
 * - comments
 * - verification_status (vérification scellement : 'OK' / 'NOK', null = non vérifié)
 * - verification_remark (remarque de vérification)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    TextField,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    SealingStep,
    useCreateSealingStep,
    useUpdateSealingStep,
    useDeleteSealingStep,
    FSEC_RACKS_LIST,
} from '@entities/fsec/steps';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface SealingStepModalProps {
    open: boolean;
    onClose: () => void;
    metrologyStepId: string;
    step?: SealingStep | null;
}

const SealingStepFormSchema = z.object({
    date: z.date({ required_error: 'Date requise' }),
    metrologistUserUuid: z.string().uuid('Métrologue requis'),
    rackId: z.number().nullable().optional(),
    interfaceIo: z.string().nullable().optional(),
    comments: z.string().nullable().optional(),
    verificationStatus: z.enum(['OK', 'NOK']).nullable().optional(),
    verificationRemark: z.string().max(4000, 'Remarque trop longue (max 4000)').nullable().optional(),
});

type SealingStepForm = z.infer<typeof SealingStepFormSchema>;

export function SealingStepModal({ open, onClose, metrologyStepId, step }: SealingStepModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(step);

    const createMutation = useCreateSealingStep();
    const updateMutation = useUpdateSealingStep();
    const deleteMutation = useDeleteSealingStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<SealingStepForm>({
        mode: 'onBlur',
        resolver: zodResolver(SealingStepFormSchema),
        defaultValues: {
            date: undefined,
            metrologistUserUuid: '',
            rackId: null,
            interfaceIo: '',
            comments: '',
            verificationStatus: null,
            verificationRemark: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (step) {
                reset({
                    date: step.date ?? undefined,
                    metrologistUserUuid: step.metrologistUserUuid ?? '',
                    rackId: step.rackId,
                    interfaceIo: step.interfaceIo ?? '',
                    comments: step.comments ?? '',
                    verificationStatus: step.verificationStatus ?? null,
                    verificationRemark: step.verificationRemark ?? '',
                });
            } else {
                reset({
                    date: undefined,
                    metrologistUserUuid: '',
                    rackId: null,
                    interfaceIo: '',
                    comments: '',
                    verificationStatus: null,
                    verificationRemark: '',
                });
            }
            setShowDeleteConfirm(false);
        }
    }, [open, step, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = useCallback(
        async (data: SealingStepForm) => {
            if (isPending) return;

            try {
                if (isEditMode && step) {
                    await updateMutation.mutateAsync({
                        uuid: step.uuid,
                        metrologyStepId,
                        date: data.date,
                        metrologistUserUuid: data.metrologistUserUuid,
                        rackId: data.rackId,
                        interfaceIo: data.interfaceIo,
                        comments: data.comments,
                        verificationStatus: data.verificationStatus ?? null,
                        verificationRemark: data.verificationRemark?.trim() || null,
                    });
                    showNotification('Scellement mis à jour', 'success');
                } else {
                    await createMutation.mutateAsync({
                        metrologyStepId,
                        date: data.date,
                        metrologistUserUuid: data.metrologistUserUuid,
                        rackId: data.rackId,
                        interfaceIo: data.interfaceIo,
                        comments: data.comments,
                        verificationStatus: data.verificationStatus ?? null,
                        verificationRemark: data.verificationRemark?.trim() || null,
                    });
                    showNotification('Scellement créé', 'success');
                }
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [isPending, isEditMode, step, metrologyStepId, updateMutation, createMutation, showNotification, onClose],
    );

    const handleDelete = useCallback(async () => {
        if (!step) return;
        try {
            await deleteMutation.mutateAsync({ uuid: step.uuid, metrologyStepId });
            showNotification('Scellement supprimé', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [step, metrologyStepId, deleteMutation, showNotification, onClose]);

    const handleShowDeleteConfirm = useCallback(() => setShowDeleteConfirm(true), []);
    const handleHideDeleteConfirm = useCallback(() => setShowDeleteConfirm(false), []);

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title="Nouveau scellement"
            editTitle="Modifier le scellement"
            isEditMode={isEditMode}
            isPending={isPending}
            isDeleting={deleteMutation.isPending}
            showDeleteConfirm={showDeleteConfirm}
            onShowDeleteConfirm={handleShowDeleteConfirm}
            onHideDeleteConfirm={handleHideDeleteConfirm}
            onDelete={handleDelete}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="sm"
            modalId="sealing-step-modal"
        >
            <Stack spacing={3}>
                {/* Date */}
                <Controller
                    name="date"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                        <DatePicker
                            {...field}
                            label="Date"
                            value={value ? dayjs(value) : null}
                            onChange={(date) => onChange(date?.toDate() || null)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    inputProps: { 'aria-label': 'Date du scellement' },
                                },
                            }}
                        />
                    )}
                />

                {/* Métrologue (dropdown connecté à la base users) */}
                <Controller
                    name="metrologistUserUuid"
                    control={control}
                    render={({ field, fieldState }) => (
                        <UserSelect
                            value={field.value || null}
                            onChange={(uuid) => field.onChange(uuid ?? '')}
                            roles={['metrologue']}
                            label="Métrologue"
                            required
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                        />
                    )}
                />

                {/* Conteneur ou Rack */}
                <Controller
                    name="rackId"
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth size="small">
                            <InputLabel id="sealing-rack-select-label">Conteneur ou Rack</InputLabel>
                            <Select
                                {...field}
                                labelId="sealing-rack-select-label"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? null : Number(val));
                                }}
                                label="Conteneur ou Rack"
                                inputProps={{ 'aria-label': 'Sélectionner un conteneur ou rack' }}
                            >
                                <MenuItem value="">
                                    <em>Non spécifié</em>
                                </MenuItem>
                                {FSEC_RACKS_LIST.map((rack) => (
                                    <MenuItem key={rack.id} value={rack.id}>
                                        {rack.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                />

                {/* Interface I0 */}
                <Controller
                    name="interfaceIo"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Interface I0"
                            size="small"
                            fullWidth
                            inputProps={{ 'aria-label': 'Interface I0' }}
                        />
                    )}
                />

                {/* Vérification scellement : OK / NOK, désélectionnable (null = non vérifié) */}
                <Stack spacing={1}>
                    <Typography variant="subtitle2">Vérification scellement</Typography>
                    <Controller
                        name="verificationStatus"
                        control={control}
                        render={({ field }) => (
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={field.value ?? null}
                                onChange={(_, value: 'OK' | 'NOK' | null) => field.onChange(value)}
                                aria-label="Vérification du scellement"
                            >
                                <ToggleButton value="OK" color="success" aria-label="Vérification OK">
                                    OK
                                </ToggleButton>
                                <ToggleButton value="NOK" color="error" aria-label="Vérification NOK">
                                    NOK
                                </ToggleButton>
                            </ToggleButtonGroup>
                        )}
                    />
                    <Controller
                        name="verificationRemark"
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                value={field.value ?? ''}
                                label="Remarque de vérification"
                                multiline
                                rows={2}
                                size="small"
                                fullWidth
                                error={Boolean(fieldState.error)}
                                helperText={fieldState.error?.message}
                                inputProps={{ 'aria-label': 'Remarque de vérification du scellement', maxLength: 4000 }}
                            />
                        )}
                    />
                </Stack>

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
                            inputProps={{ 'aria-label': 'Commentaires sur le scellement' }}
                        />
                    )}
                />
            </Stack>
        </StepModalLayout>
    );
}
