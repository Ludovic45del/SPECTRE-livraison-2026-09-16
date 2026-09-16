/**
 * Change Password Page - Formulaire de changement de mot de passe
 * @module pages/change-password
 *
 * Utilisee pour :
 * - Le changement force (premiere connexion / reset admin)
 * - Le changement volontaire depuis le profil
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ChangePasswordFormSchema, type ChangePasswordForm, useChangePassword } from '@entities/user';
import { useAuthStore } from '@features/auth';
import { getErrorMessage, useNotificationStore } from '@shared/lib';

function ChangePasswordPageComponent() {
    const navigate = useNavigate();
    const changeMutation = useChangePassword();
    const showNotification = useNotificationStore((s) => s.showNotification);
    const forcePasswordChange = useAuthStore((s) => s.forcePasswordChange);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ChangePasswordForm>({
        resolver: zodResolver(ChangePasswordFormSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = useCallback(
        async (data: ChangePasswordForm) => {
            try {
                await changeMutation.mutateAsync({
                    current_password: data.currentPassword,
                    new_password: data.newPassword,
                });
                // Mettre a jour le flag dans le store
                useAuthStore.setState({ forcePasswordChange: false });
                showNotification('Mot de passe modifié avec succès', 'success');
                navigate('/');
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors du changement de mot de passe'), 'error');
            }
        },
        [changeMutation, showNotification, navigate],
    );

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: forcePasswordChange ? 'center' : 'flex-start',
                minHeight: forcePasswordChange ? '100vh' : 'auto',
                pt: forcePasswordChange ? 0 : 6,
                px: 2,
            }}
        >
            <Paper sx={{ maxWidth: 480, width: '100%', p: 4 }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    Changer votre mot de passe
                </Typography>

                {forcePasswordChange && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Vous devez changer votre mot de passe temporaire avant de pouvoir accéder à l&apos;application.
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={2.5}>
                        <Controller
                            name="currentPassword"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Mot de passe actuel"
                                    type="password"
                                    required
                                    error={Boolean(errors.currentPassword)}
                                    helperText={errors.currentPassword?.message}
                                    fullWidth
                                    autoFocus
                                />
                            )}
                        />
                        <Controller
                            name="newPassword"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nouveau mot de passe"
                                    type="password"
                                    required
                                    error={Boolean(errors.newPassword)}
                                    helperText={errors.newPassword?.message ?? 'Minimum 8 caractères'}
                                    fullWidth
                                />
                            )}
                        />
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Confirmer le nouveau mot de passe"
                                    type="password"
                                    required
                                    error={Boolean(errors.confirmPassword)}
                                    helperText={errors.confirmPassword?.message}
                                    fullWidth
                                />
                            )}
                        />
                        <Button type="submit" variant="contained" size="large" disabled={changeMutation.isPending}>
                            {changeMutation.isPending ? 'Modification...' : 'Modifier le mot de passe'}
                        </Button>
                        {!forcePasswordChange && (
                            <Button color="inherit" onClick={() => navigate(-1)}>
                                Annuler
                            </Button>
                        )}
                    </Stack>
                </form>
            </Paper>
        </Box>
    );
}

const ChangePasswordPage = memo(ChangePasswordPageComponent);
export default ChangePasswordPage;
