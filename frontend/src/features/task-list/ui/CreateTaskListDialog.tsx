/**
 * CreateTaskListDialog — création / édition d'une liste partagée.
 * @module features/task-list/ui
 *
 * react-hook-form + zodResolver(TaskListCreateSchema) : nom (requis, max 120),
 * description optionnelle, couleur (6 pastilles cliquables), membres invités
 * (UserMultiSelect, exclut l'utilisateur courant — il devient owner).
 * En mode édition (`list` fourni) : name/description/color uniquement (PATCH).
 */

import { memo, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    TASK_LIST_COLORS,
    TaskListCreateSchema,
    useCreateTaskList,
    useUpdateTaskList,
    type TaskListCreate,
    type TaskListSummary,
} from '@entities/task-list';
import { UserMultiSelect, useMe } from '@entities/user';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { LIST_COLOR_LABELS, getListColorValue } from '../lib/list-colors';

export interface CreateTaskListDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Liste à éditer (mode édition : renommer / couleur) — absent = création. */
    readonly list?: TaskListSummary;
}

const EMPTY_FORM: TaskListCreate = { name: '', description: '', color: 'default', memberUuids: [] };

export const CreateTaskListDialog = memo(function CreateTaskListDialog({
    open,
    onClose,
    list,
}: CreateTaskListDialogProps) {
    const isEdit = Boolean(list);
    const createList = useCreateTaskList();
    const updateList = useUpdateTaskList();
    const { data: me } = useMe();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<TaskListCreate>({
        mode: 'onBlur',
        resolver: zodResolver(TaskListCreateSchema),
        defaultValues: EMPTY_FORM,
    });

    // Ré-initialise le formulaire à chaque ouverture (création vierge ou pré-rempli).
    useEffect(() => {
        if (!open) return;
        reset(
            list ? { name: list.name, description: list.description, color: list.color, memberUuids: [] } : EMPTY_FORM,
        );
    }, [open, list, reset]);

    const isPending = createList.isPending || updateList.isPending;

    const onSubmit = useCallback(
        async (data: TaskListCreate) => {
            try {
                if (list) {
                    await updateList.mutateAsync({
                        uuid: list.uuid,
                        data: { name: data.name, description: data.description ?? '', color: data.color },
                    });
                    showNotification('Liste modifiée avec succès', 'success');
                } else {
                    await createList.mutateAsync(data);
                    showNotification('Liste créée avec succès', 'success');
                }
                onClose();
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, "Erreur lors de l'enregistrement de la liste"), 'error');
            }
        },
        [list, updateList, createList, showNotification, onClose],
    );

    const handleClose = useCallback(() => {
        reset(EMPTY_FORM);
        onClose();
    }, [reset, onClose]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            aria-label={isEdit ? 'Modifier la liste' : 'Créer une liste'}
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {isEdit ? 'Modifier la liste' : 'Nouvelle liste partagée'}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Stack spacing={2.5}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nom"
                                    required
                                    autoFocus
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                    fullWidth
                                    inputProps={{ maxLength: 120 }}
                                />
                            )}
                        />
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Description"
                                    multiline
                                    minRows={2}
                                    error={Boolean(errors.description)}
                                    helperText={errors.description?.message}
                                    fullWidth
                                />
                            )}
                        />
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Couleur
                            </Typography>
                            <Controller
                                name="color"
                                control={control}
                                render={({ field }) => (
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                                        {TASK_LIST_COLORS.map((c) => (
                                            <Box
                                                key={c}
                                                component="button"
                                                type="button"
                                                onClick={() => field.onChange(c)}
                                                aria-label={`Couleur ${LIST_COLOR_LABELS[c]}`}
                                                aria-pressed={field.value === c}
                                                sx={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: '50%',
                                                    bgcolor: getListColorValue(c),
                                                    border: '2px solid',
                                                    borderColor: field.value === c ? 'primary.main' : 'transparent',
                                                    outlineOffset: 2,
                                                    cursor: 'pointer',
                                                    p: 0,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            />
                        </Box>
                        {!isEdit && (
                            <Controller
                                name="memberUuids"
                                control={control}
                                render={({ field }) => (
                                    <UserMultiSelect
                                        value={field.value}
                                        onChange={(uuids) => field.onChange(uuids.filter((uuid) => uuid !== me?.uuid))}
                                        label="Inviter des membres"
                                        ariaLabel="Inviter des membres"
                                        helperText="Seuls vous et les membres invités verront cette liste."
                                    />
                                )}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={isPending}>
                        {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
