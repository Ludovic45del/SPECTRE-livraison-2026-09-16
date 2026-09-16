/**
 * Delete Confirmation Dialog for FA
 * @module features/fa/fa-header
 *
 * Confirmation dialog before deleting a Fiche d'Anomalie
 */

import { memo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

// ============================================================================
// Types
// ============================================================================

interface DeleteConfirmDialogProps {
    open: boolean;
    identifier: string;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
    open,
    identifier,
    isPending,
    onClose,
    onConfirm,
}: DeleteConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
        >
            <DialogTitle id="delete-dialog-title">Supprimer la Fiche d'Anomalie</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">
                    Êtes-vous sûr de vouloir supprimer la FA <strong>{identifier}</strong> ? La fiche et ses photos
                    seront définitivement supprimées.
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
});
