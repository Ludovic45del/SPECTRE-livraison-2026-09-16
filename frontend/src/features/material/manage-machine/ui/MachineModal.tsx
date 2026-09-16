/**
 * MachineModal — création / édition d'une machine.
 * @module features/material/manage-machine
 *
 * Une seule modale gère les deux modes (mode = `machine` undefined ⇒ création).
 * Les liens documentaires sont édités inline et envoyés en un seul payload
 * (le backend remplace l'intégralité de cette collection).
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid2,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    type Machine,
    type MachineRoom,
    MACHINE_STATUS,
    MACHINE_STATUS_LABELS,
    useCreateMachine,
    useDeleteMachine,
    useMachineRooms,
    useUpdateMachine,
} from '@entities/material';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

const linkSchema = z.object({
    label: z.string().min(1, 'Libellé requis'),
    // Texte libre — souvent un chemin réseau / Explorateur Windows.
    url: z.string().min(1, 'Chemin requis'),
});

const formSchema = z.object({
    name: z.string().min(1, 'Nom requis'),
    roomId: z.number().int().positive('Salle requise'),
    reference: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    commissioningDate: z.date().nullable(),
    status: z.enum([MACHINE_STATUS.IN_SERVICE, MACHINE_STATUS.OUT_OF_SERVICE, MACHINE_STATUS.UNDER_MAINTENANCE]),
    responsibleUserUuid: z.string().nullable(),
    description: z.string(),
    links: z.array(linkSchema),
});

type MachineForm = z.infer<typeof formSchema>;

const STATUS_VALUES = [MACHINE_STATUS.IN_SERVICE, MACHINE_STATUS.OUT_OF_SERVICE, MACHINE_STATUS.UNDER_MAINTENANCE];

interface MachineModalProps {
    open: boolean;
    onClose: () => void;
    machine?: Machine | null;
    /** Salle pré-sélectionnée lors de la création. */
    defaultRoomId?: number;
}

const emptyDefaults = (roomId?: number): MachineForm => ({
    name: '',
    roomId: roomId ?? 0,
    reference: '',
    manufacturer: '',
    model: '',
    commissioningDate: null,
    status: MACHINE_STATUS.IN_SERVICE,
    responsibleUserUuid: null,
    description: '',
    links: [],
});

const machineToForm = (machine: Machine): MachineForm => ({
    name: machine.name,
    roomId: machine.roomId,
    reference: machine.reference,
    manufacturer: machine.manufacturer,
    model: machine.model,
    commissioningDate: machine.commissioningDate ? new Date(machine.commissioningDate) : null,
    status: machine.status,
    responsibleUserUuid: machine.responsibleUserUuid,
    description: machine.description,
    links: machine.links.map((link) => ({ label: link.label, url: link.url })),
});

