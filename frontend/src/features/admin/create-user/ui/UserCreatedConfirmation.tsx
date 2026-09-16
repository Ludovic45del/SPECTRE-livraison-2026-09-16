/**
 * UserCreatedConfirmation - Confirmation dialog after user creation
 * Affiche le mot de passe temporaire (renvoyé une seule fois) à communiquer
 * au nouvel utilisateur, qui devra le changer à sa première connexion.
 * @module features/admin/create-user
 */

import { memo, useCallback } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Divider,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { type UserCreated } from '@entities/user';
import { copyToClipboard, useNotificationStore } from '@shared/lib';

interface UserCreatedConfirmationProps {
    open: boolean;
    user: UserCreated;
    onClose: () => void;
}

function UserCreatedConfirmationComponent({ open, user, onClose }: UserCreatedConfirmationProps) {
    const showNotification = useNotificationStore((s) => s.showNotification);

    const handleCopyPassword = useCallback(async () => {
        if (!user.generatedPassword) return;
        // copyToClipboard gère le repli execCommand hors contexte sécurisé (http
        // réseau fermé, où navigator.clipboard est indisponible) et ne throw jamais.
        const ok = await copyToClipboard(user.generatedPassword);
        if (ok) {
            showNotification('Mot de passe copié dans le presse-papier', 'info');
        } else {
            showNotification('Impossible de copier — sélectionnez le mot de passe manuellement', 'error');
        }
    }, [user, showNotification]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
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
                    Utilisateur créé
                </Typography>
                <IconButton onClick={onClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                    <Alert severity="warning">
                        Communiquez ce mot de passe temporaire <strong>hors-bande</strong> (mail interne, SMS, chat). Il
                        ne sera <strong>plus jamais affiché</strong> : copiez-le avant de fermer cette fenêtre.
                    </Alert>
                    <TextField
                        label="Matricule"
                        value={user.username}
                        slotProps={{ input: { readOnly: true } }}
                        fullWidth
                    />
                    <TextField
                        label="Mot de passe temporaire"
                        value={user.generatedPassword}
                        slotProps={{
                            input: {
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleCopyPassword} size="small" title="Copier">
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        fullWidth
                    />
                    <Typography variant="body2" color="text.secondary">
                        L&apos;utilisateur se connecte avec ce mot de passe et devra le modifier lors de sa première
                        connexion.
                    </Typography>
                </Stack>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} variant="contained" size="small">
                    Fermer
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export const UserCreatedConfirmation = memo(UserCreatedConfirmationComponent);
