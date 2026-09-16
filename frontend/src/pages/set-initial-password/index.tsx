/**
 * Set Initial Password Page - Consomme un lien d'activation signé.
 * Utilisée après création d'un compte ou reset admin : l'utilisateur arrive
 * via une URL contenant un jeton, définit son mot de passe, puis est redirigé
 * vers la page de login.
 * @module pages/set-initial-password
 */

import { memo, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { SetInitialPasswordFormSchema, type SetInitialPasswordForm, useSetInitialPassword } from '@entities/user';
import { getErrorMessage, useNotificationStore } from '@shared/lib';
import CEALogo from '@shared/assets/images/CEALogo.png';

const BRAND_COLOR = '#E31837';

function SetInitialPasswordPageComponent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

    const mutation = useSetInitialPassword();
    const showNotification = useNotificationStore((s) => s.showNotification);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SetInitialPasswordForm>({
        resolver: zodResolver(SetInitialPasswordFormSchema),
        defaultValues: { newPassword: '', confirmPassword: '' },
    });

    const onSubmit = useCallback(
        async (data: SetInitialPasswordForm) => {
            try {
                await mutation.mutateAsync({ token, new_password: data.newPassword });
                showNotification('Mot de passe défini avec succès', 'success');
                navigate('/login');
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, "Erreur lors de l'activation"), 'error');
            }
        },
        [mutation, token, navigate, showNotification],
    );

    if (!token) {
        return (
            <Container maxWidth="sm">
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
                        <Alert severity="error">
                            Lien d&apos;activation invalide. Demandez un nouveau lien à votre administrateur.
                        </Alert>
                        <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => navigate('/login')}>
                            Retour à la connexion
                        </Button>
                    </Paper>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            mb: 3,
                        }}
                    >
                        <Box
                            component="img"
                            src={CEALogo}
                            alt="CEA"
                            sx={{ width: 64, height: 'auto', borderRadius: 1 }}
                        />
                        <Typography
                            variant="h4"
                            component="span"
                            sx={{
                                fontWeight: 800,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                color: BRAND_COLOR,
                                lineHeight: 1,
                            }}
                        >
                            Spectre
                        </Typography>
                    </Box>

                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                        Définir votre mot de passe
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Vous utilisez un lien d&apos;activation à usage unique. Choisissez un mot de passe que vous
                        utiliserez pour vous connecter.
                    </Alert>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Stack spacing={2.5}>
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
                                        autoFocus
                                    />
                                )}
                            />
                            <Controller
                                name="confirmPassword"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Confirmer le mot de passe"
                                        type="password"
                                        required
                                        error={Boolean(errors.confirmPassword)}
                                        helperText={errors.confirmPassword?.message}
                                        fullWidth
                                    />
                                )}
                            />
                            <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Activation...' : 'Définir le mot de passe'}
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
}

const SetInitialPasswordPage = memo(SetInitialPasswordPageComponent);
export default SetInitialPasswordPage;
