/**
 * ResetPasswordDialog - Dialog de reinitialisation du mot de passe
 * Génère un mot de passe temporaire (affiché une seule fois) que l'admin
 * communique à l'utilisateur ; changement obligatoire à la première connexion.
 * @module features/admin/reset-password
 */

import { memo, useCallback, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { type PasswordResetResponse, type User, useResetPassword } from '@entities/user';
import { copyToClipboard, useModalSubmit, useNotificationStore } from '@shared/lib';

interface ResetPasswordDialogProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
}

function ResetPasswordDialogComponent({ user, open, onClose }: ResetPasswordDialogProps) {
    const resetMutation = useResetPassword();
    const showNotification = useNotificationStore((s) => s.showNotification);
    const [result, setResult] = useState<PasswordResetResponse | null>(null);

    const handleClose = useCallback(() => {
        setResult(null);
        onClose();
    }, [onClose]);

    const submitReset = useModalSubmit((uuid: string) => resetMutation.mutateAsync(uuid), {
        successMessage: `Mot de passe de ${user?.username} réinitialisé`,
        errorMessage: 'Erreur lors de la réinitialisation',
        onSuccess: (r) => setResult(r),
    });

    const handleReset = useCallback(async () => {
        if (!user) return;
        await submitReset(user.uuid);
    }, [user, submitReset]);

    const handleCopy = useCallback(async () => {
        if (!result?.generatedPassword) return;
        // copyToClipboard gère le repli execCommand hors contexte sécurisé (http
        // réseau fermé, où navigator.clipboard est indisponible) et ne throw jamais.
        const ok = await copyToClipboard(result.generatedPassword);
        if (ok) {
            showNotification('Mot de passe copié dans le presse-papier', 'info');
        } else {
            showNotification('Impossible de copier — sélectionnez le mot de passe manuellement', 'error');
        }
    }, [result, showNotification]);

    if (result) {
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
                        Mot de passe réinitialisé
                    </Typography>
                    <IconButton onClick={handleClose} size="small" aria-label="Fermer">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                        <Alert severity="warning">
                            Communiquez ce mot de passe temporaire <strong>hors-bande</strong> à {user?.username}. Il ne
                            sera <strong>plus jamais affiché</strong> : copiez-le avant de fermer cette fenêtre.
                        </Alert>
                        <TextField
                            label="Mot de passe temporaire"
                            value={result.generatedPassword}
                            slotProps={{
                                input: {
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleCopy} size="small" title="Copier">
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                            fullWidth
                        />
                        <Typography variant="body2" color="text.secondary">
                            L&apos;ancien mot de passe est d&apos;ores et déjà invalidé. L&apos;utilisateur se connecte
                            avec ce mot de passe temporaire et devra le modifier lors de sa première connexion.
                        </Typography>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose} variant="contained" size="small">
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
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
                    Réinitialiser le mot de passe
                </Typography>
                <IconButton onClick={handleClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent sx={{ p: 3 }}>
                <DialogContentText>
                    Réinitialiser le mot de passe de <strong>{user?.username}</strong> ? Un mot de passe temporaire sera
                    généré et l&apos;ancien sera immédiatement invalidé. L&apos;utilisateur devra le modifier lors de sa
                    première connexion.
                </DialogContentText>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 3 }}>
                <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                    Annuler
                </Button>
                <Button
                    onClick={handleReset}
                    variant="contained"
                    color="warning"
                    size="small"
                    disabled={resetMutation.isPending}
                >
                    {resetMutation.isPending ? 'Réinitialisation...' : 'Réinitialiser'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export const ResetPasswordDialog = memo(ResetPasswordDialogComponent);
