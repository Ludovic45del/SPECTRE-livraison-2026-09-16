/**
 * MaintenanceModal — création / édition d'une intervention de maintenance.
 * @module features/material/log-maintenance
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid2,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    type MachineMaintenance,
    MAINTENANCE_TYPE,
    MAINTENANCE_TYPE_LABELS,
    useCreateMaintenance,
    useDeleteMaintenance,
    useUpdateMaintenance,
} from '@entities/material';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

const formSchema = z
    .object({
        date: z.date({ required_error: 'Date requise' }),
        type: z.enum([MAINTENANCE_TYPE.PREVENTIVE, MAINTENANCE_TYPE.CURATIVE]),
        performedByUserUuid: z.string().nullable(),
        performedByName: z.string(),
        description: z.string(),
        nextMaintenanceDate: z.date().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.nextMaintenanceDate && data.nextMaintenanceDate < data.date) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['nextMaintenanceDate'],
                message: "La prochaine échéance doit être postérieure à la date de l'intervention",
            });
        }
    });

type MaintenanceForm = z.infer<typeof formSchema>;

interface MaintenanceModalProps {
    open: boolean;
    onClose: () => void;
    machineUuid: string;
    maintenance?: MachineMaintenance | null;
}

const emptyDefaults = (): MaintenanceForm => ({
    date: new Date(),
    type: MAINTENANCE_TYPE.PREVENTIVE,
    performedByUserUuid: null,
    performedByName: '',
    description: '',
    nextMaintenanceDate: null,
});

export function MaintenanceModal({ open, onClose, machineUuid, maintenance }: MaintenanceModalProps) {
    const isEditMode = Boolean(maintenance);
    const { showNotification } = useNotification();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const createMutation = useCreateMaintenance();
    const updateMutation = useUpdateMaintenance();
    const deleteMutation = useDeleteMaintenance(machineUuid);
    const isPending = createMutation.isPending || updateMutation.isPending;

    const { control, handleSubmit, reset } = useForm<MaintenanceForm>({
        mode: 'onBlur',
        resolver: zodResolver(formSchema),
        defaultValues: emptyDefaults(),
    });

    useEffect(() => {
        if (!open) return;
        if (maintenance) {
            reset({
                date: new Date(maintenance.date),
                type: maintenance.type,
                performedByUserUuid: maintenance.performedByUserUuid,
                performedByName: maintenance.performedByName,
                description: maintenance.description,
                nextMaintenanceDate: maintenance.nextMaintenanceDate ? new Date(maintenance.nextMaintenanceDate) : null,
            });
        } else {
            reset(emptyDefaults());
        }
        setShowDeleteConfirm(false);
    }, [open, maintenance, reset]);

    const onSubmit = useCallback(
        async (data: MaintenanceForm) => {
            if (isPending) return;
            const payload = {
                machineUuid,
                date: dayjs(data.date).format('YYYY-MM-DD'),
                type: data.type,
                performedByUserUuid: data.performedByUserUuid,
                performedByName: data.performedByName.trim(),
                description: data.description.trim(),
                nextMaintenanceDate: data.nextMaintenanceDate
                    ? dayjs(data.nextMaintenanceDate).format('YYYY-MM-DD')
                    : null,
            };
            try {
                if (isEditMode && maintenance) {
                    await updateMutation.mutateAsync({ uuid: maintenance.uuid, input: payload });
                    showNotification('Maintenance mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync(payload);
                    showNotification('Maintenance enregistrée', 'success');
                }
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [isPending, isEditMode, machineUuid, maintenance, createMutation, updateMutation, showNotification, onClose],
    );

    const handleDelete = useCallback(async () => {
        if (!maintenance) return;
        try {
            await deleteMutation.mutateAsync(maintenance.uuid);
            showNotification('Maintenance supprimée', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [maintenance, deleteMutation, showNotification, onClose]);

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogTitle>
                    {isEditMode ? 'Modifier la maintenance' : 'Nouvelle intervention de maintenance'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Grid2 container spacing={2}>
                            <Grid2 size={6}>
                                <Controller
                                    name="date"
                                    control={control}
                                    render={({ field: { value, onChange, ...field }, fieldState }) => (
                                        <DatePicker
                                            {...field}
                                            label="Date"
                                            value={value ? dayjs(value) : null}
                                            onChange={(date) => onChange(date?.toDate() || null)}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    size: 'small',
                                                    required: true,
                                                    error: Boolean(fieldState.error),
                                                    helperText: fieldState.error?.message,
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={6}>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small">
                                            <InputLabel id="maintenance-type-label">Type</InputLabel>
                                            <Select
                                                labelId="maintenance-type-label"
                                                label="Type"
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            >
                                                <MenuItem value={MAINTENANCE_TYPE.PREVENTIVE}>
                                                    {MAINTENANCE_TYPE_LABELS.preventive}
                                                </MenuItem>
                                                <MenuItem value={MAINTENANCE_TYPE.CURATIVE}>
                                                    {MAINTENANCE_TYPE_LABELS.curative}
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={12}>
                                <Controller
                                    name="performedByUserUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <UserSelect
                                            value={field.value}
                                            onChange={(uuid) => field.onChange(uuid)}
                                            label="Intervenant (utilisateur)"
                                        />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={12}>
                                <Controller
                                    name="performedByName"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Intervenant (texte libre, optionnel si externe)"
                                            fullWidth
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={12}>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Description de l'intervention"
                                            multiline
                                            rows={3}
                                            fullWidth
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={12}>
                                <Controller
                                    name="nextMaintenanceDate"
                                    control={control}
                                    render={({ field: { value, onChange, ...field }, fieldState }) => (
                                        <DatePicker
                                            {...field}
                                            label="Prochaine échéance (optionnel)"
                                            value={value ? dayjs(value) : null}
                                            onChange={(date) => onChange(date?.toDate() || null)}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    size: 'small',
                                                    error: Boolean(fieldState.error),
                                                    helperText: fieldState.error?.message,
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </Grid2>
                        </Grid2>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
                    <Box>
                        {isEditMode && !showDeleteConfirm && (
                            <Button
                                color="error"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isPending || deleteMutation.isPending}
                            >
                                Supprimer
                            </Button>
                        )}
                        {isEditMode && showDeleteConfirm && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Confirmer ?
                                </Typography>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="contained"
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                >
                                    Oui, supprimer
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleteMutation.isPending}
                                >
                                    Annuler
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    <Box>
                        <Button onClick={onClose} disabled={isPending}>
                            Annuler
                        </Button>
                        <Button type="submit" variant="contained" disabled={isPending} sx={{ ml: 1 }}>
                            {isPending ? 'Enregistrement…' : isEditMode ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </Box>
                </DialogActions>
            </form>
        </Dialog>
    );
}
