/**
 * EditUserModal - Modal de modification d'un utilisateur
 * @module features/admin/edit-user
 */

import { memo, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { UserUpdateFormSchema, type UserUpdateForm, RoleMultiSelect, type User, useUpdateUser } from '@entities/user';
import { useModalSubmit } from '@shared/lib';

interface EditUserModalProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
}

function EditUserModalComponent({ user, open, onClose }: EditUserModalProps) {
    const updateMutation = useUpdateUser();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UserUpdateForm>({
        resolver: zodResolver(UserUpdateFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            roles: [],
            laboratoire: '',
            service: '',
            numero: '',
            bureau: '',
        },
    });

    useEffect(() => {
        if (user && open) {
            reset({
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
                laboratoire: user.laboratoire,
                service: user.service,
                numero: user.numero,
                bureau: user.bureau,
            });
        }
    }, [user, open, reset]);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    const submitUpdate = useModalSubmit(
        (data: UserUpdateForm) => updateMutation.mutateAsync({ uuid: user!.uuid, data }),
        {
            successMessage: `Utilisateur ${user?.username} modifié`,
            errorMessage: 'Erreur lors de la modification',
            onSuccess: handleClose,
        },
    );

    const onSubmit = useCallback(
        async (data: UserUpdateForm) => {
            if (!user) return;
            await submitUpdate(data);
        },
        [user, submitUpdate],
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    px: 3,
                    py: 2,
                }}
            >
                <Typography variant="h6" fontWeight={700} fontSize="0.95rem">
                    Modifier {user?.username}
                </Typography>
                <IconButton onClick={handleClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <TextField label="Matricule" value={user?.username ?? ''} disabled fullWidth />
                        <Stack direction="row" spacing={2}>
                            <Controller
                                name="lastName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ''}
                                        label="Nom"
                                        error={Boolean(errors.lastName)}
                                        helperText={errors.lastName?.message}
                                        fullWidth
                                    />
                                )}
                            />
                            <Controller
                                name="firstName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ''}
                                        label="Prénom"
                                        error={Boolean(errors.firstName)}
                                        helperText={errors.firstName?.message}
                                        fullWidth
                                    />
                                )}
                            />
                        </Stack>
                        <Controller
                            name="roles"
                            control={control}
                            render={({ field }) => (
                                <RoleMultiSelect
                                    value={field.value ?? []}
                                    onChange={field.onChange}
                                    label="Rôles"
                                    required
                                    error={Boolean(errors.roles)}
                                    helperText={errors.roles?.message ?? 'Un membre peut cumuler plusieurs rôles.'}
                                />
                            )}
                        />
                        <Stack direction="row" spacing={2}>
                            <Controller
                                name="laboratoire"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} value={field.value ?? ''} label="Laboratoire" fullWidth />
                                )}
                            />
                            <Controller
                                name="service"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} value={field.value ?? ''} label="Service" fullWidth />
                                )}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <Controller
                                name="numero"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} value={field.value ?? ''} label="Numéro" fullWidth />
                                )}
                            />
                            <Controller
                                name="bureau"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} value={field.value ?? ''} label="Bureau" fullWidth />
                                )}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 3 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export const EditUserModal = memo(EditUserModalComponent);
