/**
 * IdentitySection — fiche d'identité d'une machine, éditable inline.
 * @module features/material/view-machine
 *
 * Pattern identique aux sections FA détails : `Paper outlined` + icône Edit
 * en haut à droite, switch view/edit, bouton Save/Cancel via FormActions.
 */

import { memo, useCallback, useState } from 'react';
import {
    Box,
    Divider,
    FormControl,
    Grid2,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import {
    MACHINE_STATUS,
    MACHINE_STATUS_COLORS,
    MACHINE_STATUS_LABELS,
    type Machine,
    type MachineRoom,
    type MachineStatus,
    useMachineRooms,
    useUpdateMachine,
} from '@entities/material';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { FormActions } from '@pages/campaign-details/overview/components/FormActions';
import { DataChip } from '@widgets/data-chip';
import { EDIT_BUTTON_SX, PAPER_BASE_SX } from '../styles';
import { machineToInput } from '../helpers';

interface IdentitySectionProps {
    machine: Machine;
    room: MachineRoom | undefined;
}

interface IdentityForm {
    name: string;
    roomId: number;
    reference: string;
    manufacturer: string;
    model: string;
    commissioningDate: Dayjs | null;
    status: MachineStatus;
    responsibleUserUuid: string | null;
    description: string;
}

const STATUS_VALUES: MachineStatus[] = [
    MACHINE_STATUS.IN_SERVICE,
    MACHINE_STATUS.OUT_OF_SERVICE,
    MACHINE_STATUS.UNDER_MAINTENANCE,
];

function machineToForm(machine: Machine): IdentityForm {
    return {
        name: machine.name,
        roomId: machine.roomId,
        reference: machine.reference,
        manufacturer: machine.manufacturer,
        model: machine.model,
        commissioningDate: machine.commissioningDate ? dayjs(machine.commissioningDate) : null,
        status: machine.status,
        responsibleUserUuid: machine.responsibleUserUuid,
        description: machine.description,
    };
}

export const IdentitySection = memo(function IdentitySection({ machine, room }: IdentitySectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateMachine();
    const { data: rooms = [] } = useMachineRooms();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<IdentityForm>(() => machineToForm(machine));

    const startEditing = useCallback(() => {
        setForm(machineToForm(machine));
        setIsEditing(true);
    }, [machine]);

    const cancelEditing = useCallback(() => setIsEditing(false), []);

    const save = useCallback(async () => {
        if (!form.name.trim()) {
            showNotification('Le nom est requis', 'error');
            return;
        }
        try {
            const base = machineToInput(machine);
            await updateMutation.mutateAsync({
                uuid: machine.uuid,
                input: {
                    ...base,
                    name: form.name.trim(),
                    roomId: form.roomId,
                    reference: form.reference.trim(),
                    manufacturer: form.manufacturer.trim(),
                    model: form.model.trim(),
                    commissioningDate: form.commissioningDate ? form.commissioningDate.format('YYYY-MM-DD') : null,
                    status: form.status,
                    responsibleUserUuid: form.responsibleUserUuid,
                    description: form.description.trim(),
                },
            });
            showNotification('Fiche mise à jour', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
        }
    }, [form, machine, updateMutation, showNotification]);

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX}>
            {!isEditing && (
                <IconButton onClick={startEditing} aria-label="Modifier la fiche d'identité" sx={EDIT_BUTTON_SX}>
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <Typography variant="overline" color="text.secondary">
                Fiche d'identité
            </Typography>

            {isEditing ? (
                <Box
                    component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                    sx={{ mt: 1 }}
                >
                    <Grid2 container spacing={2}>
                        <Grid2 size={{ xs: 12, sm: 8 }}>
                            <TextField
                                label="Nom"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                required
                                fullWidth
                                size="small"
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="identity-room">Salle</InputLabel>
                                <Select
                                    labelId="identity-room"
                                    label="Salle"
                                    value={form.roomId}
                                    onChange={(e) => setForm((f) => ({ ...f, roomId: Number(e.target.value) }))}
                                >
                                    {rooms.map((r) => (
                                        <MenuItem key={r.id} value={r.id}>
                                            {r.code} — {r.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Référence / N° de série"
                                value={form.reference}
                                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                                fullWidth
                                size="small"
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Fabricant"
                                value={form.manufacturer}
                                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                                fullWidth
                                size="small"
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Modèle"
                                value={form.model}
                                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                                fullWidth
                                size="small"
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <DatePicker
                                label="Date de mise en service"
                                value={form.commissioningDate}
                                onChange={(date) => setForm((f) => ({ ...f, commissioningDate: date }))}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                            />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="identity-status">Statut</InputLabel>
                                <Select
                                    labelId="identity-status"
                                    label="Statut"
                                    value={form.status}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, status: e.target.value as MachineStatus }))
                                    }
                                >
                                    {STATUS_VALUES.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {MACHINE_STATUS_LABELS[status]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                            <UserSelect
                                value={form.responsibleUserUuid}
                                onChange={(uuid) => setForm((f) => ({ ...f, responsibleUserUuid: uuid }))}
                                label="Responsable"
                            />
                        </Grid2>
                        <Grid2 size={12}>
                            <TextField
                                label="Description / notes"
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                            />
                        </Grid2>
                    </Grid2>
                    <FormActions onCancel={cancelEditing} onSave={save} isSaving={updateMutation.isPending} />
                </Box>
            ) : (
                <>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 2,
                            mt: 1,
                        }}
                    >
                        <Field label="Référence" value={machine.reference} />
                        <Field label="Fabricant" value={machine.manufacturer} />
                        <Field label="Modèle" value={machine.model} />
                        <Field
                            label="Mise en service"
                            value={
                                machine.commissioningDate ? dayjs(machine.commissioningDate).format('DD/MM/YYYY') : ''
                            }
                        />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Statut
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <DataChip
                                    label={MACHINE_STATUS_LABELS[machine.status]}
                                    color={MACHINE_STATUS_COLORS[machine.status]}
                                />
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Salle
                            </Typography>
                            <Typography variant="body2">{room ? `${room.code} — ${room.label}` : '—'}</Typography>
                        </Box>
                    </Box>
                    {machine.description && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {machine.description}
                            </Typography>
                        </>
                    )}
                </>
            )}
        </Paper>
    );
});

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">
                {label}
            </Typography>
            <Typography variant="body2">{value || '—'}</Typography>
        </Box>
    );
}
