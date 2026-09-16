/**
 * ToggleUserDialog - Dialog d'activation/desactivation de compte
 * @module features/admin/toggle-user
 */

import { memo, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    Divider,
    IconButton,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { type User, useToggleUserActive } from '@entities/user';
import { useModalSubmit } from '@shared/lib';

interface ToggleUserDialogProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
}

function ToggleUserDialogComponent({ user, open, onClose }: ToggleUserDialogProps) {
    const toggleMutation = useToggleUserActive();

    const submitToggle = useModalSubmit((uuid: string) => toggleMutation.mutateAsync(uuid), {
        successMessage: (result) => {
            const label = result.isActive ? 'réactivé' : 'désactivé';
            return `Compte ${user?.username} ${label}`;
        },
        errorMessage: 'Erreur lors de la modification du statut',
        onSuccess: () => onClose(),
    });

    const handleToggle = useCallback(async () => {
        if (!user) return;
        await submitToggle(user.uuid);
    }, [user, submitToggle]);

    const isActivating = user && !user.isActive;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
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
                    {isActivating ? 'Réactiver le compte' : 'Désactiver le compte'}
                </Typography>
                <IconButton onClick={onClose} size="small" aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>
            <DialogContent sx={{ p: 3 }}>
                <DialogContentText>
                    {isActivating
                        ? `Réactiver le compte de ${user?.username} ? L'utilisateur pourra à nouveau se connecter.`
                        : `Désactiver le compte de ${user?.username} ? L'utilisateur ne pourra plus se connecter. Ses données seront conservées.`}
                </DialogContentText>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 3 }}>
                <Button type="button" onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                    Annuler
                </Button>
                <Button
                    onClick={handleToggle}
                    variant="contained"
                    size="small"
                    color={isActivating ? 'success' : 'error'}
                    disabled={toggleMutation.isPending}
                >
                    {toggleMutation.isPending ? 'En cours...' : isActivating ? 'Réactiver' : 'Désactiver'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export const ToggleUserDialog = memo(ToggleUserDialogComponent);
