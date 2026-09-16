/**
 * DeleteConfirmDialog sub-component
 * Confirmation dialog for embase deletion.
 */

import { memo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    identifier: string;
    isPending: boolean;
}

function DeleteConfirmDialogComponent({ open, onClose, onConfirm, identifier, isPending }: DeleteConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
        >
            <DialogTitle id="delete-dialog-title">Supprimer l'embase</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">
                    Etes-vous sur de vouloir supprimer l'embase <strong>{identifier}</strong> ? Cette action est
                    irreversible.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} color="inherit">
                    Annuler
                </Button>
                <Button onClick={onConfirm} variant="contained" color="error" disabled={isPending}>
                    {isPending ? 'Suppression...' : 'Supprimer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export const DeleteConfirmDialog = memo(DeleteConfirmDialogComponent);
