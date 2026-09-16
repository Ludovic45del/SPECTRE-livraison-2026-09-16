/**
 * Login Page
 * @module pages/login
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Container, TextField, Typography, Alert, Paper, CircularProgress } from '@mui/material';
import { keyframes } from '@emotion/react';
import { useAuthStore } from '@features/auth';
import { LoginSuccessAnimation, motionEasing } from '@shared/ui';
import CEALogo from '@shared/assets/images/CEALogo.png';

/** Brand color matching sidebar SPECTRE title */
const BRAND_COLOR = '#E31837';

/**
 * Sortie de la carte de connexion : elle glisse vers la gauche en s'effaçant
 * (translation + léger rétrécissement), pendant que l'écran d'accueil se fond
 * par-dessus. Un seul mouvement continu, sans temps mort. GPU only
 * (transform + opacity, pas de filter sur un grand élément).
 */
const cardExit = keyframes`
    from { opacity: 1; transform: translateX(0) scale(1); }
    to   { opacity: 0; transform: translateX(-80px) scale(0.98); }
`;
/** Durée de la sortie de la carte = durée du fondu d'entrée de l'écran d'accueil. */
const CARD_EXIT_MS = 560;
/** L'écran d'accueil commence sa chorégraphie pendant que la carte s'en va encore. */
const WELCOME_ENTER_DELAY_MS = 240;

export default function LoginPage() {
    const login = useAuthStore((s) => s.login);
    const commitLogin = useAuthStore((s) => s.commitLogin);
    const discardPendingAuth = useAuthStore((s) => s.discardPendingAuth);
    const pendingAuth = useAuthStore((s) => s.pendingAuth);
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    // 'idle' : formulaire affiche.
    // 'celebrating' : login OK, la carte glisse vers la gauche pendant que
    //   l'ecran d'accueil se fond par-dessus ; redirige a la fin via commitLogin().
    const [phase, setPhase] = useState<'idle' | 'celebrating'>('idle');
    const isCelebrating = phase === 'celebrating';
    const isBusy = isLoading || isCelebrating;

    const handleUsernameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
        [],
    );

    const handlePasswordChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
        [],
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const ok = await login(username, password);
            if (!ok) return;
            // Lecture immediate du pendingAuth fraichement set par login().
            const fresh = useAuthStore.getState().pendingAuth;
            // Skip de l'animation si l'utilisateur doit changer son mot de passe :
            // un "Bienvenue" suivi d'une page de friction serait contradictoire.
            if (fresh?.forcePasswordChange) {
                commitLogin();
                return;
            }
            setPhase('celebrating');
        },
        [login, commitLogin, username, password],
    );

    // Cleanup : si l'utilisateur quitte la page de login (back, navigation manuelle)
    // alors qu'un pendingAuth existe, on l'annule pour eviter un etat orphelin.
    useEffect(() => {
        return () => {
            if (useAuthStore.getState().pendingAuth) {
                discardPendingAuth();
            }
        };
    }, [discardPendingAuth]);

    return (
        <>
            <Container maxWidth="sm">
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            width: '100%',
                            ...(isCelebrating && {
                                pointerEvents: 'none',
                                willChange: 'transform, opacity',
                                animation: `${cardExit} ${CARD_EXIT_MS}ms ${motionEasing.apple} both`,
                                '@media (prefers-reduced-motion: reduce)': {
                                    animation: 'none',
                                    opacity: 0,
                                },
                            }),
                        }}
                    >
                        {/* Logos */}
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

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Matricule"
                                value={username}
                                onChange={handleUsernameChange}
                                margin="normal"
                                required
                                autoFocus
                                disabled={isBusy}
                            />
                            <TextField
                                fullWidth
                                label="Mot de passe"
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                margin="normal"
                                required
                                disabled={isBusy}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                sx={{ mt: 3 }}
                                disabled={isBusy || !username || !password}
                            >
                                {isLoading ? <CircularProgress size={24} /> : 'Se connecter'}
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            </Container>
            {phase === 'celebrating' && pendingAuth && (
                <LoginSuccessAnimation
                    firstName={pendingAuth.firstName ?? undefined}
                    accentColor={BRAND_COLOR}
                    backdropDurationMs={CARD_EXIT_MS}
                    enterDelayMs={WELCOME_ENTER_DELAY_MS}
                    onComplete={commitLogin}
                />
            )}
        </>
    );
}
