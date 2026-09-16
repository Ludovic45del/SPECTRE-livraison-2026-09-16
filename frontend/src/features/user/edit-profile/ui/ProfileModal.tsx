/**
 * ProfileModal - Modale d'affichage et de modification du profil utilisateur courant.
 * @module features/user/edit-profile
 *
 * Self-service : matricule et rôle sont en lecture seule (gérés par l'admin).
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

import {
    SelfProfileUpdateFormSchema,
    type SelfProfileUpdateForm,
    formatRoles,
    type User,
    useUpdateMe,
} from '@entities/user';
import { useModalSubmit } from '@shared/lib';
import { AvatarEditor } from './AvatarEditor';
import { SignatureEditor } from './SignatureEditor';

interface ProfileModalProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
}

function ProfileModalComponent({ user, open, onClose }: ProfileModalProps) {
    const updateMutation = useUpdateMe();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<SelfProfileUpdateForm>({
        resolver: zodResolver(SelfProfileUpdateFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
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

    const submitUpdate = useModalSubmit((data: SelfProfileUpdateForm) => updateMutation.mutateAsync(data), {
        successMessage: 'Profil mis à jour',
        errorMessage: 'Erreur lors de la mise à jour du profil',
        onSuccess: handleClose,
    });

    const onSubmit = useCallback(
        async (data: SelfProfileUpdateForm) => {
            await submitUpdate(data);
        },
        [submitUpdate],
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
                    Mon profil
                </Typography>
                <IconButton onClick={handleClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* Photo de profil — upload immédiat, indépendant du formulaire texte. */}
                        <AvatarEditor user={user} />
                        <Divider />
                        {/* Signature — upload immédiat ; sert à signer la fiche de livraison. */}
                        <SignatureEditor user={user} />
                        <Divider />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Matricule"
                                value={user?.username ?? ''}
                                disabled
                                fullWidth
                                helperText="Géré par l'administrateur"
                            />
                            <TextField
                                label="Rôle"
                                value={user ? formatRoles(user.roles) : ''}
                                disabled
                                fullWidth
                                helperText="Géré par l'administrateur"
                            />
                        </Stack>
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
                    <Button
                        type="submit"
                        variant="contained"
                        size="small"
                        disabled={updateMutation.isPending || !isDirty}
                    >
                        {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export const ProfileModal = memo(ProfileModalComponent);
