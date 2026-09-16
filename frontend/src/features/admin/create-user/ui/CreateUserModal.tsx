/** CreateUserModal - Modal de creation d'un utilisateur */
import { memo, useCallback, useState } from 'react';
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

import {
    UserCreateFormSchema,
    type UserCreateForm,
    RoleMultiSelect,
    useCreateUser,
    type UserCreated,
} from '@entities/user';
import { useModalSubmit } from '@shared/lib';

import { useCreateUserStore } from '../model';
import { UserCreatedConfirmation } from './UserCreatedConfirmation';

function CreateUserModalComponent() {
    const { isOpen, close } = useCreateUserStore();
    const createMutation = useCreateUser();
    const [createdUser, setCreatedUser] = useState<UserCreated | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UserCreateForm>({
        resolver: zodResolver(UserCreateFormSchema),
        defaultValues: {
            username: '',
            firstName: '',
            lastName: '',
            roles: [],
            laboratoire: '',
            service: '',
            numero: '',
            bureau: '',
            password: undefined,
        },
    });

    const handleClose = useCallback(() => {
        reset();
        setCreatedUser(null);
        close();
    }, [reset, close]);

    const onSubmit = useModalSubmit(createMutation.mutateAsync, {
        successMessage: (result: UserCreated) => `Utilisateur ${result.username} créé avec succès`,
        errorMessage: 'Erreur lors de la création',
        onSuccess: setCreatedUser,
    });

    if (createdUser) {
        return <UserCreatedConfirmation open={isOpen} user={createdUser} onClose={handleClose} />;
    }

    return (
        <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
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
                    Nouvel utilisateur
                </Typography>
                <IconButton onClick={handleClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <Controller
                            name="username"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Matricule"
                                    required
                                    error={Boolean(errors.username)}
                                    helperText={errors.username?.message}
                                    fullWidth
                                    autoFocus
                                />
                            )}
                        />
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
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Mot de passe (optionnel)"
                                    type="password"
                                    error={Boolean(errors.password)}
                                    helperText={
                                        errors.password?.message ??
                                        'Laissez vide pour générer un mot de passe aléatoire'
                                    }
                                    fullWidth
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 3 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Création...' : 'Créer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
export const CreateUserModal = memo(CreateUserModalComponent);