export function MachineModal({ open, onClose, machine, defaultRoomId }: MachineModalProps) {
    const isEditMode = Boolean(machine);
    const { showNotification } = useNotification();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { data: rooms = [] } = useMachineRooms();

    const createMutation = useCreateMachine();
    const updateMutation = useUpdateMachine();
    const deleteMutation = useDeleteMachine();
    const isPending = createMutation.isPending || updateMutation.isPending;

    const { control, handleSubmit, reset } = useForm<MachineForm>({
        mode: 'onBlur',
        resolver: zodResolver(formSchema),
        defaultValues: emptyDefaults(defaultRoomId),
    });

    const {
        fields: linkFields,
        append: appendLink,
        remove: removeLink,
    } = useFieldArray({
        control,
        name: 'links',
    });

    useEffect(() => {
        if (!open) return;
        reset(machine ? machineToForm(machine) : emptyDefaults(defaultRoomId));
        setShowDeleteConfirm(false);
    }, [open, machine, defaultRoomId, reset]);

    const onSubmit = useCallback(
        async (data: MachineForm) => {
            if (isPending) return;
            const payload = {
                name: data.name.trim(),
                roomId: data.roomId,
                reference: data.reference.trim(),
                manufacturer: data.manufacturer.trim(),
                model: data.model.trim(),
                commissioningDate: data.commissioningDate ? dayjs(data.commissioningDate).format('YYYY-MM-DD') : null,
                status: data.status,
                responsibleUserUuid: data.responsibleUserUuid,
                description: data.description.trim(),
                links: data.links.map((link, idx) => ({
                    label: link.label.trim(),
                    url: link.url.trim(),
                    position: idx,
                })),
            };
            try {
                if (isEditMode && machine) {
                    await updateMutation.mutateAsync({ uuid: machine.uuid, input: payload });
                    showNotification('Machine mise à jour', 'success');
                } else {
                    await createMutation.mutateAsync(payload);
                    showNotification('Machine créée', 'success');
                }
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [isPending, isEditMode, machine, createMutation, updateMutation, showNotification, onClose],
    );

    const handleDelete = useCallback(async () => {
        if (!machine) return;
        try {
            await deleteMutation.mutateAsync(machine.uuid);
            showNotification('Machine supprimée', 'success');
            onClose();
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
        }
    }, [machine, deleteMutation, showNotification, onClose]);

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogTitle>{isEditMode ? 'Modifier la machine' : 'Nouvelle machine'}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Identification */}
                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 12, sm: 8 }}>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Nom"
                                            required
                                            fullWidth
                                            size="small"
                                            error={Boolean(fieldState.error)}
                                            helperText={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 4 }}>
                                <Controller
                                    name="roomId"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                                            <InputLabel id="machine-room-label">Salle</InputLabel>
                                            <Select
                                                labelId="machine-room-label"
                                                label="Salle"
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                            >
                                                {rooms.map((room: MachineRoom) => (
                                                    <MenuItem key={room.id} value={room.id}>
                                                        {room.label} ({room.code})
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid2>

                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="reference"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Référence / N° de série" fullWidth size="small" />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="manufacturer"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Fabricant" fullWidth size="small" />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="model"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} label="Modèle" fullWidth size="small" />
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="commissioningDate"
                                    control={control}
                                    render={({ field: { value, onChange, ...field } }) => (
                                        <DatePicker
                                            {...field}
                                            label="Date de mise en service"
                                            value={value ? dayjs(value) : null}
                                            onChange={(date) => onChange(date?.toDate() || null)}
                                            slotProps={{
                                                textField: { fullWidth: true, size: 'small' },
                                            }}
                                        />
                                    )}
                                />
                            </Grid2>

                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small">
                                            <InputLabel id="machine-status-label">Statut</InputLabel>
                                            <Select
                                                labelId="machine-status-label"
                                                label="Statut"
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                            >
                                                {STATUS_VALUES.map((status) => (
                                                    <MenuItem key={status} value={status}>
                                                        {MACHINE_STATUS_LABELS[status]}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid2>
                            <Grid2 size={{ xs: 12, sm: 6 }}>
                                <Controller
                                    name="responsibleUserUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <UserSelect
                                            value={field.value}
                                            onChange={(uuid) => field.onChange(uuid)}
                                            label="Responsable"
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
                                            label="Description / notes"
                                            multiline
                                            rows={2}
                                            fullWidth
                                            size="small"
                                        />
                                    )}
                                />
                            </Grid2>
                        </Grid2>

                        <Divider />

                        {/* Liens documentaires */}
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Liens documentaires
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => appendLink({ label: '', url: '' })}
                                >
                                    Ajouter un lien
                                </Button>
                            </Box>
                            <Stack spacing={1.5}>
                                {linkFields.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        Aucun lien. Ajoute des procédures, manuels, intranet…
                                    </Typography>
                                )}
                                {linkFields.map((linkField, idx) => (
                                    <Grid2 container spacing={1} alignItems="flex-start" key={linkField.id}>
                                        <Grid2 size={{ xs: 12, sm: 4 }}>
                                            <Controller
                                                name={`links.${idx}.label` as const}
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Libellé"
                                                        fullWidth
                                                        size="small"
                                                        error={Boolean(fieldState.error)}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 7 }}>
                                            <Controller
                                                name={`links.${idx}.url` as const}
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Chemin / URL"
                                                        placeholder="\\serveur\partage\… ou https://…"
                                                        fullWidth
                                                        size="small"
                                                        error={Boolean(fieldState.error)}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        </Grid2>
                                        <Grid2 size={{ xs: 12, sm: 1 }}>
                                            <Tooltip title="Supprimer ce lien">
                                                <IconButton
                                                    aria-label="Supprimer le lien"
                                                    onClick={() => removeLink(idx)}
                                                    size="small"
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Grid2>
                                    </Grid2>
                                ))}
                            </Stack>
                        </Box>
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
