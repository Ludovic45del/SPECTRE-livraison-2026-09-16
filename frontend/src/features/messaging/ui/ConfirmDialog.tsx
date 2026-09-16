/**
 * ConfirmDialog — confirmation simple (titre, texte, Annuler / action destructive).
 * @module features/messaging/ui
 *
 * Extrait du fil (M2) pour être partagé entre la suppression / le départ d'un
 * groupe et la suppression d'un message (M4).
 */

import { memo } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider } from '@mui/material';

export interface ConfirmDialogProps {
    readonly open: boolean;
    readonly title: string;
    readonly text: string;
    readonly confirmLabel: string;
    readonly ariaLabel: string;
    readonly onCancel: () => void;
    readonly onConfirm: () => void;
}

export const ConfirmDialog = memo(function ConfirmDialog({
    open,
    title,
    text,
    confirmLabel,
    ariaLabel,
    onCancel,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
            aria-label={ariaLabel}
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{text}</DialogContentText>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={onCancel} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                    Annuler
                </Button>
                <Button onClick={onConfirm} variant="contained" color="error" size="small">
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
});
